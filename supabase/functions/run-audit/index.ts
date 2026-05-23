import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Audit RLS Policies for (true)
    const { data: policies, error: policiesError } = await supabaseAdmin
      .rpc('get_raw_policies'); // We might need to create this function if it doesn't exist, or query pg_policies directly

    // Fallback query if RPC doesn't exist
    const { data: pgPolicies, error: pgError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: "SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public'"
    });

    if (pgError) throw pgError;

    const issues = pgPolicies.filter((p: any) => {
      const isVulnerable = (p.qual && p.qual === 'true') || (p.with_check && p.with_check === 'true');
      const isPermissive = (p.qual && p.qual.includes('true') && !p.qual.includes('tenant_id')) || 
                           (p.with_check && p.with_check.includes('true') && !p.with_check.includes('tenant_id'));
      return isVulnerable || isPermissive;
    });

    // Exclude allowed tables (master data)
    const allowedMasterTables = ['currencies', 'exchange_rates', 'unspsc_codes', 'dependency_health', 'dependency_health_history'];
    const criticalIssues = issues.filter((p: any) => !allowedMasterTables.includes(p.tablename));

    const report = {
      timestamp: new Date().toISOString(),
      status: criticalIssues.length === 0 ? "PASSED" : "FAILED",
      total_policies: pgPolicies.length,
      vulnerable_policies: criticalIssues,
      master_data_policies: issues.filter((p: any) => allowedMasterTables.includes(p.tablename))
    };

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: criticalIssues.length === 0 ? 200 : 403,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
