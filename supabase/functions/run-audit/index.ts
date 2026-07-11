import { corsHeaders } from "../_shared/security.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Audit RLS Policies for insecure patterns
    const { data: pgPolicies, error: pgError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SELECT 
          tablename, 
          policyname, 
          roles, 
          cmd, 
          qual as using_expression, 
          with_check as check_expression 
        FROM pg_policies 
        WHERE schemaname = 'public'
      `
    });

    if (pgError) throw pgError;

    const allowedMasterTables = [
      'currencies', 
      'exchange_rates', 
      'unspsc_codes', 
      'dependency_health', 
      'dependency_health_history',
      'countries',
      'states',
      'cities'
    ];

    const reportEntries = pgPolicies.map((p: any) => {
      const isVulnerable = 
        (p.using_expression === 'true') || 
        (p.check_expression === 'true') ||
        (p.using_expression?.includes('true') && !p.using_expression?.includes('tenant_id')) ||
        (p.check_expression?.includes('true') && !p.check_expression?.includes('tenant_id'));
      
      const isExempt = allowedMasterTables.includes(p.tablename);
      const severity = (isVulnerable && !isExempt) ? "CRITICAL" : (isVulnerable ? "INFO" : "OK");
      
      let accessLevel = "Strict Isolation";
      if (isVulnerable) accessLevel = "Public/Global Access";
      if (p.using_expression?.includes('auth.uid()')) accessLevel = "User Isolation";
      if (p.using_expression?.includes('tenant_id')) accessLevel = "Tenant Isolation";

      return {
        table: p.tablename,
        policy: p.policyname,
        command: p.cmd,
        roles: p.roles,
        using: p.using_expression,
        check: p.check_expression,
        severity,
        access_level: accessLevel,
        tenant_filtering: p.using_expression?.includes('tenant_id') || p.check_expression?.includes('tenant_id')
      };
    });

    const criticalIssues = reportEntries.filter(e => e.severity === "CRITICAL");

    const complianceSummary = {
      timestamp: new Date().toISOString(),
      overall_status: criticalIssues.length === 0 ? "COMPLIANT" : "NON_COMPLIANT",
      total_policies: pgPolicies.length,
      critical_findings: criticalIssues.length,
      compliance_report: reportEntries,
      remediation_required: criticalIssues.map(i => `${i.table}: ${i.policy}`)
    };

    return new Response(JSON.stringify(complianceSummary, null, 2), {
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

