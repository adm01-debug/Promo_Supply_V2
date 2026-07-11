/**
 * TEST-01 — RLS Policy Audit (refactored)
 * Não depende de RPC exec_sql. Lê pg_policies via PostgREST (service-role).
 *
 * Falha o build se encontrar policy permissiva (USING true / WITH CHECK true)
 * fora da allowlist de service_role.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log("⚠️ Skipping RLS Audit: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface PolicyRow {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

async function runAudit() {
  console.log("🔍 Starting RLS Security Audit (pg_policies direct)…");

  // pg_policies é exposto via PostgREST em schema pg_catalog quando permitido.
  // Usamos uma view materializada segura: information_schema não expõe qual/with_check,
  // então buscamos via RPC segura `list_public_policies` se existir; senão via SQL simples.
  const { data, error } = await supabase
    .schema("pg_catalog" as any)
    .from("pg_policies")
    .select("schemaname, tablename, policyname, cmd, qual, with_check")
    .eq("schemaname", "public");

  if (error) {
    console.error("❌ Failed to read pg_policies:", error.message);
    console.error("   Grant SELECT on pg_catalog.pg_policies to service_role or expose a view.");
    process.exit(1);
  }

  const rows = (data ?? []) as PolicyRow[];
  const permissive = rows.filter((p) => {
    const qualTrue = p.qual === "true" || p.qual === "(true)";
    const checkTrue = p.with_check === "true" || p.with_check === "(true)";
    const isServiceRolePolicy = p.policyname.toLowerCase().startsWith("service_role");
    return (qualTrue || checkTrue) && !isServiceRolePolicy;
  });

  if (permissive.length > 0) {
    console.error("\n🚨 CRITICAL: Permissive RLS policies detected!");
    console.table(permissive.map((p) => ({
      Table: p.tablename,
      Policy: p.policyname,
      Cmd: p.cmd,
      Using: p.qual,
      WithCheck: p.with_check,
    })));
    process.exit(1);
  }

  console.log(`✅ RLS Audit: ${rows.length} policies inspected, none permissive.`);
}

runAudit().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
