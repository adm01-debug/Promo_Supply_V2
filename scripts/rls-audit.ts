/**
 * TEST-01 — RLS Policy Audit (refactored)
 * Lê pg_policies via PostgREST (service-role) com fallback permissivo.
 *
 * Detecta:
 *   - Policies permissivas (USING true / WITH CHECK true) fora da allowlist.
 *   - Tabelas com RLS desabilitado (relrowsecurity = false).
 *
 * Comportamento:
 *   - Sem credenciais → skip (exit 0) para não quebrar CI local.
 *   - Sem acesso a pg_policies → skip permissivo por padrão; com --strict falha.
 *   - Com --strict, qualquer achado permissivo falha o build.
 *   - Escreve snapshot em DOCS/security/rls-<data>.md para diff em PRs.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRICT = process.argv.includes("--strict");

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

// Allowlist: policies que legitimamente usam true.
// - service_role*/admin*: acesso administrativo total.
// - *_authenticated_read (SELECT): leitura pública para usuários autenticados.
const ALLOWED_POLICY_PREFIXES = ["service_role", "admin"];

function isAllowed(p: PolicyRow): boolean {
  const lower = p.policyname.toLowerCase();
  if (ALLOWED_POLICY_PREFIXES.some((pre) => lower.startsWith(pre))) return true;
  // Policies de leitura para authenticated (SELECT com qual=true) são legítimas.
  if (p.cmd === "SELECT" && lower.endsWith("_authenticated_read")) return true;
  return false;
}

function isTrue(expr: string | null): boolean {
  if (!expr) return false;
  const t = expr.trim().toLowerCase();
  return t === "true" || t === "(true)";
}

async function readPolicies(): Promise<PolicyRow[] | null> {
  // Tenta via RPC segura se existir; senão via pg_catalog direto.
  const rpc = await supabase.rpc("list_public_policies" as never);
  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data as unknown as PolicyRow[];
  }

  const { data, error } = await supabase
    .schema("pg_catalog" as unknown as Parameters<typeof supabase["schema"]>[0])
    .from("pg_policies")
    .select("schemaname, tablename, policyname, cmd, qual, with_check")
    .eq("schemaname", "public");

  if (error) return null;
  return (data ?? []) as PolicyRow[];
}

async function readRlsDisabled(): Promise<string[] | null> {
  // relnamespace é o OID do schema, não o nome. Resolve o OID de 'public'
  // via pg_namespace antes de filtrar pg_class.
  const ns = await supabase
    .schema("pg_catalog" as unknown as Parameters<typeof supabase["schema"]>[0])
    .from("pg_namespace")
    .select("oid, nspname")
    .eq("nspname", "public")
    .single();
  if (ns.error || !ns.data) return null;

  const { data, error } = await supabase
    .schema("pg_catalog" as unknown as Parameters<typeof supabase["schema"]>[0])
    .from("pg_class")
    .select("relname, relrowsecurity")
    .eq("relnamespace", ns.data.oid);
  if (error) return null;
  return (data ?? [])
    .filter((r: { relrowsecurity: boolean }) => r.relrowsecurity === false)
    .map((r: { relname: string }) => r.relname);
}

async function runAudit() {
  console.log("🔍 Starting RLS Security Audit...");

  const rows = await readPolicies();
  if (!rows) {
    const msg = "❌ Não foi possível ler pg_policies (RPC e pg_catalog indisponíveis).";
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg);
    console.warn("   Skipping (permissivo). Use --strict para falhar.");
    process.exit(0);
  }

  const permissive = rows.filter((p) => {
    const qualTrue = isTrue(p.qual);
    const checkTrue = isTrue(p.with_check);
    return (qualTrue || checkTrue) && !isAllowed(p);
  });

  const rlsDisabled = await readRlsDisabled();
  if (rlsDisabled === null) {
    const msg = "❌ Não foi possível ler pg_class — RLS desabilitado não verificado.";
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg);
  }
  const disabledTables = rlsDisabled ?? [];

  const report: string[] = [
    `# RLS Audit snapshot — ${new Date().toISOString()}`,
    "",
    `- Policies inspecionadas: ${rows.length}`,
    `- Policies permissivas: ${permissive.length}`,
    `- Tabelas com RLS desabilitado: ${disabledTables.length}`,
    "",
  ];

  if (permissive.length > 0) {
    report.push("## Policies permissivas", "");
    for (const p of permissive) {
      report.push(`- \`${p.tablename}\` / \`${p.policyname}\` (${p.cmd}) using=${p.qual} check=${p.with_check}`);
    }
    report.push("");
  }

  if (disabledTables.length > 0) {
    report.push("## Tabelas com RLS desabilitado", "");
    for (const t of disabledTables) report.push(`- \`${t}\``);
    report.push("");
  }

  mkdirSync("DOCS/security", { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  writeFileSync(`DOCS/security/rls-${stamp}.md`, report.join("\n"));

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

  if (disabledTables.length > 0) {
    console.warn(`\n⚠️  ${disabledTables.length} tabela(s) com RLS desabilitado.`);
    if (STRICT) process.exit(1);
  }

  console.log(`✅ RLS Audit: ${rows.length} policies inspected, none permissive.`);
}

runAudit().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
