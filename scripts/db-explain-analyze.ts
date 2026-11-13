/**
 * B-03: Benchmark versionado de queries quentes via EXPLAIN (ANALYZE, BUFFERS).
 *
 * Uso:
 *   SUPABASE_DB_URL=... bun run scripts/db-explain-analyze.ts [--json] [--out <dir>] [--no-snapshot]
 *   (roda igual com `node scripts/db-explain-analyze.ts` — sem dependência de npm; precisa de `psql`)
 *
 * Ambiente:
 *   - SUPABASE_DB_URL     conexão direta/pooler do projeto oficial (mesmo secret do types-sync)
 *   - EXPLAIN_LIMIT_MS    limite por query, mediana (padrão 250)
 *   - EXPLAIN_RUNS        execuções por query (padrão 3; a mediana descarta o cache frio)
 *
 * Saída:
 *   - tempo por query (mín / mediana / máx) e exit 1 se alguma mediana passar do limite
 *   - snapshot em DOCS/perf/explain-<data>.md para diff em PRs
 *
 * Por que `psql` e não RPC: a versão anterior chamava a RPC `execute_read_query`, que não existe
 * no banco — toda query virava "[skip]" e o script saía 0 sem medir nada. Criar essa RPC seria
 * expor `EXECUTE` de SQL arbitrário em SECURITY DEFINER. Aqui cada EXPLAIN roda por `psql` dentro
 * de `BEGIN TRANSACTION READ ONLY` (`scripts/lib/psql-leitura.mjs`): o ANALYZE executa a query,
 * mas o banco recusa qualquer escrita. Query que falha conta como ERRO (exit 1), nunca como skip.
 *
 * Exit: 0 = todas dentro do limite · 1 = regressão, erro de query ou sem conexão · 2 = uso.
 */
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { consultarJson, exigirComandoUnico, montarAmbientePsql } from "./lib/psql-leitura.mjs";

export interface HotQuery {
  name: string;
  sql: string;
}

// Queries quentes do app. O filtro por tenant é o que o RLS aplica em toda leitura real
// (`tenant_id` existe nas três tabelas — conferido em src/integrations/supabase/types.ts); o
// subselect pega um tenant existente para o plano medir dado de verdade. Tabela vazia = 0 linhas.
export const HOT_QUERIES: HotQuery[] = [
  {
    name: "pedidos_by_tenant_status",
    sql: "SELECT id FROM public.pedidos WHERE tenant_id = (SELECT tenant_id FROM public.pedidos LIMIT 1) AND status = 'pendente' ORDER BY created_at DESC LIMIT 50",
  },
  {
    name: "solicitacoes_pipeline",
    sql: "SELECT id FROM public.solicitacoes WHERE tenant_id = (SELECT tenant_id FROM public.solicitacoes LIMIT 1) AND status IN ('pendente','em_cotacao') ORDER BY created_at DESC LIMIT 100",
  },
  {
    name: "notifications_unread",
    sql: "SELECT id FROM public.notifications WHERE user_id = (SELECT user_id FROM public.notifications LIMIT 1) AND read IS NOT TRUE ORDER BY created_at DESC LIMIT 20",
  },
];

/** Tempo de execução (ms) de um plano `EXPLAIN (ANALYZE, FORMAT JSON)`; `null` se não houver. */
export function extrairTempoMs(plano: unknown): number | null {
  const primeiro = (Array.isArray(plano) ? plano[0] : plano) as
    | { "Execution Time"?: unknown; Plan?: { "Actual Total Time"?: unknown } }
    | undefined;
  const t = primeiro?.["Execution Time"] ?? primeiro?.Plan?.["Actual Total Time"];
  return typeof t === "number" && Number.isFinite(t) && t >= 0 ? t : null;
}

export function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/** Inteiro positivo vindo de env/flag; valor inválido é erro de uso, não vira NaN silencioso. */
export function inteiroPositivo(valor: string | undefined, padrao: number, rotulo: string): number {
  if (valor === undefined || valor.trim() === "") return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${rotulo} inválido: "${valor}" (esperado número > 0)`);
  return n;
}

export interface Medicao {
  name: string;
  ok: boolean;
  erro?: string;
  runs: number[];
  minMs?: number;
  medianMs?: number;
  maxMs?: number;
}

export function medir(
  queries: HotQuery[],
  explicar: (sql: string) => unknown,
  { runs, limitMs }: { runs: number; limitMs: number },
): Medicao[] {
  return queries.map((q) => {
    const tempos: number[] = [];
    try {
      const sql = exigirComandoUnico(q.sql);
      for (let i = 0; i < runs; i++) {
        const ms = extrairTempoMs(explicar(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`));
        if (ms === null) throw new Error("plano sem tempo de execução");
        tempos.push(ms);
      }
    } catch (e) {
      return { name: q.name, ok: false, erro: (e as Error).message, runs: tempos };
    }
    const med = mediana(tempos);
    return { name: q.name, ok: med <= limitMs, runs: tempos, minMs: Math.min(...tempos), medianMs: med, maxMs: Math.max(...tempos) };
  });
}

export function montarRelatorio(medicoes: Medicao[], limitMs: number, agora: Date): string {
  const linhas = [`# EXPLAIN ANALYZE snapshot — ${agora.toISOString()}`, ""];
  for (const m of medicoes) {
    linhas.push(`## ${m.name}`);
    if (m.erro) linhas.push(`- status: ERRO`, `- motivo: ${m.erro}`, "");
    else {
      linhas.push(
        `- mediana: **${m.medianMs!.toFixed(2)}ms** (mín ${m.minMs!.toFixed(2)} / máx ${m.maxMs!.toFixed(2)}, ${m.runs.length} execuções)`,
        `- limite: ${limitMs}ms`,
        `- status: ${m.ok ? "ok" : "REGRESSÃO"}`,
        "",
      );
    }
  }
  return linhas.join("\n");
}

interface Opcoes {
  json: boolean;
  snapshot: boolean;
  out: string;
  ajuda: boolean;
}

export function lerArgs(argv: string[]): Opcoes {
  const o: Opcoes = { json: false, snapshot: true, out: path.join("DOCS", "perf"), ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--no-snapshot") o.snapshot = false;
    else if (a === "--help" || a === "-h") o.ajuda = true;
    else if (a === "--out") {
      const v = argv[++i];
      if (!v) throw new Error("--out exige um diretório");
      o.out = v;
    } else throw new Error(`argumento desconhecido: ${a}`);
  }
  return o;
}

const AJUDA = `Uso: SUPABASE_DB_URL=... bun run scripts/db-explain-analyze.ts [--json] [--out <dir>] [--no-snapshot]
  --json         imprime as medições como um único documento JSON no stdout
  --out <dir>    onde gravar explain-<data>.md (padrão: DOCS/perf)
  --no-snapshot  não grava o arquivo
  env: EXPLAIN_LIMIT_MS (250), EXPLAIN_RUNS (3)`;

export function principal(argv: string[], env: Record<string, string | undefined>): number {
  let o: Opcoes;
  let limitMs: number;
  let runs: number;
  try {
    o = lerArgs(argv);
    limitMs = inteiroPositivo(env.EXPLAIN_LIMIT_MS, 250, "EXPLAIN_LIMIT_MS");
    runs = Math.floor(inteiroPositivo(env.EXPLAIN_RUNS, 3, "EXPLAIN_RUNS"));
    if (runs < 1) throw new Error("EXPLAIN_RUNS inválido: mínimo 1");
  } catch (e) {
    console.error(`❌ ${(e as Error).message}\n${AJUDA}`);
    return 2;
  }
  if (o.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  const diga = o.json ? console.error : console.log;

  let ambiente: ReturnType<typeof montarAmbientePsql>;
  try {
    ambiente = montarAmbientePsql(env.SUPABASE_DB_URL ?? "", { refEsperado: env.VITE_SUPABASE_PROJECT_ID?.trim() || undefined });
  } catch (e) {
    console.error(`❌ db-explain-analyze: ${(e as Error).message}`);
    return 1;
  }

  const medicoes = medir(HOT_QUERIES, (sql) => consultarJson(sql, ambiente), { runs, limitMs });

  for (const m of medicoes) {
    if (m.erro) diga(`❌ ${m.name}: ERRO — ${m.erro}`);
    else {
      diga(
        `${m.ok ? "✅" : "❌"} ${m.name}: mediana ${m.medianMs!.toFixed(2)}ms ` +
          `(mín ${m.minMs!.toFixed(2)} / máx ${m.maxMs!.toFixed(2)}, limite ${limitMs}ms)`,
      );
    }
  }

  if (o.snapshot) {
    const agora = new Date();
    const arquivo = path.join(o.out, `explain-${agora.toISOString().slice(0, 10)}.md`);
    try {
      mkdirSync(o.out, { recursive: true });
      writeFileSync(arquivo, montarRelatorio(medicoes, limitMs, agora));
      diga(`📝 snapshot: ${arquivo}`);
    } catch (e) {
      console.error(`❌ não foi possível gravar ${arquivo}: ${(e as Error).message}`);
      return 1;
    }
  }

  if (o.json) console.log(JSON.stringify({ limitMs, runs, queries: medicoes }, null, 2));

  const erros = medicoes.filter((m) => m.erro).length;
  const regressoes = medicoes.filter((m) => !m.erro && !m.ok).length;
  if (erros > 0 || regressoes > 0) {
    console.error(`\n${regressoes} query(ies) acima de ${limitMs}ms, ${erros} com erro.`);
    return 1;
  }
  return 0;
}

const ehPrincipal = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();

if (ehPrincipal) process.exit(principal(process.argv.slice(2), process.env));
