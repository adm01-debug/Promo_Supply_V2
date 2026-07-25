// Edge function de manutenção/migração.
// Segurança:
//  - Autoriza via MIGRATE_HELPER_ACCESS_KEY (secret) com comparação timing-safe.
//  - NUNCA expõe SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL ou qualquer credencial via HTTP.
//  - Operações privilegiadas usam service_role SOMENTE server-side, sem depender de JWT do usuário.
// Observabilidade:
//  - Logs estruturados via EdgeLogger (persistidos em telemetry_logs para warn/error).
//  - Alertas em `system_alerts` (high/critical) para falhas inesperadas e auth suspeita.
import { createClient } from "npm:@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

const FUNCTION_NAME = "migrate-helper";
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

/** Best-effort: registra um alerta operacional. Nunca lança. */
async function raiseAlert(
  severity: "high" | "critical",
  message: string,
  metadata: Record<string, unknown>,
) {
  try {
    const admin = serviceClient();
    await admin.from("system_alerts").insert({
      severity,
      alert_type: FUNCTION_NAME,
      title: `[${FUNCTION_NAME}] ${message}`.slice(0, 200),
      message,
      metadata,
    });
  } catch {
    // system_alerts pode não existir ou service_role indisponível — não escalar.
  }
}

/** Extrai um client IP anonimizado (só para telemetria; nunca logamos a chave). */
function clientHint(req: Request): Record<string, unknown> {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent") ?? null;
  return { ip, ua };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const logger = new EdgeLogger(FUNCTION_NAME);
  const started = Date.now();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "ping";

  const expected = Deno.env.get("MIGRATE_HELPER_ACCESS_KEY");
  if (!expected) {
    // Falha crítica de configuração: sem secret configurada, a função fica aberta.
    logger.error("server_misconfigured: MIGRATE_HELPER_ACCESS_KEY ausente", {
      action,
      request_id: logger.getRequestId(),
    });
    await raiseAlert("critical", "migrate-helper sem MIGRATE_HELPER_ACCESS_KEY configurada", {
      action,
      request_id: logger.getRequestId(),
    });
    return json({ error: "server_misconfigured" }, 500);
  }

  const provided = req.headers.get("x-access-key") ?? "";
  if (!timingSafeEqual(provided, expected)) {
    // Log warn (persistido em telemetry_logs) + alerta high para tentativas de auth.
    const hint = clientHint(req);
    logger.warn("unauthorized_access_attempt", {
      action,
      key_provided: provided.length > 0,
      ...hint,
    });
    await raiseAlert("high", "Tentativa não autorizada em migrate-helper", {
      action,
      key_provided: provided.length > 0,
      request_id: logger.getRequestId(),
      ...hint,
    });
    return json({ error: "unauthorized" }, 401);
  }

  logger.info("request_start", { action, method: req.method });

  try {
    if (action === "ping") {
      const body = {
        ok: true,
        project_ref: projectRef(),
        service_role_available: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      };
      logger.info("request_ok", { action, duration_ms: Date.now() - started });
      return json(body);
    }

    if (action === "healthcheck") {
      const supabase = serviceClient();
      const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      if (error) {
        logger.error("healthcheck_query_failed", {
          action,
          pg_code: error.code,
          pg_message: error.message,
          duration_ms: Date.now() - started,
        });
        await raiseAlert("high", "migrate-helper healthcheck falhou ao consultar profiles", {
          action,
          pg_code: error.code,
          pg_message: error.message,
          request_id: logger.getRequestId(),
        });
        return json({ ok: false, error: error.message }, 500);
      }
      logger.info("request_ok", { action, duration_ms: Date.now() - started });
      return json({ ok: true });
    }

    // Action inválida — apenas warn, sem alerta (comportamento esperado do contrato).
    logger.warn("unknown_action", { action });
    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    logger.error("unexpected_error", {
      action,
      error: msg,
      stack,
      duration_ms: Date.now() - started,
    });
    await raiseAlert("critical", `migrate-helper falhou inesperadamente em action=${action}`, {
      action,
      error: msg,
      request_id: logger.getRequestId(),
    });
    return json({ error: msg }, 500);
  }
});
