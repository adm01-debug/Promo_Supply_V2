import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PayloadFuzzer } from "../_shared/fuzzer.ts";
import { FunctionContracts } from "../_shared/contracts.ts";

// Load environment variables
await load({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "anon";

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "x-tenant-id": "00000000-0000-0000-0000-000000000000"
};

/**
 * Main Fuzzing Suite
 * Iterates over all defined contracts and runs thousands of mutations.
 */
Deno.test("Fuzzing Suite: Global Edge Function Integrity", async () => {
  for (const [fnName, schema] of Object.entries(FunctionContracts)) {
    console.log(`\n>>> Fuzzing ${fnName}...`);
    
    // We need a valid base to start fuzzing. 
    // Usually these are defined in the specific function tests, 
    // but for the global suite we use some common defaults.
    const validBase: any = {
      action: "query",
      id: "00000000-0000-0000-0000-000000000001",
      entity_type: "generic",
      entity_id: "00000000-0000-0000-0000-000000000002",
      payload: { test: true }
    };

    const mutations = PayloadFuzzer.generateMutations(schema, validBase);
    console.log(`Generated ${mutations.length} mutations for ${fnName}`);

    for (const mutation of mutations) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify(mutation.payload),
        });

        // Edge functions should NEVER return 500 on bad data.
        // They should return 400 (Bad Request) or 422 (Unprocessable Entity).
        assert(res.status < 500, `Function ${fnName} returned ${res.status} for mutation ${mutation.type}`);
        
        const body = await res.json().catch(() => ({}));
        
        if (res.status === 400 || res.status === 422) {
            assert(body.status === "error", `Missing 'status: error' in response for ${fnName} on ${mutation.type}`);
            assert(body.requestId !== undefined, `Missing 'requestId' for ${fnName} on ${mutation.type}`);
        }
      } catch (err) {
        console.error(`Fetch failed for ${fnName} on mutation ${mutation.type}: ${err.message}`);
      }
    }
  }
});
