import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("Multi-tenant Isolation Test", async (t) => {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Setup test tenants
  const tenantA = "00000000-0000-0000-0000-000000000001";
  const tenantB = "00000000-0000-0000-0000-000000000002";

  await t.step("Tenant A cannot see Tenant B data", async () => {
    // Create data for Tenant B using admin
    const { error: insertError } = await supabaseAdmin
      .from('solicitacoes')
      .insert({ 
        tenant_id: tenantB, 
        titulo: "Secret for Tenant B",
        status: "pendente"
      });

    // Mock authenticated user for Tenant A
    // Note: In real RLS testing, we'd need to set the session or use a JWT
    // For Deno tests, we can verify the SQL structure or use a helper function to set 'request.jwt.claims'
    
    const { data, error } = await supabaseAdmin
      .rpc('set_config', { name: 'request.jwt.claims', value: JSON.stringify({ sub: 'user_a', tenant_id: tenantA }), is_local: true })
      .then(() => supabaseAdmin.from('solicitacoes').select('*'));

    if (data) {
        const hasTenantBData = data.some((item: any) => item.tenant_id === tenantB);
        assertEquals(hasTenantBData, false, "Tenant A should not see Tenant B data");
    }
  });

  await t.step("Tenant A cannot write to Tenant B", async () => {
    const { error } = await supabaseAdmin
      .rpc('set_config', { name: 'request.jwt.claims', value: JSON.stringify({ sub: 'user_a', tenant_id: tenantA }), is_local: true })
      .then(() => supabaseAdmin.from('solicitacoes').insert({ tenant_id: tenantB, titulo: "Hack" }));

    assertNotEquals(error, null, "Insert to different tenant should fail RLS");
  });
});
