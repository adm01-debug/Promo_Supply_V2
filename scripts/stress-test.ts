/**
 * Stress Test Script for Freight Quest Edge Functions
 * Simulates concurrent traffic and measures performance metrics.
 *
 * Uso:
 *   bun run scripts/stress-test.ts [--endpoint <url>] [--concurrency 50] [--requests 500]
 *                                  [--timeout-ms 15000] [--max-failure-rate 5] [--json] [--confirm]
 *   (roda igual com `node scripts/stress-test.ts`; sem dependência de npm)
 *
 * ATENÇÃO: o `.env` deste repo está versionado e aponta para PRODUÇÃO, e o bun o carrega sozinho.
 * Por isso qualquer endpoint que não seja loopback só dispara com `--confirm` — sem a flag o script
 * sai 2 sem enviar nenhuma requisição.
 *
 * Como ler o resultado: o teste roda como anon (M-02), então 401/403 é a resposta esperada e NÃO é
 * falha. Falha de infra = erro de rede/timeout ou HTTP 5xx. 429 é contado à parte (rate limit agindo).
 * Se 100% das respostas forem 401/403, o relatório avisa que só o gateway de autenticação foi medido.
 *
 * Exit: 0 = dentro do limite · 1 = taxa de falha acima do limite ou nenhuma resposta · 2 = uso.
 */
import { realpathSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

export interface Opcoes {
  endpoint: string;
  concurrency: number;
  requests: number;
  timeoutMs: number;
  maxFailureRate: number;
  confirm: boolean;
  json: boolean;
  ajuda: boolean;
}

export interface Resultado {
  status: number;
  latency: number;
  error?: string;
}

export type Classe = "ok" | "auth" | "rate_limited" | "server_error" | "network";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function ehLoopback(endpoint: string): boolean {
  try {
    return LOOPBACK.has(new URL(endpoint).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function numero(valor: string | undefined, rotulo: string, { inteiro, min, max }: { inteiro: boolean; min: number; max: number }): number {
  const n = Number(valor);
  if (valor === undefined || valor.trim() === "" || !Number.isFinite(n) || (inteiro && !Number.isInteger(n)) || n < min || n > max) {
    throw new Error(`${rotulo} inválido: "${valor ?? ""}" (esperado ${inteiro ? "inteiro" : "número"} entre ${min} e ${max})`);
  }
  return n;
}

export function lerArgs(argv: string[], env: Record<string, string | undefined>): Opcoes {
  const o: Opcoes = {
    endpoint: env.VITE_SUPABASE_URL
      ? `${env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/workflow-engine`
      : "http://localhost:54321/functions/v1/workflow-engine",
    concurrency: 50,
    requests: 500,
    timeoutMs: 15_000,
    maxFailureRate: 5,
    confirm: false,
    json: false,
    ajuda: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => argv[++i];
    if (a === "--confirm") o.confirm = true;
    else if (a === "--json") o.json = true;
    else if (a === "--help" || a === "-h") o.ajuda = true;
    else if (a === "--endpoint") o.endpoint = valor() ?? "";
    else if (a === "--concurrency") o.concurrency = numero(valor(), "--concurrency", { inteiro: true, min: 1, max: 1000 });
    else if (a === "--requests") o.requests = numero(valor(), "--requests", { inteiro: true, min: 1, max: 100_000 });
    else if (a === "--timeout-ms") o.timeoutMs = numero(valor(), "--timeout-ms", { inteiro: true, min: 100, max: 600_000 });
    else if (a === "--max-failure-rate") o.maxFailureRate = numero(valor(), "--max-failure-rate", { inteiro: false, min: 0, max: 100 });
    else throw new Error(`argumento desconhecido: ${a}`);
  }
  let url: URL;
  try {
    url = new URL(o.endpoint);
  } catch {
    throw new Error(`--endpoint inválido: "${o.endpoint}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`--endpoint precisa ser http(s): "${o.endpoint}"`);
  o.concurrency = Math.min(o.concurrency, o.requests);
  return o;
}

export function classificar(status: number): Classe {
  if (status === 0) return "network";
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "ok";
}

/** Percentil nearest-rank sobre lista JÁ ordenada; lista vazia devolve 0. */
export function percentil(ordenado: number[], p: number): number {
  if (ordenado.length === 0) return 0;
  const idx = Math.min(ordenado.length - 1, Math.max(0, Math.ceil(p * ordenado.length) - 1));
  return ordenado[idx];
}

export interface Resumo {
  total: number;
  porClasse: Record<Classe, number>;
  porStatus: Record<string, number>;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  failures: number;
  failureRate: number;
  soAuth: boolean;
  aprovado: boolean;
}

export function resumir(resultados: Resultado[], maxFailureRate: number): Resumo {
  const porClasse: Record<Classe, number> = { ok: 0, auth: 0, rate_limited: 0, server_error: 0, network: 0 };
  const porStatus: Record<string, number> = {};
  for (const r of resultados) {
    porClasse[classificar(r.status)]++;
    porStatus[String(r.status)] = (porStatus[String(r.status)] ?? 0) + 1;
  }
  const lat = resultados.map((r) => r.latency).sort((a, b) => a - b);
  const total = resultados.length;
  const failures = porClasse.network + porClasse.server_error;
  const failureRate = total === 0 ? 100 : (failures / total) * 100;
  return {
    total,
    porClasse,
    porStatus,
    avgMs: total === 0 ? 0 : lat.reduce((a, b) => a + b, 0) / total,
    p50Ms: percentil(lat, 0.5),
    p95Ms: percentil(lat, 0.95),
    p99Ms: percentil(lat, 0.99),
    maxMs: lat[lat.length - 1] ?? 0,
    failures,
    failureRate,
    soAuth: total > 0 && porClasse.auth === total,
    // Zero respostas nunca é "estável": não houve teste.
    aprovado: total > 0 && failureRate <= maxFailureRate,
  };
}

// M-02: header x-tenant-id removido; stress test roda como anon (rejeição esperada é parte da métrica).
const payload = {
  action: "start_workflow",
  template_id: "00000000-0000-0000-0000-000000000001",
  entity_type: "pedido",
  entity_id: "00000000-0000-0000-0000-000000000002",
};

async function runRequest(o: Opcoes, headers: Record<string, string>): Promise<Resultado> {
  const start = performance.now();
  try {
    const res = await fetch(o.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(o.timeoutMs),
    });
    await res.arrayBuffer().catch(() => undefined); // drena o corpo para liberar a conexão
    return { status: res.status, latency: performance.now() - start };
  } catch (error) {
    const e = error as { name?: string; message?: string; cause?: { code?: string } };
    return { status: 0, latency: performance.now() - start, error: e?.name === "TimeoutError" ? "timeout" : e?.cause?.code ?? e?.message ?? "erro" };
  }
}

export async function executar(o: Opcoes, anonKey: string): Promise<Resultado[]> {
  const headers = { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const resultados: Resultado[] = [];
  let restantes = o.requests;
  const workers = Array.from({ length: o.concurrency }, async () => {
    while (restantes > 0) {
      restantes--;
      resultados.push(await runRequest(o, headers));
    }
  });
  await Promise.all(workers);
  return resultados;
}

const AJUDA = `Uso: bun run scripts/stress-test.ts [opções]
  --endpoint <url>          alvo (padrão: $VITE_SUPABASE_URL/functions/v1/workflow-engine ou localhost:54321)
  --concurrency <n>         requisições simultâneas (padrão 50)
  --requests <n>            total de requisições (padrão 500)
  --timeout-ms <n>          tempo máximo por requisição (padrão 15000)
  --max-failure-rate <pct>  limite de falha de infra em % (padrão 5)
  --confirm                 obrigatório para endpoint que não seja localhost (ex.: produção)
  --json                    imprime o resumo como um único documento JSON no stdout`;

export async function principal(argv: string[], env: Record<string, string | undefined>): Promise<number> {
  let o: Opcoes;
  try {
    o = lerArgs(argv, env);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}\n${AJUDA}`);
    return 2;
  }
  if (o.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  const diga = o.json ? console.error : console.log;

  if (!ehLoopback(o.endpoint) && !o.confirm) {
    console.error(`⚠️  ${new URL(o.endpoint).host} não é localhost: ${o.requests} requisições iriam para um ambiente real.`);
    console.error("   Nada foi enviado. Repita com --confirm se for isso mesmo.");
    return 2;
  }

  diga(`🚀 Starting Stress Test on ${o.endpoint}`);
  diga(`Concurrency: ${o.concurrency} | Total Requests: ${o.requests} | Timeout: ${o.timeoutMs}ms`);

  const inicio = performance.now();
  const resultados = await executar(o, env.VITE_SUPABASE_PUBLISHABLE_KEY || "anon");
  const duracaoS = (performance.now() - inicio) / 1000;
  const r = resumir(resultados, o.maxFailureRate);

  if (o.json) console.log(JSON.stringify({ endpoint: o.endpoint, durationS: duracaoS, ...r }, null, 2));

  diga("\n📊 Stress Test Results:");
  diga(`- Requests: ${r.total} em ${duracaoS.toFixed(2)}s (${(r.total / Math.max(duracaoS, 0.001)).toFixed(1)} req/s)`);
  diga(`- Avg Latency: ${r.avgMs.toFixed(2)}ms`);
  diga(`- P50 Latency: ${r.p50Ms.toFixed(2)}ms`);
  diga(`- P95 Latency: ${r.p95Ms.toFixed(2)}ms`);
  diga(`- P99 Latency: ${r.p99Ms.toFixed(2)}ms`);
  diga(`- Status: ${Object.entries(r.porStatus).sort().map(([s, n]) => `${s === "0" ? "rede/timeout" : s}×${n}`).join(", ")}`);
  diga(`- Auth rejeitada (401/403): ${r.porClasse.auth} | Rate limit (429): ${r.porClasse.rate_limited}`);
  diga(`- Failure Rate: ${r.failureRate.toFixed(2)}% (${r.failures}/${r.total})`);
  if (r.soAuth) diga("⚠️  100% das respostas foram 401/403: só o gateway de autenticação foi medido, não a função.");

  if (!r.aprovado) {
    console.error(`❌ FAILURE: Stress test exceeded ${o.maxFailureRate}% failure rate threshold.`);
    return 1;
  }
  diga("✅ SUCCESS: System stable under load.");
  return 0;
}

const ehPrincipal = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();

if (ehPrincipal) {
  principal(process.argv.slice(2), process.env).then(
    (codigo) => process.exit(codigo),
    (erro) => {
      console.error("❌ Erro inesperado:", (erro as Error)?.message ?? erro);
      process.exit(1);
    },
  );
}
