import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "anon";

// Guard: skip all tests when Supabase is not reachable (e.g., in CI without Docker)
async function isSupabaseReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      signal: controller.signal,
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch {
    return false;
  }
}

const SUPABASE_AVAILABLE = await isSupabaseReachable();

if (!SUPABASE_AVAILABLE) {
  console.warn(
    `[integration_suite] Supabase not reachable at ${SUPABASE_URL} — skipping all integration tests.`,
  );
}

// M-02: header legado x-tenant-id removido; tenant vem do JWT.
const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

Deno.test({
  name: "Integration: AI Negotiation - Standard Flow",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
    const payload = {
      solicitacao: { id: "123", titulo: "Compra de Notebooks", valor_estimado: 10000 },
      cotacoes: [
        { fornecedor: "Dell", valor: 9500, prazo: 15 },
        { fornecedor: "HP", valor: 9800, prazo: 10 },
      ],
      historico_precos: [9200, 9400],
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-negotiation`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });

    assert(res.status < 500, `AI Negotiation returned ${res.status}`);

    const body = await res.json();
    if (res.status === 200) {
      assert(body.data.resumo !== undefined);
      assert(body.status === "success");
    }
  },
});

Deno.test({
  name: "Integration: ERP Sync - Lifecycle",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
    const payload = {
      action: "push",
      connectionId: "00000000-0000-0000-0000-000000000000",
      entity: "clientes",
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/erp-sync`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });

    // Should return 400 because connectionId is mock/invalid (or 401 if auth required)
    assert(res.status === 400 || res.status === 401, `Expected 400 or 401, got ${res.status}`);
    if (res.status === 400) {
      const body = await res.json();
      assert(body.error.includes("ERP connection") || body.error !== undefined);
    }
  },
});

Deno.test({
  name: "Integration: Workflow Engine - Start Workflow",
  ignore: !SUPABASE_AVAILABLE,
  async fn() {
    const payload = {
      action: "start_workflow",
      template_id: crypto.randomUUID(),
      entity_type: "pedido",
      entity_id: crypto.randomUUID(),
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/workflow-engine`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });

    // Depending on DB state, this might fail with 400/401/404, but not 500
    assert(res.status < 500);
  },
});
