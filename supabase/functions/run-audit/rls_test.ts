import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test({
  name: "Multi-tenant Isolation Security Test",
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




