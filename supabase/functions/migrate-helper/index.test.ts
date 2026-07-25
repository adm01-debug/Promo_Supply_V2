// Testes de integração para a edge function `migrate-helper`.
//
// Requer variáveis:
//   VITE_SUPABASE_URL              — URL do projeto (do .env raiz, auto-loaded)
//   VITE_SUPABASE_PUBLISHABLE_KEY  — anon key (do .env raiz)
//   MIGRATE_HELPER_ACCESS_KEY      — mesma secret configurada no projeto
//
// Rode com:
//   MIGRATE_HELPER_ACCESS_KEY=... deno test --allow-net --allow-env \
//     supabase/functions/migrate-helper/index.test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ACCESS_KEY = Deno.env.get("MIGRATE_HELPER_ACCESS_KEY") ?? "";
const FN = `${SUPABASE_URL}/functions/v1/migrate-helper`;

async function call(action: string, headers: Record<string, string>) {
  const res = await fetch(`${FN}?action=${action}`, { method: "GET", headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const skipIfNoKey = { ignore: ACCESS_KEY.length === 0 };

Deno.test("sem x-access-key e sem Authorization → 401 da função (verify_jwt=false)", async () => {
  const { status, body } = await call("ping", {});
  assertEquals(status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("apenas anon JWT (sem x-access-key) → 401 da função", async () => {
  const { status, body } = await call("ping", {
    Authorization: `Bearer ${ANON}`,
    apikey: ANON,
  });
  assertEquals(status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("x-access-key inválida → 401", async () => {
  const { status, body } = await call("ping", { "x-access-key": "invalid-key" });
  assertEquals(status, 401);
  assertEquals(body.error, "unauthorized");
});

Deno.test("x-access-key válida → 200 e NÃO expõe credenciais", { ...skipIfNoKey }, async () => {
  const { status, body } = await call("ping", { "x-access-key": ACCESS_KEY });
  assertEquals(status, 200);
  assertEquals(body.ok, true);
  assert(typeof body.project_ref === "string" && body.project_ref.length > 0);
  // Regressão de segurança: garantir que nunca voltamos a expor credenciais.
  assertEquals(body.service_role, undefined);
  assertEquals(body.db_url, undefined);
  assertEquals(body.url, undefined);
});

Deno.test("action=credentials foi removida → 400 unknown_action", { ...skipIfNoKey }, async () => {
  const { status, body } = await call("credentials", { "x-access-key": ACCESS_KEY });
  assertEquals(status, 400);
  assertEquals(body.error, "unknown_action");
});

Deno.test("action=healthcheck executa como service_role sem vazar credenciais", { ...skipIfNoKey }, async () => {
  const { status, body } = await call("healthcheck", { "x-access-key": ACCESS_KEY });
  assertEquals(status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.service_role, undefined);
});

Deno.test("action desconhecida → 400", { ...skipIfNoKey }, async () => {
  const { status, body } = await call("bogus", { "x-access-key": ACCESS_KEY });
  assertEquals(status, 400);
  assertEquals(body.error, "unknown_action");
});

Deno.test("OPTIONS preflight → 200 sem exigir auth", async () => {
  const res = await fetch(FN, { method: "OPTIONS" });
  await res.body?.cancel();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});
