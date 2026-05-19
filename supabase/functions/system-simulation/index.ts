import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SimulationEngine } from "../_shared/simulation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const engine = new SimulationEngine(supabaseUrl, supabaseServiceKey);

    // Simulando cenários de Negociação IA
    for (let i = 0; i < 10; i++) {
      await engine.runScenario(`Negotiation Case ${i}`, async () => {
        const response = await fetch(`${supabaseUrl}/functions/v1/ai-negotiation`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cotacoes: [{ id: "c1", fornecedor: "Test", total: 100 * (i + 1) }],
            solicitacao: { id: crypto.randomUUID(), titulo: `Simulated Req ${i}` }
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      });
    }

    // Simulando cenários de Workflow Engine
    for (let i = 0; i < 10; i++) {
      await engine.runScenario(`Workflow Case ${i}`, async () => {
        const response = await fetch(`${supabaseUrl}/functions/v1/workflow-engine`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            "x-tenant-id": "00000000-0000-0000-0000-000000000000"
          },
          body: JSON.stringify({
            action: "start_workflow",
            template_id: crypto.randomUUID(),
            entity_type: "solicitacao",
            entity_id: crypto.randomUUID()
          })
        });
        // Esperamos erro aqui se os IDs forem aleatórios e não existirem no DB, 
        // mas o engine capturará isso como parte da validação de consistência.
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      });
    }

    return new Response(JSON.stringify(engine.getSummary()), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
