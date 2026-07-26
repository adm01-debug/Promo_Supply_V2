/**
 * Cliente HTTP da API XBZ Brindes (api.minhaxbz.com.br:5001).
 *
 * Três controllers, dois esquemas de autenticação:
 *  - /api/clientes/  → header `cnpj` + `token`   (36 req/dia — apenas fallback)
 *  - /api/ruiz/      → query `user` + `passwd`
 *  - /api/carrinho/  → query `_usuario` + `_senha`
 *
 * Armadilhas tratadas aqui (ver DOCS/INTEGRACOES/XBZ.md):
 *  - login sempre devolve HTTP 200 → validar por `Id > 0`
 *  - datas nulas chegam como "2000-01-01T00:00:00"
 *  - HTTP 425 no carrinho = conflito de estoque com corpo válido
 *  - `consultaEstoque` exige `busca` não vazio
 */
import { fetchWithTimeout } from "./http.ts";
import { getBreaker } from "./circuit_breaker.ts";

export const XBZ_BASE = "https://api.minhaxbz.com.br:5001";
export const XBZ_TIMEOUT_MS = 15_000;

/** Sentinela usada pela XBZ para representar "sem data". */
export const XBZ_NULL_DATE = "2000-01-01T00:00:00";

const breaker = getBreaker("xbz-api", { failureThreshold: 5, cooldownMs: 30_000 });

export class XbzError extends Error {
  status: number;
  body: string;

  constructor(status: number, message: string, body = "") {
    super(message);
    this.name = "XbzError";
    this.status = status;
    this.body = body;
  }
}

export class XbzCircuitOpenError extends XbzError {
  constructor() {
    super(503, "Integração XBZ temporariamente indisponível (circuit breaker aberto)");
    this.name = "XbzCircuitOpenError";
  }
}

export interface XbzPortalCredentials {
  user: string;
  password: string;
}

export interface XbzResult<T> {
  data: T;
  status: number;
  /** true quando a XBZ devolveu 425 (conflito de estoque com corpo válido). */
  stockConflict: boolean;
}

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, params: Record<string, QueryValue>): string {
  const url = new URL(`${XBZ_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function request<T>(
  url: string,
  init: RequestInit = {},
): Promise<XbzResult<T>> {
  if (!breaker.canRequest()) throw new XbzCircuitOpenError();

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      ...init,
      timeoutMs: XBZ_TIMEOUT_MS,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    breaker.recordFailure();
    throw new XbzError(502, `Falha de rede na XBZ: ${(err as Error).message}`);
  }

  const text = await res.text();

  // 425 = conflito de estoque; o corpo ainda traz o item corrigido.
  const stockConflict = res.status === 425;

  if (!res.ok && !stockConflict) {
    if (res.status >= 500) breaker.recordFailure();
    else breaker.recordSuccess();

    const message = res.status === 403
      ? "Conta XBZ bloqueada por excesso de requisições (limite de 36/dia da API /clientes)"
      : res.status === 401
      ? "Credenciais XBZ inválidas ou token revogado"
      : `XBZ respondeu ${res.status}`;
    throw new XbzError(res.status, message, text.slice(0, 500));
  }

  breaker.recordSuccess();

  let data: T;
  try {
    data = text ? JSON.parse(text) as T : ({} as T);
  } catch {
    throw new XbzError(502, "Resposta da XBZ não é JSON válido", text.slice(0, 300));
  }

  return { data, status: res.status, stockConflict };
}

// ---------------------------------------------------------------- /api/ruiz/

function ruizAuth(c: XbzPortalCredentials): Record<string, QueryValue> {
  return { user: c.user, passwd: c.password, browserFingerPrint: "xbz" };
}

export interface XbzLoginResponse {
  Id: number;
  RazaoSocialNome: string | null;
  NomeFantasia: string | null;
  WebToken: string | null;
  Bloqueado: boolean;
  BloqueioMotivoDivulgado: string | null;
  [key: string]: unknown;
}

/** Flags de permissão retornadas pelo getToken — a UI deve respeitá-las. */
export const XBZ_PERMISSION_FLAGS = [
  "WebHabilitarAcessoPortal",
  "WebExibePreco",
  "WebExibeQuantidade",
  "WebIgnoraRestricoes",
  "WebConsultaProdutos",
  "WebConsultaPedidos",
  "WebExibePrecosPedidos",
  "WebCarrinhoInserir",
  "WebCarrinhoVisualizar",
  "WebPedidoEnviar",
] as const;

export function extractPermissions(login: XbzLoginResponse): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const flag of XBZ_PERMISSION_FLAGS) out[flag] = login[flag] === true;
  return out;
}

export async function xbzLogin(c: XbzPortalCredentials): Promise<XbzLoginResponse> {
  const { data } = await request<XbzLoginResponse>(
    buildUrl("/api/ruiz/getToken", ruizAuth(c)),
  );
  // ⚠️ A XBZ devolve 200 mesmo com credenciais erradas — validar por Id.
  if (!data || typeof data.Id !== "number" || data.Id <= 0) {
    throw new XbzError(401, "Login XBZ recusado: usuário ou senha inválidos");
  }
  return data;
}

export function xbzDashboard(c: XbzPortalCredentials) {
  return request<Record<string, unknown>>(buildUrl("/api/ruiz/GetDashboard", ruizAuth(c)));
}

export function xbzPessoaToken(c: XbzPortalCredentials) {
  return request<Record<string, unknown>>(buildUrl("/api/ruiz/GetPessoaToken", ruizAuth(c)));
}

export interface XbzPedidosFilters {
  idPeriodoSelecionado?: number;
  idStatusFinanceiroSelecionado?: number;
  idStatusLogisticoSelecionado?: number;
  idPessoaEmissao?: number;
  idTipoListagemSelecionada?: number;
  idMostraEntregues?: number;
  numeroPedido?: string;
}

export function xbzConsultaPedidos(c: XbzPortalCredentials, f: XbzPedidosFilters = {}) {
  return request<Array<Record<string, unknown>>>(
    buildUrl("/api/ruiz/consultaPedidos", {
      ...ruizAuth(c),
      idPeriodoSelecionado: f.idPeriodoSelecionado ?? 1,
      idStatusFinanceiroSelecionado: f.idStatusFinanceiroSelecionado ?? 0,
      idStatusLogisticoSelecionado: f.idStatusLogisticoSelecionado ?? 0,
      idPessoaEmissao: f.idPessoaEmissao ?? 0,
      idTipoListagemSelecionada: f.idTipoListagemSelecionada ?? 2,
      idMostraEntregues: f.idMostraEntregues ?? 1,
      numeroPedido: f.numeroPedido ?? "",
    }),
  );
}

export interface XbzCatalogoFilters {
  busca?: string;
  cor_id?: number;
  filtro_id?: number;
  web_tipo_id?: number;
  web_sub_tipo_id?: number;
  tema_id?: number;
  quantidade?: number;
  preco_minimo?: number;
  preco_maximo?: number;
}

export function xbzConsultaEstoque(c: XbzPortalCredentials, f: XbzCatalogoFilters = {}) {
  // ⚠️ `busca` vazio devolve []. "a" é o hack documentado para varrer o catálogo.
  const busca = (f.busca ?? "").trim() || "a";
  return request<Array<Record<string, unknown>>>(
    buildUrl("/api/ruiz/consultaEstoque", {
      ...ruizAuth(c),
      webToken: "xbz",
      browserId: 0,
      busca,
      cor_id: f.cor_id ?? 0,
      filtro_id: f.filtro_id ?? 0,
      web_tipo_id: f.web_tipo_id ?? 0,
      web_sub_tipo_id: f.web_sub_tipo_id ?? 0,
      tema_id: f.tema_id ?? 0,
      quantidade: f.quantidade ?? 0,
      preco_minimo: f.preco_minimo ?? 0,
      preco_maximo: f.preco_maximo ?? 0,
    }),
  );
}

/** Endpoint público — não exige autenticação. */
export function xbzCores() {
  return request<Array<Record<string, unknown>>>(`${XBZ_BASE}/api/ruiz/produtosCores`);
}

export function xbzGetSt(produtoId: number, pessoaId: number) {
  return request<Record<string, unknown>>(
    buildUrl("/api/ruiz/getSt", { produto_id: produtoId, pessoa_id: pessoaId }),
  );
}

// ------------------------------------------------------------ /api/carrinho/

function carrinhoAuth(c: XbzPortalCredentials): Record<string, QueryValue> {
  return { _usuario: c.user, _senha: c.password };
}

function carrinhoUrl(action: string, c: XbzPortalCredentials, extra: Record<string, QueryValue> = {}) {
  return buildUrl(`/api/carrinho/${action}`, { ...carrinhoAuth(c), ...extra });
}

export function xbzCarrinhoGet<T = unknown>(
  action: string,
  c: XbzPortalCredentials,
  extra: Record<string, QueryValue> = {},
) {
  return request<T>(carrinhoUrl(action, c, extra));
}

export function xbzCarrinhoWrite<T = unknown>(
  action: string,
  method: "POST" | "PUT" | "DELETE",
  c: XbzPortalCredentials,
  body?: unknown,
  extra: Record<string, QueryValue> = {},
) {
  return request<T>(carrinhoUrl(action, c, extra), {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// ------------------------------------------------------------- normalização

/** Converte datas da XBZ tratando a sentinela 2000-01-01 como null. */
export function parseXbzDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("2000-01-01T00:00:00")) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : new Date(ts).toISOString();
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toInt(value: unknown): number | null {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
}

export function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

/** `idLoteDebitoStatus`: 0 = pendente, 2/3 = pago. */
export function isPago(idLoteDebitoStatus: number | null): boolean {
  return idLoteDebitoStatus === 2 || idLoteDebitoStatus === 3;
}

/** Extrai a data embutida em "PAGO (06/03/26 17:48:21)". */
export function parsePagamentoLabel(label: unknown): string | null {
  if (typeof label !== "string") return null;
  const m = label.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yy, hh, mi, ss] = m;
  const iso = `20${yy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`;
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? null : new Date(ts).toISOString();
}
