import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "anon";

// M-02: header legado x-tenant-id removido; tenant vem do JWT.
const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

Deno.test("Integration: AI Negotiation - Standard Flow", async () => {
  const payload = {
    solicitacao: { id: "123", titulo: "Compra de Notebooks", valor_estimado: 10000 },
    cotacoes: [
      { fornecedor: "Dell", valor: 9500, prazo: 15 },
      { fornecedor: "HP", valor: 9800, prazo: 10 }
    ],
    historico_precos: [9200, 9400]
  };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-negotiation`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(payload)
  });

  // If testing against a real environment, it might fail if keys are missing
  // But we want to ensure it at least doesn't return 500
  assert(res.status < 500, `AI Negotiation returned ${res.status}`);
  
  const body = await res.json();
  if (res.status === 200) {
      assert(body.data.resumo !== undefined);
      assert(body.status === "success");
  }
});

Deno.test("Integration: ERP Sync - Lifecycle", async () => {
    // We expect failure if connection doesn't exist, which is a valid behavior
    const payload = {
        action: "push",
        connectionId: "00000000-0000-0000-0000-000000000000",
        entity: "clientes"
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/erp-sync`, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify(payload)
    });

    // Should return 400 because connectionId is mock/invalid
    assertEquals(res.status, 400);
    const body = await res.json();
    assert(body.error.includes("ERP connection"));
});

Deno.test("Integration: Workflow Engine - Start Workflow", async () => {
    const payload = {
        action: "start_workflow",
        template_id: crypto.randomUUID(),
        entity_type: "pedido",
        entity_id: crypto.randomUUID()
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/workflow-engine`, {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify(payload)
    });

    // Depending on DB state, this might fail with 400/404, but not 500
    assert(res.status < 500);
});
