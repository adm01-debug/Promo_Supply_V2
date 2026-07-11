/**
 * RLS regression suite — valida isolamento multi-tenant nas tabelas críticas.
 *
 * Estratégia pragmática: usa o client anon (sem sessão) e verifica que TODAS as
 * tabelas sensíveis rejeitam leitura anônima. Isso protege contra o pior tipo
 * de regressão de RLS (vazamento cross-tenant / cross-user via anon key).
 *
 * Rodar: `bunx vitest run tests-rls`
 *
 * Para cobrir isolamento entre 2 usuários autenticados de tenants diferentes,
 * defina os secrets RLS_TEST_USER_A / RLS_TEST_USER_B (email:password) e o
 * bloco `describe.runIf(...)` abaixo será executado.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://trwgmplubeqxrxpncdgf.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyd2dtcGx1YmVxeHJ4cG5jZGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzY5MTgsImV4cCI6MjA5NDA1MjkxOH0.duCmV9VwETKxO6dI35u5cm9tDN1760EP3OoOjM3Iatg";

/** Tabelas que jamais devem retornar linhas sem autenticação. */
const PROTECTED_TABLES = [
  "profiles",
  "user_roles",
  "user_tenants",
  "tenants",
  "organizations",
  "fornecedores",
  "pedidos",
  "solicitacoes",
  "cotacoes",
  "pagamentos",
  "contracts",
  "estoque",
  "audit_logs",
  "security_logs",
  "login_attempts",
  "webhook_events",
  "approval_delegations",
  "budget_transactions",
] as const;

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("RLS · anon isolation (tabelas críticas)", () => {
  let client: SupabaseClient;

  beforeAll(() => {
    client = anonClient();
  });

  it.each(PROTECTED_TABLES)(
    "anon não consegue ler linhas de public.%s",
    async (table) => {
      const { data, error } = await client.from(table).select("*").limit(5);

      // Aceito: erro de permissão OU lista vazia.
      // Rejeitado: qualquer linha retornada, ou erro que não seja de permissão/RLS.
      if (error) {
        expect(
          /permission|rls|row-level|not allowed|Not Acceptable/i.test(error.message) ||
            error.code === "42501" ||
            error.code === "PGRST301",
        ).toBe(true);
      } else {
        expect(data ?? []).toEqual([]);
      }
    },
  );

  it("anon não consegue inserir em audit_logs", async () => {
    const { error } = await client.from("audit_logs").insert({
      user_email: "attacker@evil.com",
      entity_id: "x",
      entity_description: "tentativa",
    } as any);
    expect(error).toBeTruthy();
  });

  it("anon não consegue chamar RPC administrativa count_legacy_storage_urls", async () => {
    const { error } = await client.rpc("count_legacy_storage_urls" as any);
    expect(error).toBeTruthy();
  });
});

/**
 * Isolamento entre dois usuários autenticados (opcional — precisa de secrets).
 * Formato dos secrets: "email:password".
 */
const USER_A = process.env.RLS_TEST_USER_A;
const USER_B = process.env.RLS_TEST_USER_B;

describe.runIf(!!USER_A && !!USER_B)(
  "RLS · cross-tenant isolation (dois usuários autenticados)",
  () => {
    let clientA: SupabaseClient;
    let clientB: SupabaseClient;
    let tenantA: string | null = null;
    let tenantB: string | null = null;

    beforeAll(async () => {
      const [emailA, passA] = USER_A!.split(":");
      const [emailB, passB] = USER_B!.split(":");
      clientA = anonClient();
      clientB = anonClient();

      const a = await clientA.auth.signInWithPassword({ email: emailA, password: passA });
      const b = await clientB.auth.signInWithPassword({ email: emailB, password: passB });
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();

      const ta = await clientA.from("user_tenants").select("tenant_id").limit(1).maybeSingle();
      const tb = await clientB.from("user_tenants").select("tenant_id").limit(1).maybeSingle();
      tenantA = ta.data?.tenant_id ?? null;
      tenantB = tb.data?.tenant_id ?? null;
      expect(tenantA).not.toEqual(tenantB);
    });

    const CROSS_TABLES = ["fornecedores", "pedidos", "solicitacoes", "pagamentos"] as const;

    it.each(CROSS_TABLES)(
      "usuário A não vê linhas do tenant de B em %s",
      async (table) => {
        if (!tenantB) return;
        const { data, error } = await clientA
          .from(table)
          .select("id, tenant_id")
          .eq("tenant_id", tenantB)
          .limit(5);
        expect(error).toBeNull();
        expect(data ?? []).toEqual([]);
      },
    );

    it("usuário A não consegue inserir pedido com tenant_id de B", async () => {
      if (!tenantB) return;
      const { error } = await clientA.from("pedidos").insert({
        tenant_id: tenantB,
        numero: `RLS-TEST-${Date.now()}`,
        status: "pendente",
        valor_total: 1,
      } as any);
      expect(error).toBeTruthy();
    });
  },
);
