import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { ERPSyncContract } from "../_shared/contracts.ts";

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

    const data = await validateBody(req, ERPSyncContract, logger);
    const { action, connectionId, entity } = data;
    
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      throw new Error("Validation error: Missing tenant ID header");
    }

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

    return new Response(
      JSON.stringify({ 
        message: `Sync ${entity} completed successfully`,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return errorResponse(error, logger);
  }
});