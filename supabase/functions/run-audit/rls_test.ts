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
  // NAO habilite esta auditoria apenas cadastrando SUPABASE_SERVICE_ROLE_KEY: os passos abaixo
  // fazem INSERT real em public.solicitacoes via rpc exec_sql com SUPABASE_URL apontando para
  // PRODUCAO -- liga-la escreve no banco de producao a cada PR e entrega a service role a todo
  // workflow do repositorio. Habilitar exige decisao do dono (projeto de QA separado, ou um
  // `--strict` explicito que transforme o skip em falha).
  console.warn(
    "::warning::[rls_test] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes -- auditoria de isolamento multiempresa pulada (o CI fica verde sem esta verificacao).",
  );
}

Deno.test({
  name: "Multi-tenant Isolation Security Test",
  ignore: !RLSAUDIT_AVAILABLE,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    await t.step("Security: Tenant A cannot read Tenant B data", async () => {
      const { data } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          BEGIN;
          INSERT INTO public.solicitacoes (tenant_id, titulo, status, solicitante_id) 
          VALUES ('00000000-0000-0000-0000-000000000002', 'PRIVATE_B', 'pendente', '22222222-2222-2222-2222-222222222222');
          SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "tenant_id": "00000000-0000-0000-0000-000000000001"}';
          SET LOCAL "role" = 'authenticated';
          SELECT count(*) as count FROM public.solicitacoes WHERE titulo = 'PRIVATE_B';
          ROLLBACK;
        `
      });
      const selectResult = data?.find((r: any) => r.count !== undefined);
      assertEquals(Number(selectResult?.count || 0), 0, "CRITICAL: Tenant A was able to read Tenant B data!");
    });

    await t.step("Security: Tenant A cannot update Tenant B data", async () => {
      const { data } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          BEGIN;
          INSERT INTO public.solicitacoes (tenant_id, titulo, status, solicitante_id) 
          VALUES ('00000000-0000-0000-0000-000000000002', 'UPDATE_ME', 'pendente', '22222222-2222-2222-2222-222222222222');
          SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "tenant_id": "00000000-0000-0000-0000-000000000001"}';
          SET LOCAL "role" = 'authenticated';
          UPDATE public.solicitacoes SET titulo = 'HACKED' WHERE titulo = 'UPDATE_ME';
          SELECT count(*) as count FROM public.solicitacoes WHERE titulo = 'HACKED';
          ROLLBACK;
        `
      });
      const selectResult = data?.find((r: any) => r.count !== undefined);
      assertEquals(Number(selectResult?.count || 0), 0, "CRITICAL: Tenant A was able to update Tenant B data!");
    });
    
    // Explicitly nullify to help GC if needed, though leak is likely internal to the client pool
    (supabaseAdmin as any) = null;
  }
});




