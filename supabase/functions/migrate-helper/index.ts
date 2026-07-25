// Edge function de manutenção/migração.
// Segurança:
//  - Autoriza via MIGRATE_HELPER_ACCESS_KEY (secret) com comparação timing-safe.
//  - NUNCA expõe SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL ou qualquer credencial via HTTP.
//  - Operações privilegiadas usam service_role SOMENTE server-side, sem depender de JWT do usuário.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-access-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Comparação em tempo constante para evitar timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const av = enc.encode(a);
  const bv = enc.encode(b);
  if (av.length !== bv.length) return false;
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}

/** Extrai apenas o project_ref do SUPABASE_URL, sem vazar a URL completa. */
function projectRef(): string | null {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

/** Cria client service_role. Fica encapsulado — a chave nunca sai desta função. */
function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("service_role_unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const expected = Deno.env.get("MIGRATE_HELPER_ACCESS_KEY");
  if (!expected) return json({ error: "server_misconfigured" }, 500);

  const provided = req.headers.get("x-access-key") ?? "";
  if (!timingSafeEqual(provided, expected)) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "ping";

  try {
    if (action === "ping") {
      // Retorna apenas metadados não sensíveis.
      return json({
        ok: true,
        project_ref: projectRef(),
        service_role_available: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      });
    }

    if (action === "healthcheck") {
      // Exemplo de operação privilegiada: valida que o service_role client conecta,
      // sem retornar qualquer credencial ao chamador.
      const supabase = serviceClient();
      const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    // NOTE: A action "credentials" foi REMOVIDA intencionalmente — expor
    // SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL via HTTP é um vazamento
    // crítico de credenciais. Operações privilegiadas devem ser executadas
    // aqui dentro usando serviceClient().

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
