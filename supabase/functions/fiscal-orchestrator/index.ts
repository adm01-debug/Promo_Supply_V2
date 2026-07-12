import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { FiscalContract } from "../_shared/contracts.ts";
import { withIdempotency } from "../_shared/idempotency.ts";

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

        return {
          data: {
            success: true,
            message: `${type} ${action} iniciado`,
            event_id: event.id,
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
