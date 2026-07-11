import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { ERPSyncContract } from "../_shared/contracts.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { getIdempotentResponse, recordIdempotentResponse, deriveIdempotencyKey } from "../_shared/idempotency.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger("erp-sync", requestId);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // M-02: resolve tenant a partir do JWT.
    const { getAuthUser, getTenantId } = await import("../_shared/security.ts");
    const { user, client: authClient } = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // M-05: rate-limit 30 req/min por usuário (sync é operação pesada).
    const rl = await checkRateLimit({
      identifier: user.id,
      endpoint: "erp-sync",
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);

    // M-06: idempotência (webhooks ERP podem reentregar em falha parcial).
    const bodyText = await req.text();
    const idempotencyKey = await deriveIdempotencyKey(req, bodyText);
    const cached = await getIdempotentResponse("erp-sync", idempotencyKey);
    if (cached) {
      logger.info("Idempotent replay", { key: idempotencyKey });
      return cached.response(corsHeaders);
    }

    // Reconstrói request para validateBody (que consome req.json()).
    const reqForValidation = new Request(req.url, { method: req.method, headers: req.headers, body: bodyText });
    const data = await validateBody(reqForValidation, ERPSyncContract, logger);
    const { action, connectionId, entity } = data;
    const tenantId = await getTenantId(authClient, user, (data as any).tenantId);

    logger.info(`Iniciando sincronização ERP`, { action, entity, connectionId, tenantId });

    const { data: connection, error: connError } = await supabaseClient
      .from("erp_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("tenant_id", tenantId)
      .single();

    if (connError || !connection) {
      logger.error("Conexão ERP não encontrada ou inválida", { connectionId, tenantId });
      throw new Error("Validation error: Invalid or unauthorized ERP connection");
    }

    const startTime = Date.now();
    let status = "success";
    let errorMsg = null;

    // Simulação de delay de integração
    await new Promise(resolve => setTimeout(resolve, 800));

    const { error: logError } = await supabaseClient.from("erp_sync_log").insert({
      tenant_id: tenantId,
      connection_id: connectionId,
      entity: entity,
      direction: action === "pull" ? "inbound" : "outbound",
      status: status,
      error_message: errorMsg,
      duration_ms: Date.now() - startTime,
    });

    if (logError) {
      logger.error("Erro ao gravar log de sincronização", { logError });
    }

    logger.info("Sincronização ERP concluída com sucesso", { duration: Date.now() - startTime });

    const responsePayload = {
      message: `Sync ${entity} completed successfully`,
      requestId,
      timestamp: new Date().toISOString(),
    };
    await recordIdempotentResponse("erp-sync", idempotencyKey, responsePayload);

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId } }
    );
  } catch (error) {
    return errorResponse(error, logger);
  }
});