/**
 * Regressão: tenant_isolation_<tabela> precisa ser RESTRICTIVE nas tabelas com regra por papel/dono.
 *
 * Como PERMISSIVE, o Postgres junta a policy de tenant com as de papel por OR, e qualquer logado do
 * tenant (mesmo sem papel em user_roles) lia e escrevia fornecedores, contratos, cotações etc.
 * Migration: supabase/migrations/20261112170347_rls_tenant_isolation_restrictive.sql.
 *
 * O teste lê as migrations e exige que a ÚLTIMA definição de cada policy listada seja AS RESTRICTIVE,
 * para que uma migration futura não volte a recriá-la como permissiva sem alguém perceber.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

const TABELAS_RESTRICTIVE = [
  "active_sessions",
  "approval_delegations",
  "approval_history",
  "approval_rules",
  "approval_workflows",
  "audit_logs",
  "budget_transactions",
  "categorias",
  "category_strategies",
  "contact_notes",
  "contract_documents",
  "contract_history",
  "contract_items",
  "contract_penalties",
  "contracts",
  "cotacoes",
  "creditos_fornecedor",
  "department_budgets",
  "devolucao_itens",
  "devolucoes",
  "fiscal_documents",
  "fornecedores",
  "licitacao_propostas",
  "licitacoes",
  "order_contracts",
  "pagamentos",
  "payment_history",
  "pedido_itens",
  "pedidos",
  "penalty_escalation_config",
  "receiving_checklists",
  "spend_forecasts",
  "supplier_bonifications",
  "supplier_documents",
  "supplier_qualification_scores",
] as const;

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ nome: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));

function ultimaDefinicao(tabela: string): { arquivo: string; stmt: string } | null {
  const re = new RegExp(
    `create\\s+policy\\s+"?tenant_isolation_${tabela}"?\\s+on\\s+(?:public\\.)?"?${tabela}"?\\b[^;]*;`,
    "gi",
  );
  let ultima: { arquivo: string; stmt: string } | null = null;
  for (const m of migrations) {
    for (const achado of m.sql.matchAll(re)) ultima = { arquivo: m.nome, stmt: achado[0] };
  }
  return ultima;
}

describe("RLS · tenant_isolation_* é RESTRICTIVE (papel não pode ser furado por OR)", () => {
  it.each(TABELAS_RESTRICTIVE)("tenant_isolation_%s: última definição é AS RESTRICTIVE", (tabela) => {
    const def = ultimaDefinicao(tabela);
    expect(def, `nenhuma migration cria tenant_isolation_${tabela}`).not.toBeNull();
    expect(def!.stmt, `${def!.arquivo} recria tenant_isolation_${tabela} sem AS RESTRICTIVE`).toMatch(
      /\bas\s+restrictive\b/i,
    );
    expect(def!.stmt).toMatch(/tenant_in_my_group\(tenant_id\)[\s\S]*with\s+check\s*\(\s*public\.tenant_in_my_group\(tenant_id\)/i);
  });
});
