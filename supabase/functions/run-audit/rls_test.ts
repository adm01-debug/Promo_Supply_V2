import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Guard: this audit needs a real project URL + service-role key. In CI
// without those secrets it would crash with "supabaseUrl is required" or
// fail authentication, so it is skipped instead.
const RLSAUDIT_AVAILABLE = supabaseUrl.startsWith("http") && serviceRoleKey !== "";

if (!RLSAUDIT_AVAILABLE) {
  // ::warning:: aparece no resumo do job no GitHub Actions: antes o skip so existia no log
  // inteiro e o check terminava verde como se a auditoria tivesse rodado.
  // NAO habilite esta auditoria apenas cadastrando SUPABASE_SERVICE_ROLE_KEY: a leitura abaixo
  // usa SUPABASE_URL, que nos workflows aponta para PRODUCAO, e entrega a service role a todo
  // workflow do repositorio. Habilitar exige decisao do dono (projeto de QA separado).
  console.warn(
    "::warning::[rls_test] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes -- auditoria de isolamento multiempresa pulada (o CI fica verde sem esta verificacao).",
  );
}

// Etapa 150: este arquivo exercitava o isolamento com BEGIN/SET LOCAL/INSERT/ROLLBACK dentro de
// rpc('exec_sql'), que foi removida (SQL arbitrario em SECURITY DEFINER). O teste fazia INSERT
// real em public.solicitacoes quando habilitado, o que o proprio aviso acima proibia. A verificacao
// agora le o desenho das policies por audit_rls_policies() -- a mesma RPC que run-audit usa --
// e falha se uma tabela multiempresa expuser policy permissiva sem tenant_id. Prova de escrita
// real cross-tenant exige projeto de QA dedicado (etapas 040/041).
type PolicyRow = {
  tablename: string;
  policyname: string;
  roles: string[];
  cmd: string;
  using_expression: string | null;
  check_expression: string | null;
};

// Tabelas de catalogo/dominio compartilhado: acesso global e' intencional (espelha a lista de
// run-audit/index.ts).
const TABELAS_MESTRAS = new Set([
  "currencies",
  "exchange_rates",
  "unspsc_codes",
  "dependency_health",
  "dependency_health_history",
  "countries",
  "states",
  "cities",
]);

function permissivaSemTenant(p: PolicyRow): boolean {
  const using = p.using_expression ?? "";
  const check = p.check_expression ?? "";
  return [using, check].some(
    (expr) => expr === "true" || (expr.includes("true") && !expr.includes("tenant_id")),
  );
}

Deno.test({
  name: "Multi-tenant Isolation Security Test",
  ignore: !RLSAUDIT_AVAILABLE,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let policies: PolicyRow[] = [];

    await t.step("Le o snapshot de policies pela RPC de auditoria", async () => {
      const { data, error } = await supabaseAdmin.rpc("audit_rls_policies");
      assertEquals(error, null, `audit_rls_policies falhou: ${error?.message ?? ""}`);
      policies = (data ?? []) as PolicyRow[];
      if (policies.length === 0) {
        throw new Error("audit_rls_policies devolveu zero policies: public deve ter RLS");
      }
    });

    await t.step("Nenhuma tabela multiempresa tem policy permissiva global", async () => {
      const vazamentos = policies
        .filter((p) => !TABELAS_MESTRAS.has(p.tablename) && permissivaSemTenant(p))
        .map((p) => `${p.tablename}.${p.policyname} (${p.cmd})`);

      assertEquals(
        vazamentos,
        [],
        `CRITICAL: policies permissivas sem tenant_id: ${vazamentos.join(", ")}`,
      );
    });

    await t.step("Policies de escrita exigem tenant_id no WITH CHECK", async () => {
      const escritasSemTenant = policies
        .filter((p) => ["INSERT", "UPDATE", "ALL"].includes(p.cmd))
        .filter((p) => !TABELAS_MESTRAS.has(p.tablename))
        .filter((p) => !(p.check_expression ?? "").includes("tenant_id"))
        .map((p) => `CHECK ${p.tablename}.${p.policyname}`);

      assertEquals(
        escritasSemTenant,
        [],
        `CRITICAL: policy de escrita sem tenant_id no WITH CHECK: ${escritasSemTenant.join(", ")}`,
      );
    });
  },
});