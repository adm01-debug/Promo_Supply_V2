import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, target_function } = await req.json();

    if (action === "run_fuzzing") {
      const payloads = [
        {}, // Empty
        { id: "invalid-uuid" }, // Bad format
        { large_data: "A".repeat(10000) }, // Buffer stress
        { script: "<script>alert(1)</script>" }, // Injection attempt
        { nested: { a: { b: { c: { d: "depth" } } } } } // Recursion stress
      ];

      const results = [];
      for (const p of payloads) {
        const start = performance.now();
        const { data, error } = await supabaseClient.functions.invoke(target_function, {
          body: p,
        });
        results.push({
          payload: p,
          status: error ? "caught_error" : "success",
          latency: performance.now() - start,
          error: error?.message
        });
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "simulation_ready" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
