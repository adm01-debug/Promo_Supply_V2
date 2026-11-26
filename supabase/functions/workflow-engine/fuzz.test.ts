
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PayloadFuzzer } from "../_shared/fuzzer.ts";
import { WorkflowContract } from "../_shared/contracts.ts";

await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/workflow-engine`;

// A funcao exige JWT de usuario: medido em 2026-11-25, POST com Bearer da chave publica
// responde 401. Sem QA_USER_EMAIL/QA_USER_PASSWORD (secret ainda nao cadastrado) o teste
// que precisa de usuario autenticado avisa com ::warning:: e e' pulado; com a credencial
// presente, login que falha REPROVA o teste em vez de pular em silencio.
const QA_EMAIL = Deno.env.get("QA_USER_EMAIL") ?? "";
const QA_PASSWORD = Deno.env.get("QA_USER_PASSWORD") ?? "";
const HAS_QA_CREDS = QA_EMAIL !== "" && QA_PASSWORD !== "";

async function signIn(): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) return null;
  return body.access_token as string;
}

// Guard: disponibilidade medida por OPTIONS (preflight de CORS), que nao passa pela
// verificacao de JWT. Medido neste projeto em 2026-11-25: OPTIONS /functions/v1/workflow-engine
// -> 200, POST sem Authorization -> 401 e POST com Bearer da chave publica -> 401. Usar o
// 401 do POST como "ambiente indisponivel" invertia o criterio: a funcao exigir JWT, que e'
// o comportamento correto, era o proprio sinal de que os testes deveriam ser pulados.
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
  console.log("::warning::workflow-engine: edge nao responde ao OPTIONS -- testes de integracao pulados");
}
if (!HAS_QA_CREDS) {
  console.log("::warning::workflow-engine: QA_USER_EMAIL/QA_USER_PASSWORD ausentes -- fuzzing autenticado pulado");
}

// M-02: header legado x-tenant-id removido. Tenant é resolvido via JWT (user_tenants).
// O Authorization entra por requisicao, com o JWT do usuario de QA: a chave publica nao
// autentica usuario nenhum (medido em 2026-11-25: POST com ela -> 401), entao nao pode
// ficar no header fixo.
const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};

Deno.test({
  name: "Fuzzing: Workflow Engine rejects malformed payloads",
  ignore: (!SUPABASE_AVAILABLE || !HAS_QA_CREDS),
  async fn() {
  const token = await signIn();
  // O ignore: deste teste ja' garantiu HAS_QA_CREDS: credencial presente e login falhando
  // e' ambiente degradado (ou credencial invalida) -- falhar, nao pular.
  assert(token, "QA_USER_EMAIL/QA_USER_PASSWORD definidos, mas o login falhou");
  const validBase = {
    action: "start_workflow",
    template_id: "00000000-0000-0000-0000-000000000001",
    entity_type: "pedido",
    entity_id: "00000000-0000-0000-0000-000000000002"
  };


  // @ts-ignore
  const mutations = PayloadFuzzer.generateMutations(WorkflowContract, validBase);

  for (const mutation of mutations) {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
      body: JSON.stringify(mutation.payload),
    });

    const body = await res.json();
    
    // Devem falhar com 400 (Validation Error)
    assertEquals(res.status, 400, `Mutation ${mutation.type} should fail with 400`);
    assert(body.error.startsWith("Validation error"), `Error message for ${mutation.type} should be validation error`);
    assertEquals(body.status, "error");
    assert(body.requestId !== undefined);
  }
  },
});

Deno.test({
  name: "Security: Workflow Engine rejects unauthenticated requests",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  // M-02: sem JWT válido, o tenant não pode ser resolvido → 401.
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      // Missing Authorization
    },
    body: JSON.stringify({
      action: "start_workflow",
      template_id: crypto.randomUUID(),
      entity_type: "pedido",
      entity_id: crypto.randomUUID()
    }),
  });

  const body = await res.json().catch(() => ({}));
  assert(
    [400, 401, 403].includes(res.status),
    `Should reject unauthenticated request (got ${res.status})`
  );
  assertEquals(body.status ?? "error", "error");
  },
});

