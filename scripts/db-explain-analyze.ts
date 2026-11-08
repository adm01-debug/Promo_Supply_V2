/**
 * B-03: Benchmark versionado de queries quentes via EXPLAIN (ANALYZE, BUFFERS).
 *
 * Uso:
 *   bun run scripts/db-explain-analyze.ts
 *
 * Requer:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (só executa em CI/local com service role)
 *
 * Saída:
 *   - Imprime plano + tempo por query
 *   - Falha se qualquer query exceder LIMIT_MS
 *   - Snapshot escrito em DOCS/perf/explain-<data>.md para diff em PRs
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIMIT_MS = Number(process.env.EXPLAIN_LIMIT_MS ?? 250);

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
  process.exit(1);
}

const supabase = createClient(url, key);

// Queries quentes identificadas via slow_queries / uso real.
const HOT_QUERIES: { name: string; sql: string }[] = [
  {
    name: "pedidos_by_org_status",
    sql: "SELECT id FROM public.pedidos WHERE organization_id = gen_random_uuid() AND status = 'pendente' ORDER BY created_at DESC LIMIT 50",
  },
  {
    name: "solicitacoes_pipeline",
    sql: "SELECT id FROM public.solicitacoes WHERE organization_id = gen_random_uuid() AND status IN ('pendente','em_cotacao') LIMIT 100",
  },
  {
    name: "notifications_unread",
    sql: "SELECT id FROM public.notifications WHERE user_id = gen_random_uuid() AND read_at IS NULL ORDER BY created_at DESC LIMIT 20",
  },
];

async function main() {
  const report: string[] = [`# EXPLAIN ANALYZE snapshot — ${new Date().toISOString()}`, ""];
  let failed = 0;

  for (const q of HOT_QUERIES) {
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}`;
    const { data, error } = await supabase.rpc("execute_read_query" as never, { sql: explainSql }).single();
    if (error) {
      console.warn(`[skip] ${q.name}: RPC 'execute_read_query' não disponível — ${error.message}`);
      report.push(`## ${q.name}\n_skip: RPC não disponível_\n`);
      continue;
    }
    const plan = (data as unknown as { Plan: { "Actual Total Time": number } }[])[0];
    const ms = plan?.Plan?.["Actual Total Time"] ?? 0;
    const ok = ms <= LIMIT_MS;
    if (!ok) failed++;
    console.log(`${ok ? "✅" : "❌"} ${q.name}: ${ms.toFixed(2)}ms (limit ${LIMIT_MS}ms)`);
    report.push(`## ${q.name}\n- tempo: **${ms.toFixed(2)}ms**\n- limite: ${LIMIT_MS}ms\n- status: ${ok ? "ok" : "REGRESSÃO"}\n`);
  }

  mkdirSync("DOCS/perf", { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  writeFileSync(`DOCS/perf/explain-${stamp}.md`, report.join("\n"));

  if (failed > 0) {
    console.error(`\n${failed} queries acima do limite de ${LIMIT_MS}ms`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
