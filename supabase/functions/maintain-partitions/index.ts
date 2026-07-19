import { corsHeaders, verifyCronSecret } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { recordCronHeartbeat } from "../_shared/cronHealth.ts";

const PARTITIONED_TABLES: Array<{
  table: string;
  aheadMonths: number;
  retainMonths: number;
}> = [
  { table: "audit_logs",     aheadMonths: 3, retainMonths: 24 },
  { table: "telemetry_logs", aheadMonths: 3, retainMonths: 12 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const cronDenied = verifyCronSecret(req);
  if (cronDenied) return cronDenied;

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let logger: EdgeLogger | undefined;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    logger = new EdgeLogger("maintain-partitions", requestId);
    logger.info("Starting partition maintenance...");

    const results: Array<{ table: string; result: unknown; error?: string }> = [];

    for (const cfg of PARTITIONED_TABLES) {
      const { data, error } = await supabase.rpc("maintain_monthly_partitions", {
        p_parent_table:  cfg.table,
        p_ahead_months:  cfg.aheadMonths,
        p_retain_months: cfg.retainMonths,
      });

      if (error) {
        logger.error(`Partition maintenance failed for ${cfg.table}`, { error: error.message });
        results.push({ table: cfg.table, result: null, error: error.message });
      } else {
        logger.info(`Partition maintenance completed for ${cfg.table}`, { result: data });
        results.push({ table: cfg.table, result: data });
      }
    }

    const hasErrors = results.some((r) => r.error);
    logger.info("Partition maintenance finished", { results, hasErrors });

    await recordCronHeartbeat(
      supabase as any,
      "maintain-partitions",
      hasErrors ? results.filter((r) => r.error).map((r) => r.error).join("; ") : undefined,
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: hasErrors ? 207 : 200,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (logger) {
      logger.error("Unhandled error in maintain-partitions", { error: msg });
    } else {
      console.error("Error in maintain-partitions:", error);
    }
    const supabaseForHb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await recordCronHeartbeat(supabaseForHb as any, "maintain-partitions", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
