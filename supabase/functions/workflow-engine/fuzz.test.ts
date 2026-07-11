
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PayloadFuzzer } from "../_shared/fuzzer.ts";
import { WorkflowContract } from "../_shared/contracts.ts";

await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/workflow-engine`;

// M-02: header legado x-tenant-id removido. Tenant é resolvido via JWT (user_tenants).
const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

Deno.test("Fuzzing: Workflow Engine rejects malformed payloads", async () => {
  const validBase = {
    action: "start_workflow",
    template_id: "00000000-0000-0000-0000-000000000001",
    entity_type: "pedido",
    entity_id: "00000000-0000-0000-0000-000000000002"
  };


  // @ts-ignore
  const mutations = PayloadFuzzer.generateMutations(WorkflowContract, validBase);

  for (const mutation of mutations) {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(mutation.payload),
    });

    const body = await res.json();
    
    // Devem falhar com 400 (Validation Error)
    assertEquals(res.status, 400, `Mutation ${mutation.type} should fail with 400`);
    assert(body.error.startsWith("Validation error"), `Error message for ${mutation.type} should be validation error`);
    assertEquals(body.status, "error");
    assert(body.requestId !== undefined);
  }
});

Deno.test("Security: Workflow Engine rejects unauthenticated requests", async () => {
  // M-02: sem JWT válido, o tenant não pode ser resolvido → 401.
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      // Missing Authorization
    },
    body: JSON.stringify({
      action: "start_workflow",
      template_id: crypto.randomUUID(),
      entity_type: "pedido",
      entity_id: crypto.randomUUID()
    }),
  });

  const body = await res.json().catch(() => ({}));
  assert(
    [400, 401, 403].includes(res.status),
    `Should reject unauthenticated request (got ${res.status})`
  );
  assertEquals(body.status ?? "error", "error");
});

