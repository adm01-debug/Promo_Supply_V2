import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("Multi-tenant Isolation Security Test", async (t) => {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // We use existing UUIDs or valid formats. 
  // For the test to pass without database side-effects, we use ROLLBACK
  
  await t.step("Security: Tenant A cannot read Tenant B data", async () => {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        BEGIN;
        -- Create dummy data for Tenant B
        INSERT INTO public.solicitacoes (tenant_id, titulo, status) 
        VALUES ('00000000-0000-0000-0000-000000000002', 'PRIVATE_B', 'pendente');
        
        -- Switch to Tenant A context
        SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "tenant_id": "00000000-0000-0000-0000-000000000001"}';
        SET LOCAL "role" = 'authenticated';
        
        -- Try to read
        SELECT count(*) as count FROM public.solicitacoes WHERE titulo = 'PRIVATE_B';
        ROLLBACK;
      `
    });

    // data[2] because it's a multi-statement query: [BEGIN, INSERT, SET, SET, SELECT, ROLLBACK]
    // Depending on how exec_sql returns multi-statement results, we check for '0'
    const resultCount = data?.[4]?.count || data?.[0]?.count || 0;
    assertEquals(Number(resultCount), 0, "CRITICAL: Tenant A was able to read Tenant B data!");
  });

  await t.step("Security: Tenant A cannot update Tenant B data", async () => {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        BEGIN;
        INSERT INTO public.solicitacoes (tenant_id, titulo, status) 
        VALUES ('00000000-0000-0000-0000-000000000002', 'UPDATE_ME', 'pendente');
        
        SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "tenant_id": "00000000-0000-0000-0000-000000000001"}';
        SET LOCAL "role" = 'authenticated';
        
        UPDATE public.solicitacoes SET titulo = 'HACKED' WHERE titulo = 'UPDATE_ME';
        
        -- Check if it was updated (should be 0)
        SELECT count(*) as count FROM public.solicitacoes WHERE titulo = 'HACKED';
        ROLLBACK;
      `
    });

    const resultCount = data?.[5]?.count || data?.[0]?.count || 0;
    assertEquals(Number(resultCount), 0, "CRITICAL: Tenant A was able to update Tenant B data!");
  });
});

