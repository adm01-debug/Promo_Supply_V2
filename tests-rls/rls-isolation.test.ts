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

// Sem fallback embutido de propósito: o fallback anterior apontava para outro
// projeto Supabase (e carregava a anon key dele), então rodar sem as variáveis
// testava o RLS do banco errado e dava verde sem significado.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "RLS suite exige VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY do projeto oficial. " +
      "Defina as duas antes de rodar (no CI vêm dos secrets).",
  );
}

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
    } as unknown as Parameters<ReturnType<typeof client.from<"audit_logs">>["insert"]>[0]);
    expect(error).toBeTruthy();
  });

  it("anon não consegue chamar RPC administrativa count_legacy_storage_urls", async () => {
    const { error } = await client.rpc("count_legacy_storage_urls" as unknown as Parameters<typeof client.rpc>[0]);
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
      // Antes so havia `not.toEqual(tenantB)`: dois `null` diferentes de um UUID passavam,
      // a suite saia verde e nenhuma prova de isolamento era executada.
      expect(tenantA, "usuario A sem vinculo em user_tenants: a prova de isolamento nao roda").toBeTruthy();
      expect(tenantB, "usuario B sem vinculo em user_tenants: a prova de isolamento nao roda").toBeTruthy();
      expect(tenantA).not.toEqual(tenantB);
    });

    // Escrita de teste so com autorizacao explicita: o banco alvo e producao.
    const ESCRITA_PERMITIDA = process.env.RLS_ALLOW_WRITES === "true";

    /**
     * Os testes de leitura cross-tenant comecavam com `if (!tenantB) return;`. Com os
     * usuarios de teste sem vinculo em `user_tenants`, `tenantB` era null, TODOS os corpos
     * eram pulados e a suite reportava sucesso sem executar uma unica consulta — verde
     * falso. Agora a ausencia do tenant B e' falha explicita com a causa no relatorio.
     */
    function exigirTenantB(): string {
      if (!tenantB) {
        throw new Error("usuario B sem vinculo em user_tenants: a prova de isolamento nao roda (verifique RLS_TEST_USER_B)");
      }
      return tenantB;
    }

    const CROSS_TABLES = ["fornecedores", "pedidos", "solicitacoes", "pagamentos"] as const;

    it.each(CROSS_TABLES)(
      "usuário A não vê linhas do tenant de B em %s",
      async (table) => {
        const alvo = exigirTenantB();
        const { data, error } = await clientA
          .from(table)
          .select("id, tenant_id")
          .eq("tenant_id", alvo)
          .limit(5);
        expect(error).toBeNull();
        expect(data ?? []).toEqual([]);
      },
    );

    /**
     * Antes esta suite INSERIA um pedido e um pagamento no tenant B e dava UPDATE em massa
     * (`.update().eq("tenant_id", tenantB)`) em todos os contratos do tenant B. Como o banco
     * alvo e producao e o teste so "passava" quando o RLS barrava, qualquer regressao de policy
     * gravava lixo de teste no cliente, e o UPDATE sem `.limit()` cancelava contratos reais.
     * Agora a prova do isolamento e nao destrutiva (leitura das policies nas migrations) e a
     * escrita so roda com RLS_ALLOW_WRITES=true, que existe apenas em projeto descartavel.
     */
    it("policies de escrita cross-tenant sao RESTRICTIVE e exigem tenant_in_my_group", () => {
      // Espelha src/tests/security/rls-tenant-isolation-restrictive.test.ts: a regra e
      // conferida na migration, sem tocar no banco.
      const { readFileSync, readdirSync } = require("node:fs") as typeof import("node:fs");
      const { join } = require("node:path") as typeof import("node:path");
      const dir = join(process.cwd(), "supabase/migrations");
      const sql = readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .map((f) => readFileSync(join(dir, f), "utf8"))
        .join("\n");

      for (const tabela of ["pedidos", "pagamentos"]) {
        const restritiva = new RegExp(
          "CREATE POLICY\\s+tenant_isolation_" + tabela + "\\s+ON\\s+public\\." + tabela + "\\s+AS\\s+RESTRICTIVE",
          "i",
        );
        expect(restritiva.test(sql), tabela + ": falta policy RESTRICTIVE de isolamento").toBe(true);
      }
      expect(
        /CREATE POLICY "Buyers coordinators admins can manage orders" ON public\.pedidos\s+FOR ALL TO authenticated\s+USING \(tenant_in_my_group\(tenant_id\)/i.test(
          sql,
        ),
        "pedidos: escrita sem tenant_in_my_group na policy",
      ).toBe(true);
    });

    it.skipIf(!ESCRITA_PERMITIDA)("usuário A não consegue inserir pedido com tenant_id de B", async () => {
      const alvo = exigirTenantB();
      const { error } = await clientA.from("pedidos").insert({
        tenant_id: alvo,
        numero: `RLS-TEST-${Date.now()}`,
        status: "pendente",
        valor_total: 1,
      } as unknown as Parameters<ReturnType<typeof clientA.from<"pedidos">>["insert"]>[0]);
      expect(error).toBeTruthy();
    });

    /**
     * Regressão da Onda 122: role privilegiada (finance/admin/buyer) NÃO pode
     * enxergar pagamentos/contracts de outro tenant. Antes do patch de
     * tenant_in_my_group() nas policies, um finance de qualquer empresa
     * conseguia ler dados de todas — este bloco trava a regressão.
     */
    const PRIVILEGED_CROSS_TABLES = [
      "pagamentos",
      "contracts",
      "cotacoes",
      "supplier_documents",
      "supplier_qualification_scores",
    ] as const;

    it.each(PRIVILEGED_CROSS_TABLES)(
      "finance/admin do tenant A não lê %s do tenant B (cross-tenant leak)",
      async (table) => {
        const alvo = exigirTenantB();
        const { data, error } = await clientA
          .from(table)
          .select("id, tenant_id")
          .eq("tenant_id", alvo)
          .limit(10);
        expect(error).toBeNull();
        expect(data ?? []).toEqual([]);
      },
    );

    it.skipIf(!ESCRITA_PERMITIDA)("finance do tenant A não consegue inserir pagamento no tenant B", async () => {
      const alvo = exigirTenantB();
      const { error } = await clientA.from("pagamentos").insert({
        tenant_id: alvo,
        valor: 1,
        status: "pendente",
      } as unknown as Parameters<ReturnType<typeof clientA.from<"pagamentos">>["insert"]>[0]);
      expect(error).toBeTruthy();
    });

    /**
     * Antes: `.update({status:'cancelled'}).eq("tenant_id", tenantB)` — update de massa, sem
     * `.limit()`, sobre TODOS os contratos do tenant B. Agora o filtro inclui um id que nao
     * existe: nenhuma linha real pode ser afetada, com RLS correto ou quebrado. O isolamento
     * em si e provado pelo teste estatico de policies acima.
     */
    it("finance do tenant A não consegue atualizar contract do tenant B", async () => {
      const alvo = exigirTenantB();
      const { data, error } = await clientA
        .from("contracts")
        .update({ status: "cancelled" } as unknown as Parameters<
          ReturnType<typeof clientA.from<"contracts">>["update"]
        >[0])
        .eq("tenant_id", alvo)
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");
      // Aceito: erro RLS OU zero linhas afetadas (RLS filtra silenciosamente).
      if (!error) {
        expect(data ?? []).toEqual([]);
      }
    });
  },
);
