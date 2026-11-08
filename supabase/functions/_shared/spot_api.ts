/**
 * Helpers puros da integração com a API oficial SPOT / Stricker
 * (https://ws.spotgifts.com.br/api/v1SSL/).
 *
 * Este módulo NÃO importa nada do runtime Deno de propósito: assim ele pode ser
 * coberto por testes unitários com Vitest (ver src/tests/spot/spotApi.test.ts).
 *
 * Referência: API_SPOT_STRICKER_v2_1 — dados verificados em produção.
 */

/* ------------------------------------------------------------------ *
 * Quotas diárias por endpoint (reset 00h00 UTC-3)
 * ------------------------------------------------------------------ */

export const SPOT_DAILY_LIMITS: Readonly<Record<string, number>> = Object.freeze({
  AuthenticateClient: Number.POSITIVE_INFINITY,
  ValidateSession: Number.POSITIVE_INFINITY,
  CloseSession: Number.POSITIVE_INFINITY,
  OrderV1: Number.POSITIVE_INFINITY,
  OrdersV1: Number.POSITIVE_INFINITY,
  OrderDetailsV1: Number.POSITIVE_INFINITY,
  Stocks: 96,
  StocksByCountry: 96,
  products: 22,
  optionals: 22,
  customizationOptions: 22,
  customizationTables: 22,
  colors: 22,
  productTypes: 22,
});

/** Margem de segurança: nunca consumir os últimos slots da cota. */
export const SPOT_QUOTA_RESERVE = 2;

export interface QuotaVerdict {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  reason?: string;
}

/**
 * Decide se uma chamada pode ser feita hoje, considerando a reserva de segurança.
 * Endpoints ilimitados sempre passam.
 */
export function evaluateQuota(endpoint: string, usedToday: number): QuotaVerdict {
  const limit = SPOT_DAILY_LIMITS[endpoint] ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(limit)) {
    return { allowed: true, limit, used: usedToday, remaining: Number.POSITIVE_INFINITY };
  }
  const usable = Math.max(0, limit - SPOT_QUOTA_RESERVE);
  const remaining = Math.max(0, usable - usedToday);
  if (usedToday >= usable) {
    return {
      allowed: false,
      limit,
      used: usedToday,
      remaining: 0,
      reason: `Limite diário do endpoint "${endpoint}" atingido (${usedToday}/${limit}). Reset à meia-noite (UTC-3).`,
    };
  }
  return { allowed: true, limit, used: usedToday, remaining };
}

/* ------------------------------------------------------------------ *
 * Mapa oficial de erros
 * ------------------------------------------------------------------ */

export interface SpotErrorInfo {
  code: string;
  message: string;
  /** Reautenticar e repetir uma vez. */
  reauth: boolean;
  /** Retry com backoff exponencial. */
  retryable: boolean;
}

const SPOT_ERROR_MAP: Readonly<Record<string, Omit<SpotErrorInfo, "code">>> = Object.freeze({
  "1": { message: "AccessKey inválida — verifique a chave junto à Stricker.", reauth: false, retryable: false },
  w2: { message: "Erro interno do servidor SPOT — tentando novamente.", reauth: false, retryable: true },
  "12": { message: "Token ausente na requisição.", reauth: true, retryable: false },
  "13": { message: "Sessão SPOT expirada — reautenticando.", reauth: true, retryable: false },
  "14": { message: "Limite diário de requisições atingido na API SPOT. Reset à meia-noite (UTC-3).", reauth: false, retryable: false },
  "15": { message: "Problema na conta SPOT — contate o gerente Stricker.", reauth: false, retryable: false },
  "70": { message: "Referência interna duplicada — gere uma nova referência para o pedido.", reauth: false, retryable: false },
});

/** Traduz o ErrorCode devolvido pela API. `null`/`undefined` = sucesso. */
export function describeSpotError(errorCode: unknown, fallbackMessage?: string): SpotErrorInfo | null {
  if (errorCode === null || errorCode === undefined || errorCode === "") return null;
  const code = String(errorCode);
  const known = SPOT_ERROR_MAP[code];
  if (known) return { code, ...known };
  return {
    code,
    message: fallbackMessage?.trim() || `Erro desconhecido da API SPOT (código ${code}).`,
    reauth: false,
    retryable: false,
  };
}

/* ------------------------------------------------------------------ *
 * Normalizações de dados
 * ------------------------------------------------------------------ */

/**
 * A API devolve valores como "2,5" (vírgula decimal) em HandlingCosts e afins.
 * Retorna `null` para valores ausentes ou não numéricos.
 */
export function parseSpotDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface DecodedServiceCode {
  productReference: string;
  componentId: string;
  locationId: string;
  tableCodeOption: string;
}

/**
 * ServiceCode = {ProdReference}.{ComponentID}.{LocationID}.{TableCodeOption}
 * Quando o split resulta em 5 partes, as partes 4 e 5 formam o TableCodeOption
 * (ex.: "11103.18.23.SCR1-01.F" → tableCodeOption "SCR1-01.F").
 */
export function decodeServiceCode(serviceCode: string): DecodedServiceCode | null {
  if (typeof serviceCode !== "string") return null;
  const parts = serviceCode.trim().split(".");
  if (parts.length < 4) return null;
  const [productReference, componentId, locationId, ...rest] = parts;
  if (!productReference || !componentId || !locationId || rest.length === 0) return null;
  return {
    productReference,
    componentId,
    locationId,
    tableCodeOption: rest.join("."),
  };
}

/** Campo `Catalogs` é multi-valor separado por vírgula. */
export function parseCatalogs(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

/**
 * Dois sistemas de TypeCode coexistem. O legado é numérico curto ("10"), o novo
 * é zero-padded de 4 dígitos ("0035"). Devolve os dois separadamente para que a
 * busca por categoria seja sempre feita com OR entre eles.
 */
export function splitTypeCodes(...codes: unknown[]): { legacy: string | null; modern: string | null } {
  let legacy: string | null = null;
  let modern: string | null = null;
  for (const raw of codes) {
    if (raw === null || raw === undefined || raw === "") continue;
    const code = String(raw).trim();
    if (!code) continue;
    if (code.length >= 4 && code.startsWith("0")) {
      modern ??= code;
    } else {
      legacy ??= code;
    }
  }
  return { legacy, modern };
}

/** Categorias oficiais com os dois TypeCodes — usar sempre OR nos filtros. */
export const SPOT_CATEGORIES: ReadonlyArray<{ name: string; legacy: string | null; modern: string[] }> = Object.freeze([
  { name: "Squeezes & Copos", legacy: "10", modern: ["0035"] },
  { name: "Tecnologia", legacy: "3", modern: ["0029"] },
  { name: "Casa, Restauração & Bar", legacy: "8", modern: ["0036"] },
  { name: "Escrita", legacy: "2", modern: ["0031"] },
  { name: "Sacolas & Bolsas Térmicas", legacy: "9", modern: ["0033"] },
  { name: "Mochilas, Malas & Pastas", legacy: "5", modern: ["0032"] },
  { name: "Escritório", legacy: "4", modern: ["0030"] },
  { name: "Chaveiros", legacy: "7", modern: ["0038"] },
  { name: "Sol & Chuva", legacy: "11", modern: ["0040"] },
  { name: "Pessoal & Viagem", legacy: "6", modern: ["0037"] },
  { name: "Esporte & Ar Livre", legacy: null, modern: ["0028", "0034"] },
  { name: "Criança & Escolar", legacy: "12", modern: ["0039"] },
  { name: "SUCO (Camisetas)", legacy: "23", modern: [] },
]);

export function resolveCategoryName(legacy: string | null, modern: string | null): string | null {
  for (const cat of SPOT_CATEGORIES) {
    if (legacy && cat.legacy === legacy) return cat.name;
    if (modern && cat.modern.includes(modern)) return cat.name;
  }
  return null;
}

/** Extrai as faixas de preço MinQt{n}/Price{n} (até 10) de um optional. */
export function extractPriceTiers(optional: Record<string, unknown>, maxTiers = 10): Array<{ minQty: number; price: number }> {
  const tiers: Array<{ minQty: number; price: number }> = [];
  for (let i = 1; i <= maxTiers; i++) {
    const minQty = parseSpotDecimal(optional[`MinQt${i}`]);
    const price = parseSpotDecimal(optional[`Price${i}`]);
    if (minQty === null || price === null || minQty <= 0) continue;
    tiers.push({ minQty, price });
  }
  tiers.sort((a, b) => a.minQty - b.minQty);
  return tiers;
}

/** Preço unitário aplicável para uma quantidade, dado o conjunto de faixas. */
export function priceForQuantity(
  tiers: ReadonlyArray<{ minQty: number; price: number }>,
  quantity: number,
): number | null {
  let selected: number | null = null;
  for (const tier of tiers) {
    if (quantity >= tier.minQty) selected = tier.price;
  }
  return selected ?? (tiers.length > 0 ? tiers[0].price : null);
}

/** A resposta de pedidos usa a chave `OrdersDetails` (com S) — erro histórico de parse. */
export function readOrdersDetails(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const details = record.OrdersDetails ?? record.OrderDetails;
  return Array.isArray(details) ? (details as Array<Record<string, unknown>>) : [];
}

/** Referência interna única para OrderV1 — evita o erro 70 (duplicidade). */
export function buildInternalReference(prefix = "PS"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function spotProductImageUrl(sku: string, baseUrl = "https://ws.spotgifts.com.br/Products"): string | null {
  if (typeof sku !== "string" || !sku.trim()) return null;
  return `${baseUrl}/${sku.trim().replace("-", "_")}.jpg`;
}

/** Divide um array grande em lotes, sem usar spread (datasets de 35k+ registros). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const out: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    current.push(item);
    if (current.length === size) {
      out.push(current);
      current = [];
    }
  }
  if (current.length > 0) out.push(current);
  return out;
}
