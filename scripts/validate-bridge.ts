/**
 * Validação do contrato da Edge Function `external-db-bridge`.
 *
 * Uso:
 *   bun run scripts/validate-bridge.ts [--strict] [--json] [--timeout-ms 15000]
 *   (roda igual com `node scripts/validate-bridge.ts`; sem dependência de npm)
 *
 * Ambiente:
 *   - SUPABASE_URL       (ou VITE_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY  (ou VITE_SUPABASE_PUBLISHABLE_KEY) — chave pública
 *   - BRIDGE_USER_JWT    opcional: access token de um usuário real, para a parte autenticada
 *
 * O que é conferido (contrato lido em supabase/functions/external-db-bridge/index.ts e
 * _shared/external-bridge-allowlist.ts) — SOMENTE leitura, nenhuma escrita no banco externo:
 *   público:      OPTIONS → 2xx · GET → 405 · POST só com a chave pública → 401 ·
 *                 POST sem Authorization → 401 (gateway)
 *   autenticado:  operação fora da lista → 400 · tabela fora da allowlist → 403 ·
 *                 limit acima do teto → 400 · select limit 1 → 200 {data, count, meta}
 *                 (ou 500 "External database not configured", que é resposta válida do contrato)
 *
 * Por que `fetch` e não `supabase.functions.invoke`: no supabase-js, resposta não-2xx vira
 * `error.message = "Edge Function returned a non-2xx status code"` e o corpo some. A versão anterior
 * comparava essa mensagem com "External database not configured" — nunca casava — e, pior, a bridge
 * exige usuário logado: com a chave pública tudo é 401 (MEDIDO em 2026-11-09), então o script dava
 * "✅ Erro tratado corretamente" para um 401 e saía 0 sem ter validado contrato nenhum.
 *
 * Sem BRIDGE_USER_JWT a parte autenticada fica marcada NÃO VERIFICADO (exit 0; com --strict, exit 1).
 *
 * Exit: 0 = nenhum check falhou · 1 = check falhou (ou não verificado, com --strict) · 2 = uso/config.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type Estado = "ok" | "falhou" | "nao_verificado";

export interface Check {
  nome: string;
  estado: Estado;
  detalhe?: string;
}

export interface Resposta {
  status: number;
  corpo: unknown;
  texto: string;
  erro?: string;
}

export type Pedir = (metodo: string, opcoes?: { bearer?: string | null; corpo?: unknown }) => Promise<Resposta>;

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST = path.join(AQUI, "..", "supabase", "functions", "_shared", "external-bridge-allowlist.ts");

/** Lê do próprio código da função uma tabela permitida e o teto de `limit` (mantém o teste em sincronia). */
export function lerContrato(arquivo = ALLOWLIST): { tabela: string; limiteMaximo: number } {
  const padrao = { tabela: "produtos_externos", limiteMaximo: 500 };
  if (!existsSync(arquivo)) return padrao;
  const fonte = readFileSync(arquivo, "utf8");
  const bloco = fonte.match(/ALLOWED_TABLES\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/);
  const tabela = bloco?.[1].replace(/\/\/[^\n]*/g, "").match(/["']([A-Za-z0-9_]+)["']/)?.[1];
  const teto = Number(fonte.match(/MAX_SELECT_LIMIT\s*=\s*(\d+)/)?.[1]);
  return { tabela: tabela ?? padrao.tabela, limiteMaximo: Number.isInteger(teto) && teto > 0 ? teto : padrao.limiteMaximo };
}

function erroDe(r: Resposta): string {
  const e = (r.corpo as { error?: unknown; message?: unknown } | null) ?? null;
  return String(e?.error ?? e?.message ?? "");
}

function resumo(r: Resposta): string {
  return r.erro ? `sem resposta (${r.erro})` : `HTTP ${r.status} ${r.texto.replace(/\s+/g, " ").slice(0, 160)}`;
}

function espera(nome: string, r: Resposta, condicao: boolean): Check {
  return condicao ? { nome, estado: "ok", detalhe: `HTTP ${r.status}` } : { nome, estado: "falhou", detalhe: resumo(r) };
}

export async function validar(
  pedir: Pedir,
  { anonKey, userJwt, tabela, limiteMaximo }: { anonKey: string; userJwt?: string; tabela: string; limiteMaximo: number },
): Promise<Check[]> {
  const checks: Check[] = [];

  const opt = await pedir("OPTIONS", { bearer: anonKey });
  checks.push(espera("OPTIONS responde 2xx (preflight CORS)", opt, opt.status >= 200 && opt.status < 300));

  const get = await pedir("GET", { bearer: anonKey });
  checks.push(espera("GET é recusado com 405", get, get.status === 405 && /method not allowed/i.test(erroDe(get))));

  const anon = await pedir("POST", { bearer: anonKey, corpo: { operation: "select", table: tabela, limit: 1 } });
  checks.push(espera("POST só com a chave pública é 401 (exige usuário logado)", anon, anon.status === 401));

  const semAuth = await pedir("POST", { bearer: null, corpo: { operation: "select", table: tabela, limit: 1 } });
  checks.push(espera("POST sem Authorization é 401", semAuth, semAuth.status === 401));

  const autenticados = [
    "operação fora da lista é 400",
    "tabela fora da allowlist é 403",
    `limit acima de ${limiteMaximo} é 400`,
    "select limit 1 devolve {data, count, meta}",
  ];
  if (!userJwt) {
    for (const nome of autenticados) checks.push({ nome, estado: "nao_verificado", detalhe: "defina BRIDGE_USER_JWT" });
    return checks;
  }

  const sessao = await pedir("POST", { bearer: userJwt, corpo: { operation: "invalid_op" } });
  if (sessao.status === 401) {
    // Token recusado: não dá para afirmar nada sobre o contrato autenticado.
    for (const nome of autenticados) checks.push({ nome, estado: "falhou", detalhe: "BRIDGE_USER_JWT recusado (401) — token expirado ou de outro projeto" });
    return checks;
  }
  checks.push(espera(autenticados[0], sessao, sessao.status === 400 && /not allowed/i.test(erroDe(sessao))));

  const fora = await pedir("POST", { bearer: userJwt, corpo: { operation: "select", table: "__tabela_fora_da_allowlist__", limit: 1 } });
  checks.push(espera(autenticados[1], fora, fora.status === 403 && /allowlist/i.test(erroDe(fora))));

  const teto = await pedir("POST", { bearer: userJwt, corpo: { operation: "select", table: tabela, limit: limiteMaximo + 1 } });
  checks.push(espera(autenticados[2], teto, teto.status === 400 && /limit exceeds/i.test(erroDe(teto))));

  const sel = await pedir("POST", { bearer: userJwt, corpo: { operation: "select", table: tabela, limit: 1 } });
  const corpo = sel.corpo as { data?: unknown; count?: unknown; meta?: { durationMs?: unknown; status?: unknown } } | null;
  if (sel.status === 200) {
    const formaOk =
      !!corpo && "data" in corpo && "count" in corpo && typeof corpo.meta?.durationMs === "number" && typeof corpo.meta?.status === "string";
    checks.push(espera(autenticados[3], sel, formaOk));
  } else if (sel.status === 500 && /external database not configured/i.test(erroDe(sel))) {
    checks.push({ nome: autenticados[3], estado: "ok", detalhe: "HTTP 500 — bridge sem banco externo configurado (resposta prevista no contrato)" });
  } else if (sel.status === 429) {
    checks.push({ nome: autenticados[3], estado: "nao_verificado", detalhe: "HTTP 429 — rate limit; repita depois" });
  } else {
    checks.push({ nome: autenticados[3], estado: "falhou", detalhe: resumo(sel) });
  }
  return checks;
}

export function criarPedir(baseUrl: string, anonKey: string, timeoutMs: number): Pedir {
  const alvo = `${baseUrl.replace(/\/+$/, "")}/functions/v1/external-db-bridge`;
  return async (metodo, { bearer, corpo } = {}) => {
    const headers: Record<string, string> = { apikey: anonKey };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (corpo !== undefined) headers["Content-Type"] = "application/json";
    try {
      const res = await fetch(alvo, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const texto = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(texto);
      } catch {
        // corpo não-JSON (ex.: "ok" do preflight) fica só em `texto`
      }
      return { status: res.status, corpo: json, texto };
    } catch (e) {
      const erro = e as { name?: string; message?: string; cause?: { code?: string } };
      return { status: 0, corpo: null, texto: "", erro: erro?.name === "TimeoutError" ? "timeout" : erro?.cause?.code ?? erro?.message ?? "erro" };
    }
  };
}

interface Opcoes {
  strict: boolean;
  json: boolean;
  timeoutMs: number;
  ajuda: boolean;
}

export function lerArgs(argv: string[]): Opcoes {
  const o: Opcoes = { strict: false, json: false, timeoutMs: 15_000, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") o.strict = true;
    else if (a === "--json") o.json = true;
    else if (a === "--help" || a === "-h") o.ajuda = true;
    else if (a === "--timeout-ms") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 100) throw new Error("--timeout-ms exige inteiro >= 100");
      o.timeoutMs = n;
    } else throw new Error(`argumento desconhecido: ${a}`);
  }
  return o;
}

const AJUDA = `Uso: bun run scripts/validate-bridge.ts [--strict] [--json] [--timeout-ms 15000]
  --strict  sai 1 também quando algum check ficou NÃO VERIFICADO (sem BRIDGE_USER_JWT)
  --json    imprime os checks como um único documento JSON no stdout
  env: SUPABASE_URL|VITE_SUPABASE_URL, SUPABASE_ANON_KEY|VITE_SUPABASE_PUBLISHABLE_KEY, BRIDGE_USER_JWT (opcional)`;

export async function principal(argv: string[], env: Record<string, string | undefined>): Promise<number> {
  let o: Opcoes;
  try {
    o = lerArgs(argv);
  } catch (e) {
    console.error(`❌ ${(e as Error).message}\n${AJUDA}`);
    return 2;
  }
  if (o.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  const diga = o.json ? console.error : console.log;

  const baseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (!baseUrl || !anonKey) {
    console.error("❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
    return 2;
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    console.error("❌ Erro: SUPABASE_URL precisa começar com http(s)://");
    return 2;
  }

  diga("🔍 Iniciando validação do contrato da Edge Function: external-db-bridge...");
  const contrato = lerContrato();
  const checks = await validar(criarPedir(baseUrl, anonKey, o.timeoutMs), {
    anonKey,
    userJwt: env.BRIDGE_USER_JWT?.trim() || undefined,
    ...contrato,
  });

  const icone: Record<Estado, string> = { ok: "✅", falhou: "❌", nao_verificado: "⚪ NÃO VERIFICADO —" };
  for (const c of checks) diga(`${icone[c.estado]} ${c.nome}${c.detalhe ? ` (${c.detalhe})` : ""}`);

  const conta = (e: Estado) => checks.filter((c) => c.estado === e).length;
  const falhas = conta("falhou");
  const pendentes = conta("nao_verificado");
  if (o.json) console.log(JSON.stringify({ ok: conta("ok"), falhou: falhas, nao_verificado: pendentes, checks }, null, 2));

  diga(`\n${conta("ok")} ok · ${falhas} com falha · ${pendentes} não verificado(s)`);
  if (falhas > 0) {
    console.error(`❌ Validação falhou: ${falhas} check(s) fora do contrato.`);
    return 1;
  }
  if (pendentes > 0 && o.strict) {
    console.error(`❌ --strict: ${pendentes} check(s) não verificado(s).`);
    return 1;
  }
  diga(pendentes > 0 ? "⚠️  Parte pública do contrato validada; parte autenticada não verificada." : "✅ Contrato validado.");
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
      console.error("❌ Erro crítico durante a validação:", (erro as Error)?.message ?? erro);
      process.exit(1);
    },
  );
}
