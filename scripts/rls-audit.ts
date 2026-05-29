import { createClient } from "@supabase/supabase-js";

/**
 * RLS Audit Tool
 * Scans all database policies for permissive rules (USING true / WITH CHECK true).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log("⚠️ Skipping RLS Audit: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runAudit() {
  console.log("🔍 Starting RLS Security Audit...");

  // Query to find policies with 'true' (ignoring internal auth schemas)
  const { data: policies, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND (qual = '(true)' OR with_check = '(true)')
      AND policyname NOT LIKE 'service_role_%';
    `
  });

  if (error) {
    console.error("❌ Error querying policies:", error.message);
    process.exit(1);
  }

  if (policies && policies.length > 0) {
    console.error("\n🚨 CRITICAL SECURITY RISK: Found permissive RLS policies!");
    console.table(policies.map(p => ({
      Table: p.tablename,
      Policy: p.policyname,
      Command: p.cmd,
      Using: p.qual,
      WithCheck: p.with_check
    })));
    process.exit(1);
  }

  console.log("✅ RLS Audit: No permissive policies found in public schema.");
}

runAudit();
