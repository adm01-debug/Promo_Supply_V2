// Integration tests for migrate-helper edge function.
// Valida que a função executa com verify_jwt = false (não exige Authorization)
// e que a autorização é feita internamente via header x-access-key.
//
// Rode com:
//   deno test --allow-net --allow-env supabase/functions/migrate-helper/index.test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ACCESS_KEY = "a24a07e8cbcbb17cc67cc92d1c93f92b653a8ed88c8d2ce3";
const FN_URL = `${SUPABASE_URL}/functions/v1/migrate-helper?action=ping`;

async function call(headers: Record<string, string>) {
  const res = await fetch(FN_URL, { method: "GET", headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

Deno.test("migrate-helper: sem Authorization e sem x-access-key → 401 da função (não do gateway)", async () => {
  const { status, body } = await call({});
  // Gateway deixa passar (verify_jwt = false); função responde com seu próprio 401.
  assertEquals(status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("migrate-helper: com x-access-key válido → 200", async () => {
  const { status, body } = await call({ "x-access-key": ACCESS_KEY });
  assertEquals(status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.project_ref === "string" && body.project_ref.length > 0);
});

Deno.test("migrate-helper: com x-access-key errado → 401 da função", async () => {
  const { status, body } = await call({ "x-access-key": "invalid-key" });
  assertEquals(status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("migrate-helper: apenas Authorization (anon JWT) sem x-access-key → 401 da função", async () => {
  // Confirma que JWT válido NÃO substitui o x-access-key — a auth é 100% interna.
  const { status, body } = await call({ Authorization: `Bearer ${ANON}`, apikey: ANON });
  assertEquals(status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("migrate-helper: OPTIONS (preflight CORS) → 200 sem exigir auth", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.body?.cancel();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});

Deno.test("migrate-helper: action desconhecida com x-access-key → 400", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/migrate-helper?action=bogus`, {
    method: "GET",
    headers: { "x-access-key": ACCESS_KEY },
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "unknown_action");
});
