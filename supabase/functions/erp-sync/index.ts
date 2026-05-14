import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, connectionId, entity } = await req.json();
    const tenantId = req.headers.get("x-tenant-id");

    if (!tenantId) {
      throw new Error("Missing tenant ID");
    }

    // 1. Buscar configuração da conexão
    const { data: connection, error: connError } = await supabaseClient
      .from("erp_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("tenant_id", tenantId)
      .single();

    if (connError || !connection) {
      throw new Error("Invalid ERP connection");
    }

    // 2. Lógica simplificada de sync (Mock para demonstração)
    // Em produção, aqui seriam feitos os fetches para SAP/TOTVS
    console.log(`Syncing ${entity} for connection ${connection.erp_type}...`);

    const startTime = Date.now();
    let status = "success";
    let errorMsg = null;

    // Simulação de chamada externa
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Registrar Log
    await supabaseClient.from("erp_sync_log").insert({
      tenant_id: tenantId,
      connection_id: connectionId,
      entity: entity,
      direction: action === "pull" ? "inbound" : "outbound",
      status: status,
      error_message: errorMsg,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ message: `Sync ${entity} completed successfully` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Fatal error in erp-sync", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
