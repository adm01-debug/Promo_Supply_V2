import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeLogger } from "../_shared/logger.ts";
import { requireUser, requireTenantMembership, serviceClient, errorToResponse, jsonResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const logger = new EdgeLogger("erp-sync", requestId);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);

    const body = await req.json().catch(() => ({}));
    const { action, connectionId, entity, tenantId } = body as Record<string, string>;

    if (!connectionId || !entity || !tenantId) {
      return jsonResponse({ error: "connectionId, entity, tenantId required" }, { status: 400, cors: corsHeaders });
    }

    await requireTenantMembership(user.id, tenantId);

    const supabaseClient = serviceClient();

    const { data: connection, error: connError } = await supabaseClient
      .from("erp_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("tenant_id", tenantId)
      .single();

    if (connError || !connection) {
      return jsonResponse({ error: "Invalid ERP connection" }, { status: 404, cors: corsHeaders });
    }

    logger.info(`Syncing ${entity} for connection ${connection.erp_type}...`);

    const startTime = Date.now();
    let status: "success" | "error" = "success";
    let errorMsg: string | null = null;

    try {
      // Placeholder: real ERP sync would happen here.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (syncErr) {
      status = "error";
      errorMsg = syncErr instanceof Error ? syncErr.message : "Unknown sync error";
    }

    await supabaseClient.from("erp_sync_log").insert({
      tenant_id: tenantId,
      connection_id: connectionId,
      entity,
      direction: action === "pull" ? "inbound" : "outbound",
      status,
      error_message: errorMsg,
      duration_ms: Date.now() - startTime,
    });

    if (status === "error") {
      return jsonResponse({ error: errorMsg ?? "Sync failed" }, { status: 502, cors: corsHeaders });
    }

    return jsonResponse({ message: `Sync ${entity} completed successfully` }, { cors: corsHeaders });
  } catch (error) {
    logger.error("Fatal error in erp-sync", { error: error instanceof Error ? error.message : String(error) });
    return errorToResponse(error, corsHeaders);
  }
});
