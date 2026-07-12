import { corsHeaders, requireAdmin } from "../_shared/security.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SimulationEngine } from "../_shared/simulation-engine.ts";
import { ContractValidator, NegotiationContract, WorkflowContract, ERPSyncContract } from "../_shared/contracts.ts";
import { PayloadFuzzer } from "../_shared/fuzzer.ts";
import { EdgeLogger } from "../_shared/logger.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // A-02: guarda dupla (JWT + role admin) — simulação impacta o banco.
  const guard = await requireAdmin(req);
  if (guard.response) return guard.response;

  const logger = new EdgeLogger("system-simulation");
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const engine = new SimulationEngine(supabaseUrl, supabaseServiceKey);

    const { 
      iterations = 100, 
      scenarios = ["negotiation", "workflow", "erp"], 
      validate_contracts = true,
      mode = "normal" // "normal" or "fuzz"
    } = await req.json().catch(() => ({}));

    const runBatch = async (scenarioType: string) => {
      // Define baseline valid payloads
      let baselinePayload: any = {};
      let schema: any = null;
      let endpoint = "";

      switch (scenarioType) {
        case "negotiation":
          endpoint = "ai-negotiation";
          baselinePayload = {
            cotacoes: [{ id: crypto.randomUUID(), fornecedor: "Standard Supplier", total: 1500.50 }],
            solicitacao: { id: crypto.randomUUID(), titulo: "Standard Request" }
          };
          schema = NegotiationContract;
          break;
        case "workflow":
          endpoint = "workflow-engine";
          baselinePayload = {
            action: "approve_step",
            entity_id: crypto.randomUUID(),
            instance_id: crypto.randomUUID(),
            node_id: crypto.randomUUID(),
            decision: 'approve'
          };
          schema = WorkflowContract;
          break;
        case "erp":
          endpoint = "erp-sync";
          baselinePayload = { operation: "sync_po", po_number: "PO-001", source: "sap" };
          schema = ERPSyncContract;
          break;
      }

      const payloadsToTest = mode === "fuzz" 
        ? PayloadFuzzer.generateMutations(schema, baselinePayload)
        : Array(iterations).fill(null).map((_, i) => {
            // Randomize slightly for normal mode
            const p = JSON.parse(JSON.stringify(baselinePayload));
            if (p.po_number) p.po_number = `PO-${i}`;
            return { type: "normal", payload: p };
          });

      for (const item of payloadsToTest) {
        await engine.runScenario(`${scenarioType.toUpperCase()} ${item.type}`, async () => {
          const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
            method: "POST",
            headers: {
              // M-02: service_role bypassa RLS; tenant fica implícito no payload/RPC alvo.
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(item.payload)
          });
          
          const result = response.status === 200 || response.status === 201 
            ? await response.json() 
            : { error: true, status: response.status, text: await response.text() };

          // In fuzz mode, 400 is a "success" (expected rejection), 500 is a failure (unhandled exception)
          if (mode === "fuzz" && response.status === 500) {
            throw new Error(`CRITICAL: Unhandled exception on ${item.type} payload`);
          }

          if (mode === "normal" && !response.ok && response.status !== 404) {
             throw new Error(`HTTP ${response.status} failure`);
          }

          return result;
        });
      }
    };

    await Promise.all(scenarios.map(s => runBatch(s)));

    const summary = engine.getSummary();
    logger.info(`Simulation completed in ${mode} mode`, { summary });

    return new Response(JSON.stringify({
      message: `System simulation (${mode} mode) with contract validation completed`,
      summary
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("Simulation failed", { error: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
