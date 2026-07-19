import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildResponseHeaders, fetchWithTimeout, FetchTimeoutError } from "../_shared/http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { FiscalContract } from "../_shared/contracts.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { retry } from "../_shared/retry.ts";

const SEFAZ_TIMEOUT_MS = 20_000;
const SEFAZ_RETRIES = 4; // up to 4 retries → 5 total attempts with jitter backoff

/** Dispatch a fiscal document to SEFAZ/provider with retry+backoff. */
async function dispatchToSefaz(
  eventId: string,
  action: string,
  type: string,
  payload: Record<string, unknown> | undefined,
  logger: EdgeLogger,
): Promise<{ protocol?: string; sefaz_status?: string }> {
  const sefazUrl = Deno.env.get("SEFAZ_WEBHOOK_URL");
  if (!sefazUrl) {
    logger.warn("SEFAZ_WEBHOOK_URL not configured — skipping dispatch", { eventId });
    return {};
  }

  return retry(
    async () => {
      const res = await fetchWithTimeout(sefazUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SEFAZ_API_TOKEN") ?? ""}`,
          "X-Event-ID": eventId,
        },
        body: JSON.stringify({ action, type, payload }),
        timeoutMs: SEFAZ_TIMEOUT_MS,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`sefaz_http_${res.status}: ${body.slice(0, 200)}`);
      }
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      return {
        protocol: json["protocol"] as string | undefined,
        sefaz_status: json["status"] as string | undefined,
      };
    },
    {
      retries: SEFAZ_RETRIES,
      baseDelayMs: 500,
      maxDelayMs: 8000,
      shouldRetry: (err) => {
        if (err instanceof FetchTimeoutError) return true;
        const msg = (err as Error).message?.toLowerCase() ?? "";
        return /timeout|network|econnreset|fetch failed|5\d\d|429/.test(msg);
      },
    },
  ).catch((err) => {
    logger.error("SEFAZ dispatch failed after retries", { eventId, error: (err as Error).message });
    return { sefaz_status: "dispatch_error", protocol: undefined };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const logger = new EdgeLogger("fiscal-orchestrator", requestId);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Validation error: Authorization header missing");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão expirada ou inválida", requestId }), {
        status: 401,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { getTenantId } = await import("../_shared/security.ts");
    const tenant_id = await getTenantId(supabaseAdmin, user, req);
    if (!tenant_id) {
      logger.error("Contexto de tenant não encontrado para o usuário", { userId: user.id });
      throw new Error("Validation error: Tenant context not found");
    }

    // Wave 66 (R-01): idempotência universal — mesmo (user, body) não duplica fiscal_events.
    return await withIdempotency(
      `fiscal-orchestrator:${user.id}`,
      req,
      corsHeaders,
      async (bodyText) => {
        const data = FiscalContract.parse(JSON.parse(bodyText || "{}"));
        const { action, type, document_id, payload } = data;

        logger.info("Processando ação fiscal", { action, type, document_id, userId: user.id });

        const { data: event, error: eventError } = await supabaseAdmin
          .from("fiscal_events")
          .insert({
            tenant_id,
            document_id,
            type,
            action,
            status: "pending",
            request_payload: payload,
          })
          .select()
          .single();

        if (eventError) {
          logger.error("Erro ao criar evento fiscal no banco", { eventError });
          throw eventError;
        }

        logger.info("Evento fiscal registrado com sucesso", { eventId: event.id });

        // Dispatch to SEFAZ with retry+backoff; update fiscal_events with outcome.
        const { protocol, sefaz_status } = await dispatchToSefaz(
          event.id,
          action,
          type,
          payload,
          logger,
        );

        const dispatched = Boolean(protocol || (sefaz_status && sefaz_status !== "dispatch_error"));
        await supabaseAdmin
          .from("fiscal_events")
          .update({
            status: dispatched ? "sent" : "failed",
            response_payload: { protocol, sefaz_status },
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);

        logger.info("Despacho SEFAZ concluído", { eventId: event.id, dispatched, sefaz_status });

        return {
          data: {
            success: true,
            message: `${type} ${action} ${dispatched ? "enviado" : "agendado para reprocessamento"}`,
            event_id: event.id,
            protocol: protocol ?? null,
            sefaz_status: sefaz_status ?? null,
            requestId,
          },
          status: 200,
        };
      },
    );
  } catch (error) {
    return errorResponse(error, logger);
  }
});
