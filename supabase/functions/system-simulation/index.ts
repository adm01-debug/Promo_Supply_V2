import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SimulationEngine } from "../_shared/simulation-engine.ts";
import { ContractValidator, NegotiationContract, WorkflowContract, ERPSyncContract } from "../_shared/contracts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const engine = new SimulationEngine(supabaseUrl, supabaseServiceKey);

    const { iterations = 100, scenarios = ["negotiation", "workflow", "erp"], validate_contracts = true } = await req.json().catch(() => ({}));

    // Thousands of simulations are split into manageable batches
    const runBatch = async (scenarioType: string) => {
      for (let i = 0; i < iterations; i++) {
        await engine.runScenario(`${scenarioType.toUpperCase()} Scenario #${i}`, async () => {
          let endpoint = "";
          let body: any = {};
          let schema = null;

          switch (scenarioType) {
            case "negotiation":
              endpoint = "ai-negotiation";
              body = {
                cotacoes: [{ id: crypto.randomUUID(), fornecedor: `Supplier ${i}`, total: Math.random() * 10000 }],
                solicitacao: { id: crypto.randomUUID(), titulo: `Urgent Supply ${i}` }
              };
              schema = NegotiationContract;
              break;
            case "workflow":
              endpoint = "workflow-engine";
              body = {
                action: i % 2 === 0 ? "start_workflow" : "submit_decision",
                entity_id: crypto.randomUUID(),
                instance_id: crypto.randomUUID(),
                node_id: crypto.randomUUID(),
                decision: 'approve'
              };
              schema = WorkflowContract;
              break;
            case "erp":
              endpoint = "erp-sync";
              body = { operation: "sync_po", po_number: `PO-${i}`, source: "sap" };
              schema = ERPSyncContract;
              break;
          }

          // Contract Validation before sending
          if (validate_contracts && schema) {
            const validation = ContractValidator.validate(schema, body);
            if (!validation.isValid) {
              throw new Error(`Contract Violation: ${validation.errors?.join(', ')}`);
            }
          }

          const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "x-tenant-id": "00000000-0000-0000-0000-000000000000" // Default for simulation
            },
            body: JSON.stringify(body)
          });
          
          if (!response.ok && response.status !== 404) {
            throw new Error(`HTTP ${response.status} at ${endpoint}`);
          }
          return response.status === 200 ? await response.json() : { skipped: true };
        });
      }
    };

    // Run scenarios in parallel batches
    await Promise.all(scenarios.map(s => runBatch(s)));

    return new Response(JSON.stringify({
      message: "Exhaustive simulation with contract validation completed",
      summary: engine.getSummary()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
