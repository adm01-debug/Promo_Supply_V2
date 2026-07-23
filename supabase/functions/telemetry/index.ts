import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
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

    // SECURITY: require valid user token to prevent log injection from unauthenticated callers.
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: buildResponseHeaders(corsHeaders),
      });
    }
    const { data: authData } = await supabaseClient.auth.getUser();
    const user = authData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    // Accept both single entry and { batch: [...] } from the frontend logger.
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch (_e) {
      return errorResponse(new Error("Invalid JSON body"), logger);
    }

    const entries: any[] = Array.isArray(rawBody?.batch) ? rawBody.batch : [rawBody];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const normalizeLevel = (lv: unknown) => {
      const s = String(lv ?? "info").toLowerCase().trim();
      if (s === "warning") return "warn";
      return ["info", "warn", "error", "debug"].includes(s) ? s : "info";
    };

    const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for");
    const rows = entries
      .filter((e) => e && typeof e.message === "string" && e.message.length > 0)
      .map((e) => ({
        level: normalizeLevel(e.level),
        message: String(e.message).slice(0, 4000),
        context: e.context ?? null,
        request_id: e.requestId ?? requestId,
        user_id: user?.id,
        tenant_id: e.tenantId || (user?.user_metadata?.tenant_id as string) || null,
        url: e.url ?? null,
        user_agent: e.userAgent ?? null,
        client_ip: clientIp,
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0, requestId }), {
        headers: buildResponseHeaders(corsHeaders),
        status: 200,
      });
    }

    const { error } = await supabaseAdmin.from("telemetry_logs").insert(rows);
    if (error) {
      logger.error("Falha ao salvar log de telemetria no banco", { dbError: error });
      throw error;
    }

    return new Response(JSON.stringify({ success: true, inserted: rows.length, requestId }), {
      headers: buildResponseHeaders(corsHeaders),
      status: 200,
    });
  } catch (error) {
    return errorResponse(error, logger);
  }
});