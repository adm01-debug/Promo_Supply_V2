import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_LEVELS = new Set(["debug", "info", "warn", "error"]);
const MAX_MESSAGE = 2000;
const MAX_CONTEXT_BYTES = 8 * 1024;
const MAX_URL = 2048;
const MAX_UA = 512;

const clip = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  return v.length > max ? v.slice(0, max) : v;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    // user_id is derived from the JWT; never trust the body.
    const { data: { user } } = await supabaseClient.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const level = typeof body.level === "string" ? body.level.toLowerCase() : "info";
    if (!ALLOWED_LEVELS.has(level)) {
      return new Response(JSON.stringify({ error: "Invalid level" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const message = clip(body.message, MAX_MESSAGE);
    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    let context = body.context;
    if (context && typeof context === "object") {
      const json = JSON.stringify(context);
      if (json.length > MAX_CONTEXT_BYTES) context = { _truncated: true };
    } else if (context !== undefined && context !== null) {
      context = null;
    }

    const { error } = await supabaseClient.from("telemetry_logs").insert({
      level,
      message,
      context,
      request_id: clip(body.requestId, 64),
      user_id: user?.id ?? null,
      url: clip(body.url, MAX_URL),
      user_agent: clip(body.userAgent, MAX_UA),
      client_ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
