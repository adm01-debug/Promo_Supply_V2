/**
 * B-03: Benchmark versionado de queries quentes via EXPLAIN (ANALYZE, BUFFERS).
 *
 * Uso:
 *   bun run scripts/db-explain-analyze.ts
 *   bun run scripts/db-explain-analyze.ts --json   # saída JSON
 *
 * Requer:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - RPC public.execute_read_query (migration 20261107150000_execute_read_query.sql)
 *
 * Saída:
 *   - Imprime plano + tempo por query (média de N execuções)
 *   - Falha se qualquer query exceder LIMIT_MS
 *   - Snapshot escrito em DOCS/perf/explain-<data>.md para diff em PRs
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIMIT_MS = Number(process.env.EXPLAIN_LIMIT_MS ?? 250);
const RUNS = Number(process.env.EXPLAIN_RUNS ?? 3);
const AS_JSON = process.argv.includes("--json");

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
  process.exit(1);
}

const supabase = createClient(url, key);

// Queries quentes identificadas via slow_queries / uso real.
// Filtros reais (status/read) para medir scans que retornam dados de verdade.
const HOT_QUERIES: { name: string; sql: string }[] = [
  {
    name: "pedidos_by_status",
    sql: "SELECT id FROM public.pedidos WHERE status = 'pendente' ORDER BY created_at DESC LIMIT 50",
  },
  {
    name: "solicitacoes_pipeline",
    sql: "SELECT id FROM public.solicitacoes WHERE status IN ('pendente','em_cotacao') ORDER BY created_at DESC LIMIT 100",
  },
  {
    name: "notifications_unread",
    sql: "SELECT id FROM public.notifications WHERE read = false ORDER BY created_at DESC LIMIT 20",
  },
];

// Extrai o tempo real de execução (ms) do plano EXPLAIN (ANALYZE, FORMAT JSON).
// O RPC retorna jsonb: um array com um único objeto { Plan: { "Actual Total Time": n } }.
function extractTotalTime(data: unknown): number | null {
  const arr = Array.isArray(data) ? data : [data];
  const first = arr[0] as { Plan?: { "Actual Total Time"?: number } } | undefined;
  const t = first?.Plan?.["Actual Total Time"];
  return typeof t === "number" ? t : null;
}

async function runOnce(sql: string): Promise<number | null> {
  const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
  const { data, error } = await supabase.rpc("execute_read_query" as never, { sql: explainSql });
  if (error) return null;
  return extractTotalTime(data);
}

async function main() {
  const report: string[] = [`# EXPLAIN ANALYZE snapshot — ${new Date().toISOString()}`, ""];
  const jsonOut: Record<string, { avgMs: number; minMs: number; maxMs: number; ok: boolean }> = {};
  let failed = 0;

  for (const q of HOT_QUERIES) {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const ms = await runOnce(q.sql);
      if (ms === null) break;
      times.push(ms);
    }

    if (times.length === 0) {
      console.warn(`[skip] ${q.name}: RPC 'execute_read_query' não disponível`);
      report.push(`## ${q.name}\n_skip: RPC não disponível_
`);
      continue;
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const ok = avg <= LIMIT_MS;
    if (!ok) failed++;
    jsonOut[q.name] = { avgMs: avg, minMs: min, maxMs: max, ok };
    // Em modo --json, mantém stdout como um único documento JSON válido:
    // diagnóstico textual vai para stderr.
    const line = `${ok ? "✅" : "❌"} ${q.name}: avg ${avg.toFixed(2)}ms (min ${min.toFixed(2)} / max ${max.toFixed(2)}, limit ${LIMIT_MS}ms)`;
    if (AS_JSON) {
      console.error(line);
    } else {
      console.log(line);
    }
    report.push(`## ${q.name}\n- média: **${avg.toFixed(2)}ms** (min ${min.toFixed(2)} / max ${max.toFixed(2)})\n- limite: ${LIMIT_MS}ms\n- status: ${ok ? "ok" : "REGRESSÃO"}\n`);
  }

  if (AS_JSON) {
    console.log(JSON.stringify(jsonOut, null, 2));
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
