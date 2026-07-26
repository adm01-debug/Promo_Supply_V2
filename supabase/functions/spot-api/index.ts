/**
 * spot-api — integração com a API oficial SPOT / Stricker.
 *
 * Substitui gradualmente o scraping de `spot-proxy`. Toda leitura do app vem do
 * cache no banco (spot_produtos / spot_skus / spot_customization_options /
 * spot_estoque); esta função é o ÚNICO ponto que fala com ws.spotgifts.com.br.
 *
 * Restrições respeitadas:
 *  - /Stocks: 96 req/dia  → cron a cada 15 min
 *  - catálogo/personalização: 22 req/dia → 1 sync/dia
 *  - token válido 24h, reaproveitado via spot_sessions
 */
import { buildCorsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { retry } from "../_shared/retry.ts";
import {
  buildInternalReference,
  chunk,
  decodeServiceCode,
  describeSpotError,
  evaluateQuota,
  extractPriceTiers,
  parseCatalogs,
  parseSpotDecimal,
  readOrdersDetails,
  resolveCategoryName,
  splitTypeCodes,
  spotProductImageUrl,
} from "../_shared/spot_api.ts";

const BASE_URL = (Deno.env.get("SPOT_API_BASE_URL") ?? "https://ws.spotgifts.com.br/api/v1SSL").replace(/\/+$/, "");
const ACCESS_KEY = Deno.env.get("SPOT_API_ACCESS_KEY") ?? "";
const LANG = "PT";
const REQUEST_TIMEOUT_MS = 120_000; // payloads de catálogo chegam a dezenas de MB
const UPSERT_BATCH = 500;
const SESSION_TTL_MS = 23 * 60 * 60 * 1000; // 24h com margem
const ALLOWED_ROLES = ["admin", "coordinator", "buyer"] as const;

type Action = "syncCatalog" | "syncCustomization" | "syncStock" | "createOrder" | "getOrders" | "status";

const VALID_ACTIONS: ReadonlySet<string> = new Set<Action>([
  "syncCatalog",
  "syncCustomization",
  "syncStock",
  "createOrder",
  "getOrders",
  "status",
]);

/** Ações que o cron pode disparar com a service role key (sem usuário). */
const CRON_ACTIONS: ReadonlySet<string> = new Set<Action>(["syncCatalog", "syncCustomization", "syncStock"]);

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/* ------------------------------------------------------------------ *
 * Autenticação do chamador
 * ------------------------------------------------------------------ */

interface Caller {
  userId: string | null;
  isCron: boolean;
}

async function authorize(req: Request, db: SupabaseClient, action: string): Promise<Caller> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Não autorizado: token ausente");
  const token = header.slice(7).trim();
  if (!token) throw new HttpError(401, "Não autorizado: token inválido");

  // Cron/serviço: service role key chamando um sync agendado.
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    if (!CRON_ACTIONS.has(action)) throw new HttpError(403, "Ação não permitida para chamadas de serviço");
    return { userId: null, isCron: true };
  }

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Não autorizado: sessão inválida");
  const userId = data.user.id;

  const { data: roles, error: roleError } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (roleError) throw new HttpError(500, "Falha ao verificar permissões");

  const allowed = (roles ?? []).some((r: { role: string }) => (ALLOWED_ROLES as readonly string[]).includes(r.role));
  if (!allowed) throw new HttpError(403, "Permissão insuficiente para a integração SPOT");

  return { userId, isCron: false };
}

/* ------------------------------------------------------------------ *
 * Sessão / token SPOT (cache em spot_sessions)
 * ------------------------------------------------------------------ */

const SESSION_TAG = "spot-api-token";

async function authenticate(db: SupabaseClient, logger: EdgeLogger): Promise<string> {
  if (!ACCESS_KEY) throw new HttpError(500, "SPOT_API_ACCESS_KEY não configurada");
  const res = await fetch(`${BASE_URL}/AuthenticateClient?accessKey=${encodeURIComponent(ACCESS_KEY)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => null);
  const err = describeSpotError(json?.ErrorCode, json?.ErrorMessage);
  if (err) throw new HttpError(502, err.message);
  const token = String(json?.Token ?? "");
  if (!token) throw new HttpError(502, "API SPOT não devolveu token de sessão");

  await db.from("spot_sessions").update({ is_valid: false }).eq("is_valid", true)
    .contains("metadata", { tag: SESSION_TAG });
  await db.from("spot_sessions").insert({
    session_cookie: token,
    is_valid: true,
    metadata: { tag: SESSION_TAG },
  });

  logger.info("Novo token SPOT obtido");
  return token;
}

async function getToken(db: SupabaseClient, logger: EdgeLogger, forceNew = false): Promise<string> {
  if (!forceNew) {
    const { data } = await db
      .from("spot_sessions")
      .select("session_cookie, created_at")
      .eq("is_valid", true)
      .contains("metadata", { tag: SESSION_TAG })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cached = data?.session_cookie as string | undefined;
    const age = data?.created_at ? Date.now() - new Date(data.created_at as string).getTime() : Infinity;

    if (cached && age < SESSION_TTL_MS) {
      const valid = await validateSession(cached);
      if (valid) return cached;
      logger.warn("Token SPOT em cache inválido — reautenticando");
    }
  }
  return authenticate(db, logger);
}

async function validateSession(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/ValidateSession?token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json().catch(() => null);
    return Number(json?.Status) === 1;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Chamada com guarda de quota + tratamento de erros oficiais
 * ------------------------------------------------------------------ */

async function usedToday(db: SupabaseClient, endpoint: string): Promise<number> {
  // Reset da quota é 00h00 UTC-3.
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 3600_000);
  const startBrt = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate()));
  const since = new Date(startBrt.getTime() + 3 * 3600_000).toISOString();

  const { count } = await db
    .from("spot_api_sync_log")
    .select("id", { count: "exact", head: true })
    .eq("endpoint", endpoint)
    .gte("called_at", since);
  return count ?? 0;
}

async function logCall(
  db: SupabaseClient,
  entry: {
    endpoint: string;
    action: string;
    status: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    records?: number;
    durationMs?: number;
  },
): Promise<void> {
  await db.from("spot_api_sync_log").insert({
    endpoint: entry.endpoint,
    action: entry.action,
    status: entry.status,
    error_code: entry.errorCode ?? null,
    error_message: entry.errorMessage ?? null,
    records_processed: entry.records ?? 0,
    duration_ms: entry.durationMs ?? null,
  });
}

interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string>;
  /** Endpoints ilimitados podem pular a checagem de quota. */
  skipQuota?: boolean;
}

async function callSpot<T = Record<string, unknown>>(
  db: SupabaseClient,
  logger: EdgeLogger,
  endpoint: string,
  action: string,
  opts: CallOptions = {},
): Promise<T> {
  if (!opts.skipQuota) {
    const verdict = evaluateQuota(endpoint, await usedToday(db, endpoint));
    if (!verdict.allowed) {
      await logCall(db, { endpoint, action, status: "quota_blocked", errorMessage: verdict.reason });
      throw new HttpError(429, verdict.reason!);
    }
  }

  const started = Date.now();
  let token = await getToken(db, logger);

  const execute = async (currentToken: string): Promise<T> => {
    const params = new URLSearchParams({ token: currentToken, lang: LANG, ...(opts.query ?? {}) });
    const url = `${BASE_URL}/${endpoint}?${params.toString()}`;
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`SPOT HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    const err = describeSpotError(json?.ErrorCode, json?.ErrorMessage as string | undefined);
    if (err) {
      const tagged = new Error(err.message) as Error & { spot?: ReturnType<typeof describeSpotError> };
      tagged.spot = err;
      throw tagged;
    }
    return json as T;
  };

  try {
    const result = await retry(
      async () => {
        try {
          return await execute(token);
        } catch (error: unknown) {
          const spot = (error as { spot?: ReturnType<typeof describeSpotError> }).spot;
          if (spot?.reauth) {
            token = await getToken(db, logger, true);
            return await execute(token);
          }
          throw error;
        }
      },
      {
        retries: 3,
        baseDelayMs: 500,
        maxDelayMs: 8000,
        shouldRetry: (error: unknown) => {
          const spot = (error as { spot?: ReturnType<typeof describeSpotError> }).spot;
          if (spot) return spot.retryable; // só w2
          return /timeout|network|fetch failed|5\d\d/i.test((error as Error)?.message ?? "");
        },
      },
    );
    await logCall(db, { endpoint, action, status: "success", durationMs: Date.now() - started });
    return result;
  } catch (error: unknown) {
    const spot = (error as { spot?: ReturnType<typeof describeSpotError> }).spot;
    const message = error instanceof Error ? error.message : String(error);
    await logCall(db, {
      endpoint,
      action,
      status: "error",
      errorCode: spot?.code ?? null,
      errorMessage: message,
      durationMs: Date.now() - started,
    });
    throw new HttpError(502, message);
  }
}

/* ------------------------------------------------------------------ *
 * Upsert em lotes (datasets grandes — sem spread)
 * ------------------------------------------------------------------ */

async function upsertBatched(
  db: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  logger: EdgeLogger,
): Promise<number> {
  let saved = 0;
  for (const batch of chunk(rows, UPSERT_BATCH)) {
    const { error } = await db.from(table).upsert(batch, { onConflict });
    if (error) {
      logger.error(`Falha ao gravar lote em ${table}`, { error: error.message });
      throw new HttpError(500, `Falha ao gravar ${table}: ${error.message}`);
    }
    saved += batch.length;
  }
  return saved;
}

/* ------------------------------------------------------------------ *
 * Ações
 * ------------------------------------------------------------------ */

async function syncCatalog(db: SupabaseClient, logger: EdgeLogger) {
  const productsPayload = await callSpot<{ Products?: Record<string, unknown>[] }>(db, logger, "products", "syncCatalog");
  const products = productsPayload.Products ?? [];
  const now = new Date().toISOString();

  const productRows: Record<string, unknown>[] = [];
  for (const p of products) {
    const { legacy, modern } = splitTypeCodes(p.TypeCode, p.TypeCodeNew, p.SubTypeCode);
    const reference = String(p.Reference ?? p.ProdReference ?? "").trim();
    if (!reference) continue;
    productRows.push({
      reference,
      name: String(p.Name ?? p.Description ?? reference),
      description: p.LongDescription ? String(p.LongDescription) : null,
      type_code_legacy: legacy,
      type_code_new: modern,
      category_name: resolveCategoryName(legacy, modern),
      catalogs: parseCatalogs(p.Catalogs),
      brand: p.Brand ? String(p.Brand) : null,
      country_of_origin: p.CountryOfOrigin ? String(p.CountryOfOrigin) : null,
      main_image_url: spotProductImageUrl(reference),
      currency: String(p.Currency ?? "BRL"),
      raw: p,
      synced_at: now,
    });
  }
  const savedProducts = await upsertBatched(db, "spot_produtos", productRows, "reference", logger);

  const optionalsPayload = await callSpot<{ Optionals?: Record<string, unknown>[] }>(db, logger, "optionals", "syncCatalog");
  const optionals = optionalsPayload.Optionals ?? [];

  const skuRows: Record<string, unknown>[] = [];
  for (const o of optionals) {
    const sku = String(o.Sku ?? "").trim();
    if (!sku) continue;
    skuRows.push({
      sku,
      product_reference: String(o.ProdReference ?? sku.split("-")[0]),
      color_code: o.ColorCode ? String(o.ColorCode) : null,
      color_name: o.ColorDescription1 ? String(o.ColorDescription1) : (o.ColorName ? String(o.ColorName) : null),
      color_hex: o.ColorHex1 ? String(o.ColorHex1) : null,
      size: o.Size ? String(o.Size) : null,
      capacity: o.Capacity ? String(o.Capacity) : null,
      your_price: parseSpotDecimal(o.YourPrice),
      handling_costs: parseSpotDecimal(o.HandlingCosts1),
      price_tiers: extractPriceTiers(o),
      table_codes_options: o.TableCodesOptions1 ? String(o.TableCodesOptions1) : null,
      print_area: o.Area1 ? String(o.Area1) : null,
      no_replenishment: Boolean(o.NoReplenishment),
      image_url: spotProductImageUrl(sku),
      raw: o,
      synced_at: now,
    });
  }
  const savedSkus = await upsertBatched(db, "spot_skus", skuRows, "sku", logger);

  return { products: savedProducts, skus: savedSkus };
}

async function syncCustomization(db: SupabaseClient, logger: EdgeLogger) {
  const payload = await callSpot<{ CustomizationOptions?: Record<string, unknown>[] }>(
    db,
    logger,
    "customizationOptions",
    "syncCustomization",
  );
  const options = payload.CustomizationOptions ?? [];
  const now = new Date().toISOString();

  const rows: Record<string, unknown>[] = [];
  for (const c of options) {
    const serviceCode = String(c.ServiceCode ?? "").trim();
    if (!serviceCode) continue;
    const decoded = decodeServiceCode(serviceCode);
    rows.push({
      service_code: serviceCode,
      product_reference: decoded?.productReference ?? String(c.ProdReference ?? ""),
      component_id: decoded?.componentId ?? null,
      location_id: decoded?.locationId ?? null,
      table_code_option: decoded?.tableCodeOption ?? null,
      technique_code: c.TechniqueCode ? String(c.TechniqueCode) : null,
      technique_name: c.TechniqueName ? String(c.TechniqueName) : null,
      area: c.Area ? String(c.Area) : null,
      max_colors: Number.isFinite(Number(c.MaxColors)) ? Number(c.MaxColors) : null,
      allow_full_color: Boolean(c.AllowFullColor),
      is_default: Boolean(c.IsDefault),
      hotspot: {
        left: parseSpotDecimal(c.HotSpot1Left),
        top: parseSpotDecimal(c.HotSpot1Top),
        width: parseSpotDecimal(c.HotSpot1Width),
        height: parseSpotDecimal(c.HotSpot1Height),
      },
      prices: extractPriceTiers(c),
      raw: c,
      synced_at: now,
    });
  }

  const saved = await upsertBatched(db, "spot_customization_options", rows, "service_code", logger);
  return { customizationOptions: saved };
}

async function syncStock(db: SupabaseClient, logger: EdgeLogger) {
  const payload = await callSpot<{ Stocks?: Record<string, unknown>[] }>(db, logger, "Stocks", "syncStock");
  const stocks = payload.Stocks ?? [];
  const now = new Date().toISOString();

  const rows: Record<string, unknown>[] = [];
  for (const s of stocks) {
    const sku = String(s.Sku ?? "").trim();
    if (!sku) continue;
    const incomingQty = parseSpotDecimal(s.NextQuantity1);
    rows.push({
      sku,
      product_reference: sku.split("-")[0],
      quantity: Math.trunc(parseSpotDecimal(s.Quantity) ?? 0),
      incoming_quantity: incomingQty === null ? null : Math.trunc(incomingQty),
      incoming_date: s.NextDate1 ? String(s.NextDate1) : null,
      synced_at: now,
    });
  }

  const saved = await upsertBatched(db, "spot_estoque", rows, "sku", logger);
  return { stocks: saved };
}

interface CreateOrderInput {
  order: Array<Record<string, unknown>>;
  destination: Record<string, unknown>;
  courier?: string;
  shippingDate?: string;
  noShipping?: string;
  test?: boolean;
}

async function createOrder(db: SupabaseClient, logger: EdgeLogger, input: CreateOrderInput) {
  const internalReference = buildInternalReference();
  const payload = {
    order: input.order,
    destination: input.destination,
    courier: input.courier ?? "Economy",
    internalReference,
    shippingDate: input.shippingDate,
    noShipping: input.noShipping ?? "false",
  };

  const response = await callSpot<Record<string, unknown>>(db, logger, "OrderV1", "createOrder", {
    method: "POST",
    body: payload,
    query: input.test ? { test: "true" } : {},
    skipQuota: true,
  });

  const details = readOrdersDetails(response);
  const first = details[0] ?? {};
  const orderStamp = String(first.OrderStamp ?? "");

  if (orderStamp) {
    await db.from("spot_pedidos").upsert(
      {
        spot_order_id: orderStamp,
        internal_reference: internalReference,
        status: "PROCESSING",
        valor_total: parseSpotDecimal(first.OrderTotal) ?? 0,
        codigo_rastreamento: first.Tracking ? String(first.Tracking) : null,
        itens: input.order,
        last_synced_at: new Date().toISOString(),
        status_synced_at: new Date().toISOString(),
      },
      { onConflict: "spot_order_id" },
    );
  }

  return { internalReference, details };
}

async function getOrders(db: SupabaseClient, logger: EdgeLogger) {
  const response = await callSpot<Record<string, unknown>>(db, logger, "OrdersV1", "getOrders", { skipQuota: true });
  const details = readOrdersDetails(response);
  const now = new Date().toISOString();

  const rows: Record<string, unknown>[] = [];
  for (const d of details) {
    const stamp = String(d.OrderStamp ?? "").trim();
    if (!stamp) continue;
    rows.push({
      spot_order_id: stamp,
      internal_reference: d.InternalReference ? String(d.InternalReference) : null,
      status: String(d.Status ?? "PROCESSING"),
      valor_total: parseSpotDecimal(d.OrderTotal) ?? 0,
      codigo_rastreamento: d.Tracking ? String(d.Tracking) : null,
      estimated_ship_date: d.ShippingDate ? String(d.ShippingDate) : null,
      last_synced_at: now,
      status_synced_at: now,
    });
  }
  if (rows.length > 0) await upsertBatched(db, "spot_pedidos", rows, "spot_order_id", logger);
  return { orders: rows.length };
}

async function status(db: SupabaseClient) {
  const endpoints = ["products", "optionals", "customizationOptions", "Stocks"];
  const quotas: Record<string, unknown> = {};
  for (const endpoint of endpoints) {
    quotas[endpoint] = evaluateQuota(endpoint, await usedToday(db, endpoint));
  }
  return { quotas };
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const logger = new EdgeLogger("spot-api");
  const headers = buildResponseHeaders(cors);

  try {
    if (req.method !== "POST") throw new HttpError(405, "Método não permitido — use POST");

    const body = await req.json().catch(() => null);
    const action = String((body as { action?: unknown })?.action ?? "");
    if (!VALID_ACTIONS.has(action)) throw new HttpError(400, `Ação inválida: ${action || "(vazia)"}`);

    const db = admin();
    const caller = await authorize(req, db, action);

    if (caller.userId) {
      const limit = await checkRateLimit({
        identifier: caller.userId,
        endpoint: "spot-api",
        maxRequests: 30,
        windowSeconds: 60,
      });
      if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds, cors);
    }

    let result: unknown;
    switch (action as Action) {
      case "syncCatalog":
        result = await syncCatalog(db, logger);
        break;
      case "syncCustomization":
        result = await syncCustomization(db, logger);
        break;
      case "syncStock":
        result = await syncStock(db, logger);
        break;
      case "createOrder": {
        const input = (body as { payload?: CreateOrderInput }).payload;
        if (!input || !Array.isArray(input.order) || input.order.length === 0 || !input.destination) {
          throw new HttpError(400, "Payload de pedido inválido: 'order' e 'destination' são obrigatórios");
        }
        result = await createOrder(db, logger, input);
        break;
      }
      case "getOrders":
        result = await getOrders(db, logger);
        break;
      case "status":
        result = await status(db);
        break;
    }

    return new Response(JSON.stringify({ success: true, action, ...(result as object) }), { headers });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido na integração SPOT";
    if (status >= 500) logger.error("spot-api falhou", { error: message });
    else logger.warn("spot-api rejeitou requisição", { error: message, status });
    return new Response(JSON.stringify({ error: message, status: "error" }), { status, headers });
  }
});
