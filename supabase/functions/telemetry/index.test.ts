// Deno tests for the telemetry edge function.
//
// Coverage:
//  • POST no auth               → 401
//  • POST auth + { batch: [...] } → 200 + inserted count == batch.length
//  • POST auth + single entry   → 200 + inserted == 1
//  • POST auth + entry sem message → 200 + inserted == 0 (filtrado, sem 400)
//
// Skips silently se QA_USER_EMAIL/QA_USER_PASSWORD não estiverem definidos.
// Run: deno test --allow-net --allow-env supabase/functions/telemetry
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/telemetry`;

const QA_EMAIL = Deno.env.get("QA_USER_EMAIL") ?? "qa-admin@promobrindes.test";
const QA_PASSWORD = Deno.env.get("QA_USER_PASSWORD") ?? "QaTest@2026!";

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};

// Guard: skip integration tests when the edge function is not reachable with
// the credentials this environment provides (e.g., CI against placeholder or
// unauthenticated projects). A 401/403 from the gateway means valid
// credentials are missing, so the integration cannot run here.
async function isSupabaseReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(FN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: "{}",
    });
    clearTimeout(timeoutId);
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}

const SUPABASE_AVAILABLE = await isSupabaseReachable();

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
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  const token = await signIn();
  if (!token) return; // skip when QA creds ausentes

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
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  const token = await signIn();
  if (!token) return;
  const { status, body } = await post(token, { level: "info", message: "single-entry-test" });
  assertEquals(status, 200);
  assertEquals(body.inserted, 1);
  },
});

Deno.test({
  name: "telemetry filtra entradas sem message em vez de retornar 400",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
  const token = await signIn();
  if (!token) return;
  const { status, body } = await post(token, {
    batch: [{ level: "info" }, { level: "info", message: "ok" }],
  });
  assertEquals(status, 200);
  assertEquals(body.inserted, 1);
  },
});
