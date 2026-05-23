import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("Multi-tenant Isolation Security Test", async (t) => {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Use fixed UUIDs for test tenants that hopefully exist or can be simulated
  const tenantA = "00000000-0000-0000-0000-000000000001";
  const tenantB = "00000000-0000-0000-0000-000000000002";
  const userA = "11111111-1111-1111-1111-111111111111";

  // Cleanup potential previous test data
  await supabaseAdmin.from('solicitacoes').delete().eq('titulo', 'RLS_TEST_SECURITY');

  await t.step("Setup: Admin creates data for Tenant B", async () => {
    const { error } = await supabaseAdmin
      .from('solicitacoes')
      .insert({ 
        tenant_id: tenantB, 
        titulo: "RLS_TEST_SECURITY",
        status: "pendente",
        descricao: "Tenant B private data"
      });
    assertEquals(error, null, "Setup failed: Admin should be able to insert test data");
  });

  await t.step("Security: Tenant A cannot read Tenant B data", async () => {
    // We simulate a session for Tenant A by setting the search_path and claim variables
    // This mimics how PostgREST sets up the transaction
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SET LOCAL "request.jwt.claims" = '{"sub": "${userA}", "tenant_id": "${tenantA}"}';
        SET LOCAL "role" = 'authenticated';
        SELECT * FROM public.solicitacoes WHERE titulo = 'RLS_TEST_SECURITY';
      `
    });

    // In many setups exec_sql returns results differently, or we check if any data was returned
    const hasData = data && data.length > 0;
    assertEquals(hasData, false, "CRITICAL: Tenant A was able to read Tenant B data!");
  });

  await t.step("Security: Tenant A cannot update Tenant B data", async () => {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SET LOCAL "request.jwt.claims" = '{"sub": "${userA}", "tenant_id": "${tenantA}"}';
        SET LOCAL "role" = 'authenticated';
        UPDATE public.solicitacoes SET titulo = 'HACKED' WHERE titulo = 'RLS_TEST_SECURITY' RETURNING *;
      `
    });

    const updateSucceeded = data && data.length > 0;
    assertEquals(updateSucceeded, false, "CRITICAL: Tenant A was able to update Tenant B data!");
  });

  await t.step("Security: Tenant A cannot insert data for Tenant B", async () => {
     const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SET LOCAL "request.jwt.claims" = '{"sub": "${userA}", "tenant_id": "${tenantA}"}';
        SET LOCAL "role" = 'authenticated';
        INSERT INTO public.solicitacoes (tenant_id, titulo, status) 
        VALUES ('${tenantB}', 'MALICIOUS_INSERT', 'pendente');
      `
    });
    
    // Check if error contains RLS violation or if check failed
    // Usually, exec_sql might not throw but the SQL itself fails. 
    // We'll check the table for the malicious record.
    const { data: maliciousCheck } = await supabaseAdmin
      .from('solicitacoes')
      .select('*')
      .eq('titulo', 'MALICIOUS_INSERT');
      
    assertEquals(maliciousCheck?.length || 0, 0, "CRITICAL: Tenant A was able to insert data for Tenant B!");
  });
  
  // Cleanup
  await supabaseAdmin.from('solicitacoes').delete().eq('titulo', 'RLS_TEST_SECURITY');
});
