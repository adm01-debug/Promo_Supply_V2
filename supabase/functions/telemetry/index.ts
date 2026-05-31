import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { TelemetryContract } from "../_shared/contracts.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger("telemetry", requestId);

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    let user = null;
    if (authHeader) {
      const { data } = await supabaseClient.auth.getUser();
      user = data.user;
    }

    const data = await validateBody(req, TelemetryContract, logger);
    const { level, message, context, url, userAgent, tenantId: providedTenantId } = data;

    // Use admin client for telemetry to ensure logging even if auth is tricky
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tenant ID from user metadata if not provided explicitly
    const tenantId = providedTenantId || (user?.user_metadata?.tenant_id as string);

    const { error } = await supabaseAdmin.from("telemetry_logs").insert({
      level,
      message,
      context,
      request_id: requestId,
      user_id: user?.id,
      tenant_id: tenantId,
      url,
      user_agent: userAgent,
      client_ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
    });

    if (error) {
      logger.error("Falha ao salvar log de telemetria no banco", { dbError: error });
      throw error;
    }

    return new Response(JSON.stringify({ success: true, requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return errorResponse(error, logger);
  }
});