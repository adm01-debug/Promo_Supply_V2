// Deno tests for the telemetry edge function.
//
// Coverage:
//  • POST no auth               → 401
//  • POST auth + { batch: [...] } → 200 + inserted count == batch.length
//  • POST auth + single entry   → 200 + inserted == 1
//  • POST auth + entry sem message → 200 + inserted == 0 (filtrado, sem 400)
//
// Os testes autenticados exigem QA_USER_EMAIL/QA_USER_PASSWORD (secret do repositorio,
// nao cadastrado hoje): sem eles os testes avisam com ::warning:: e sao pulados; com eles,
// login que falha REPROVA o teste em vez de pular em silencio.
// Run: deno test --allow-net --allow-env supabase/functions/telemetry
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/telemetry`;

// Sem fallback literal: a credencial so entra por secret (QA_USER_EMAIL/QA_USER_PASSWORD).
// Sem as duas variaveis os testes autenticados sao pulados em vez de usarem uma conta fixa.
const QA_EMAIL = Deno.env.get("QA_USER_EMAIL") ?? "";
const QA_PASSWORD = Deno.env.get("QA_USER_PASSWORD") ?? "";
const HAS_QA_CREDS = QA_EMAIL !== "" && QA_PASSWORD !== "";

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};

// Guard: disponibilidade medida por OPTIONS (preflight de CORS), que nao passa pela
// verificacao de JWT. Medido neste projeto em 2026-11-25: OPTIONS /functions/v1/telemetry
// -> 200 e POST sem Authorization -> 401. Usar o 401 do POST como "ambiente indisponivel"
// invertia o criterio: quanto mais corretamente a funcao exige JWT, mais certo era que o
// teste que verifica essa exigencia ficasse pulado.
async function isSupabaseReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(FN_URL, {
      method: "OPTIONS",
      signal: controller.signal,
      headers: { apikey: SUPABASE_ANON_KEY, "Access-Control-Request-Method": "POST" },
    });
    clearTimeout(timeoutId);
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

const SUPABASE_AVAILABLE = await isSupabaseReachable();

if (!SUPABASE_AVAILABLE) {
  console.log("::warning::telemetry: edge nao responde ao OPTIONS -- testes de integracao pulados");
}
if (!HAS_QA_CREDS) {
  console.log("::warning::telemetry: QA_USER_EMAIL/QA_USER_PASSWORD ausentes -- testes autenticados pulados");
}

async function signIn(): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) return null;
  return body.access_token as string;
}

async function post(token: string | null, payload: unknown) {
  const headers: Record<string, string> = { ...baseHeaders };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(FN_URL, { method: "POST", headers, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

Deno.test({
  name: "telemetry rejects unauthenticated requests",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  const { status } = await post(null, { message: "hi", level: "info" });
  assertEquals(status, 401);
  },
});

Deno.test({
  name: "telemetry accepts { batch: [...] } from the frontend logger",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn();
  // O ignore: deste teste ja' garantiu HAS_QA_CREDS: credencial presente e login
  // falhando e' ambiente degradado (ou credencial invalida) -- falhar, nao pular.
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");

  const batch = [
    { level: "info", message: "test-batch-1", requestId: crypto.randomUUID() },
    { level: "warn", message: "test-batch-2", requestId: crypto.randomUUID() },
  ];
  const { status, body } = await post(token, { batch });
  assertEquals(status, 200);
  assertEquals(body.inserted, 2);
  },
});

Deno.test({
  name: "telemetry accepts single-entry payload",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn();
  // O ignore: deste teste ja' garantiu HAS_QA_CREDS: credencial presente e login
  // falhando e' ambiente degradado (ou credencial invalida) -- falhar, nao pular.
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");
  const { status, body } = await post(token, { level: "info", message: "single-entry-test" });
  assertEquals(status, 200);
  assertEquals(body.inserted, 1);
  },
});

Deno.test({
  name: "telemetry filtra entradas sem message em vez de retornar 400",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn();
  // O ignore: deste teste ja' garantiu HAS_QA_CREDS: credencial presente e login
  // falhando e' ambiente degradado (ou credencial invalida) -- falhar, nao pular.
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");
  const { status, body } = await post(token, {
    batch: [{ level: "info" }, { level: "info", message: "ok" }],
  });
  assertEquals(status, 200);
  assertEquals(body.inserted, 1);
  },
});
