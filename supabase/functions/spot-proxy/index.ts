import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPOT_BASE = "https://www.spotgifts.com.br";
const LANG = "pt";
const SPOT_REQUEST_TIMEOUT_MS = 15000;
type SpotAction =
  | "search"
  | "catalog"
  | "product"
  | "stock"
  | "addToCart"
  | "getCart"
  | "removeFromCart"
  | "updateCartQty"
  | "orders"
  | "financial"
  | "checkout"
  | "login";

const VALID_ACTIONS: ReadonlySet<SpotAction> = new Set([
  "search", "catalog", "product", "stock", "addToCart",
  "getCart", "removeFromCart", "updateCartQty", "orders",
  "financial", "checkout", "login",
]);

const ALLOWED_ROLES = ["admin", "coordinator", "buyer"] as const;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/** Verify the caller is an authenticated user with appropriate role */
async function verifyAuth(req: Request, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(403, "Não autorizado: token ausente");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new HttpError(403, "Não autorizado: token inválido");
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new HttpError(403, "Não autorizado: token inválido");
  }

  // Verify user has at least one allowed role
  const { data: roles, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...ALLOWED_ROLES]);

  if (roleError || !roles || roles.length === 0) {
    throw new HttpError(403, "Sem permissão para acessar integração SPOT");
  }

  return user.id;
}

// Get or create a valid SPOT session
async function getSpotSession(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const { data: sessions } = await supabase
    .from("spot_sessions")
    .select("*")
    .eq("is_valid", true)
    .order("last_used_at", { ascending: false })
    .limit(1);

  if (sessions && sessions.length > 0) {
    const session = sessions[0];
    const age = Date.now() - new Date(session.last_used_at).getTime();
    if (age < 30 * 60 * 1000) {
      await supabase
        .from("spot_sessions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", session.id);
      return session.session_cookie;
    }
    // Mark expired session as invalid
    await supabase
      .from("spot_sessions")
      .update({ is_valid: false })
      .eq("id", session.id);
  }

  return await loginToSpot(supabase);
}

async function loginToSpot(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const username = Deno.env.get("SPOT_USERNAME");
  const password = Deno.env.get("SPOT_PASSWORD");

  if (!username || !password) {
    throw new Error("Credenciais SPOT não configuradas no backend");
  }

  const loginUrl = `${SPOT_BASE}/${LANG}/area-reservada/login/`;

  // GET initial page to obtain PHPSESSID
  const initRes = await fetch(loginUrl, { redirect: "manual" });
  const initCookies = initRes.headers.get("set-cookie") || "";
  const phpSessionMatch = initCookies.match(/PHPSESSID=([^;]+)/);
  let sessionId = phpSessionMatch ? phpSessionMatch[1] : "";

  if (!sessionId) {
    throw new Error("Não foi possível obter sessão inicial do SPOT");
  }

  // POST login
  const formData = new URLSearchParams();
  formData.append("login", username);
  formData.append("pwd", password);
  formData.append("subm", "true");

  const loginRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `PHPSESSID=${sessionId}`,
    },
    body: formData.toString(),
    redirect: "manual",
  });

  // Check for new session cookie
  const loginCookies = loginRes.headers.get("set-cookie") || "";
  const newSession = loginCookies.match(/PHPSESSID=([^;]+)/);
  if (newSession) {
    sessionId = newSession[1];
  }

  const status = loginRes.status;

  // A 302/301 redirect is the expected success response
  if (status === 302 || status === 301) {
    const location = loginRes.headers.get("location") || "";
    // If redirected back to login, credentials are wrong
    if (location.includes("login")) {
      throw new Error("Credenciais SPOT inválidas — login rejeitado");
    }
  } else if (status === 200) {
    // 200 means the login page was returned — check for error indicators
    const body = (await loginRes.text()).toLowerCase();
    if (body.includes("erro") || body.includes("incorret") || body.includes("inválid") || body.includes("invalid")) {
      throw new HttpError(403, "Credenciais SPOT inválidas");
    }
  } else {
    throw new Error(`SPOT login falhou com status ${status}`);
  }

  // Invalidate all old sessions before storing new one
  await supabase
    .from("spot_sessions")
    .update({ is_valid: false })
    .eq("is_valid", true);

  // Store new session
  const cookie = `PHPSESSID=${sessionId}`;
  await supabase.from("spot_sessions").insert({
    session_cookie: cookie,
    is_valid: true,
  });

  return cookie;
}

async function spotFetch(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookie = await getSpotSession(supabase);

  const headers: Record<string, string> = {
    Cookie: cookie,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    redirect: "manual",
  });

  // If redirected to login, re-authenticate
  const location = res.headers.get("location") || "";
  if (location.includes("login") || location.includes("area-reservada")) {
    // Invalidate all sessions
    await supabase
      .from("spot_sessions")
      .update({ is_valid: false })
      .eq("is_valid", true);

    const newCookie = await loginToSpot(supabase);
    return fetch(url, {
      ...options,
      headers: { ...headers, Cookie: newCookie },
      redirect: "manual",
    });
  }

  return res;
}

function assertObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `Parâmetro '${fieldName}' inválido`);
  }

  return value as Record<string, unknown>;
}

function readRequiredString(value: unknown, fieldName: string, maxLength = 200): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `Parâmetro '${fieldName}' é obrigatório`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `Parâmetro '${fieldName}' é obrigatório`);
  }

  return trimmed.slice(0, maxLength);
}

function readOptionalString(value: unknown, fieldName: string, maxLength = 200): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return readRequiredString(value, fieldName, maxLength);
}

function readPositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new HttpError(400, `Parâmetro '${fieldName}' deve ser um inteiro >= 1`);
  }

  return value;
}

function readStringArray(value: unknown, fieldName: string, maxItems = 20, maxLength = 50): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, `Parâmetro '${fieldName}' deve ser uma lista`);
  }

  if (value.length > maxItems) {
    throw new HttpError(400, `Parâmetro '${fieldName}' excede limite de itens`);
  }

  return value.map((item, index) => readRequiredString(item, `${fieldName}[${index}]`, maxLength));
}

function readCatalogFilters(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};

  const filtersObject = assertObject(value, "filters");
  const filters: Record<string, string> = {};

  for (const [key, filterValue] of Object.entries(filtersObject)) {
    if (typeof filterValue !== "string") continue;

    const sanitizedKey = key.trim().slice(0, 50);
    const sanitizedValue = filterValue.trim().slice(0, 120);
    if (sanitizedKey && sanitizedValue) {
      filters[sanitizedKey] = sanitizedValue;
    }
  }

  return filters;
}

function readOrderYear(value: unknown): string | undefined {
  const year = readOptionalString(value, "year", 4);
  if (!year) return undefined;
  if (!/^\d{4}$/.test(year)) {
    throw new HttpError(400, "Parâmetro 'year' inválido");
  }
  return year;
}

function readOrderPage(value: unknown): string | undefined {
  const page = readOptionalString(value, "page", 4);
  if (!page) return undefined;
  if (!/^\d{1,4}$/.test(page)) {
    throw new HttpError(400, "Parâmetro 'page' inválido");
  }
  return page;
}

function readRequestAction(body: Record<string, unknown>): SpotAction {
  const actionValue = body.action;

  if (typeof actionValue !== "string" || !VALID_ACTIONS.has(actionValue as SpotAction)) {
    throw new HttpError(400, `Ação inválida: ${String(actionValue)}`);
  }

  return actionValue as SpotAction;
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return assertObject(body, "body");
  } catch {
    throw new HttpError(400, "Payload JSON inválido");
  }
}

// HANDLERS

async function handleSearch(supabase: ReturnType<typeof getSupabaseAdmin>, query: string) {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("Parâmetro 'query' é obrigatório para pesquisa");
  }
  const sanitized = query.trim().substring(0, 200);
  const url = `${SPOT_BASE}/${LANG}/catalogo/ajax/pesquisar.php?ajax=1&q=${encodeURIComponent(sanitized)}`;
  const res = await spotFetch(supabase, url);
  return await res.json();
}

async function handleCatalog(supabase: ReturnType<typeof getSupabaseAdmin>, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const url = `${SPOT_BASE}/${LANG}/catalogo/?${searchParams.toString()}`;
  const res = await spotFetch(supabase, url);
  const html = await res.text();
  const products = parseProductsFromHTML(html);
  return { products, total: products.length };
}

function parseProductsFromHTML(html: string): Array<Record<string, unknown>> {
  const products: Array<Record<string, unknown>> = [];
  const productPattern = /data-prod="(\d+)".*?data-iderp="(\d+)".*?<img[^>]*src="([^"]*)".*?class="product-name"[^>]*>([^<]*)</gs;

  let match;
  while ((match = productPattern.exec(html)) !== null) {
    products.push({
      id: match[1],
      ref: match[2],
      image: match[3].startsWith("http") ? match[3] : `${SPOT_BASE}${match[3]}`,
      name: match[4].trim(),
    });
  }

  if (products.length === 0) {
    const simplePattern = /href="\/pt\/catalogo\/([^/]+)\/(\d+)\/"[^>]*>.*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/gs;
    while ((match = simplePattern.exec(html)) !== null) {
      products.push({
        id: match[2],
        ref: match[2],
        slug: match[1],
        image: match[3].startsWith("http") ? match[3] : `${SPOT_BASE}${match[3]}`,
        name: match[4].trim(),
      });
    }
  }

  return products;
}

async function handleProductDetail(supabase: ReturnType<typeof getSupabaseAdmin>, productId: string) {
  if (!productId || typeof productId !== "string") {
    throw new Error("Parâmetro 'productId' é obrigatório");
  }

  const searchRes = await handleSearch(supabase, productId);
  let productUrl = "";

  if (searchRes.search && searchRes.search.length > 0) {
    productUrl = `${SPOT_BASE}${searchRes.search[0].value}`;
  } else {
    productUrl = `${SPOT_BASE}/${LANG}/catalogo/produto/${encodeURIComponent(productId)}/`;
  }

  const res = await spotFetch(supabase, productUrl);
  const html = await res.text();
  return parseProductDetailFromHTML(html, productId);
}

function parseProductDetailFromHTML(html: string, productId: string): Record<string, unknown> {
  const detail: Record<string, unknown> = { id: productId };

  const nameMatch = html.match(/<h1[^>]*class="[^"]*product-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (nameMatch) detail.name = nameMatch[1].replace(/<[^>]+>/g, "").trim();

  const refMatch = html.match(/data-iderp="(\d+)"/);
  if (refMatch) detail.ref = refMatch[1];

  const priceMatch = html.match(/data-original="([\d.]+)"/);
  if (priceMatch) detail.price = parseFloat(priceMatch[1]);

  const stockMatch = html.match(/data-stock-total="(\d+)"/);
  if (stockMatch) detail.stock = parseInt(stockMatch[1]);

  const stockActualMatch = html.match(/data-stock-actual="(\d+)"/);
  if (stockActualMatch) detail.stockActual = parseInt(stockActualMatch[1]);

  const stepMatch = html.match(/data-step="(\d+)"/);
  if (stepMatch) detail.step = parseInt(stepMatch[1]);

  const imgMatch = html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]*)"/i)
    || html.match(/<img[^>]*id="[^"]*main[^"]*"[^>]*src="([^"]*)"/i);
  if (imgMatch) detail.image = imgMatch[1].startsWith("http") ? imgMatch[1] : `${SPOT_BASE}${imgMatch[1]}`;

  const colors: Array<{id: string; name: string; hex: string}> = [];
  const colorPattern = /data-cor-id="(\d+)"[^>]*data-cor-hex="([^"]*)"[^>]*title="([^"]*)"/g;
  let colorMatch;
  while ((colorMatch = colorPattern.exec(html)) !== null) {
    colors.push({ id: colorMatch[1], name: colorMatch[3], hex: colorMatch[2] });
  }
  if (colors.length > 0) detail.colors = colors;

  return detail;
}

async function handleStockCheck(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  productId: string,
  quantity: number,
  opcionais: string[]
) {
  if (!productId) throw new Error("Parâmetro 'productId' é obrigatório");
  if (!quantity || quantity < 1) throw new Error("Quantidade deve ser >= 1");

  const url = `${SPOT_BASE}/${LANG}/catalogo/catalogo.ajax.php`;
  const formData = new URLSearchParams();
  formData.append("method", "getSemaforo");
  formData.append("params[qtd]", quantity.toString());
  formData.append("params[prod]", productId);
  if (opcionais.length > 0) {
    opcionais.forEach((op, i) => formData.append(`params[opcionais][${i}]`, op));
  }

  const res = await spotFetch(supabase, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  return await res.json();
}

async function handleAddToCart(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  productId: string,
  quantity: number,
  opcional0: string,
  opcional1: string
) {
  if (!productId) throw new Error("Parâmetro 'productId' é obrigatório");
  if (!quantity || quantity < 1) throw new Error("Quantidade deve ser >= 1");

  const url = `${SPOT_BASE}/${LANG}/produto/ajax/adicionaCarrinho.php?prod=${encodeURIComponent(productId)}&ajax=1&todos=0`;
  const formData = new URLSearchParams();
  formData.append("opcional[0]", opcional0 || "0");
  formData.append("opcional[1]", opcional1 || "0");
  formData.append("qtd", quantity.toString());

  const res = await spotFetch(supabase, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const data = await res.json();
  return { success: true, ...data };
}

async function handleGetCart(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const url = `${SPOT_BASE}/${LANG}/loja/carrinho/`;
  const res = await spotFetch(supabase, url);
  const html = await res.text();
  return parseCartFromHTML(html);
}

function parseCartFromHTML(html: string): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [];

  const itemPattern = /data-compra="(\d+)"[\s\S]*?data-ref-composta="([^"]*)"[\s\S]*?data-original="([\d.]+)"[\s\S]*?data-stock-atual-mult="(\d+)"/g;
  let match;
  while ((match = itemPattern.exec(html)) !== null) {
    items.push({
      groupId: match[1],
      ref: match[2],
      unitPrice: parseFloat(match[3]),
      stockAvailable: parseInt(match[4]),
    });
  }

  const totalMatch = html.match(/id="dtotal"[^>]*>([\s\S]*?)<\/span>/i);
  const total = totalMatch ? totalMatch[1].replace(/[^\d.,]/g, "").replace(",", ".") : "0";

  const hashMatch = html.match(/name="carrinho_hash"\s+value="([^"]*)"/);

  return {
    items,
    total: parseFloat(total),
    hash: hashMatch ? hashMatch[1] : null,
    itemCount: items.length,
  };
}

async function handleRemoveFromCart(supabase: ReturnType<typeof getSupabaseAdmin>, groupId: string) {
  if (!groupId) throw new Error("Parâmetro 'groupId' é obrigatório");
  const url = `${SPOT_BASE}/${LANG}/calculos/ajax/actualizarGrupoProduto.php?action=del&id=${encodeURIComponent(groupId)}`;
  const res = await spotFetch(supabase, url);
  return { success: res.status === 200 || res.status === 302 };
}

async function handleUpdateCartQty(supabase: ReturnType<typeof getSupabaseAdmin>, groupId: string, quantity: number) {
  if (!groupId) throw new Error("Parâmetro 'groupId' é obrigatório");
  if (!quantity || quantity < 1) throw new Error("Quantidade deve ser >= 1");

  const url = `${SPOT_BASE}/${LANG}/calculos/ajax/actualizarGrupoProduto.php?id=${encodeURIComponent(groupId)}`;
  const formData = new URLSearchParams();
  formData.append("qtd", quantity.toString());

  const res = await spotFetch(supabase, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  return { success: res.status === 200 || res.status === 302 };
}

async function handleGetOrders(supabase: ReturnType<typeof getSupabaseAdmin>, year?: string, page?: string) {
  let url = `${SPOT_BASE}/${LANG}/clientes/encomendas/`;
  const params = new URLSearchParams();
  if (year) params.append("ano", year);
  if (page) params.append("p", page);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await spotFetch(supabase, url);
  const html = await res.text();
  const orders = parseOrdersFromHTML(html);

  // Cache orders in DB (fire-and-forget, don't block response)
  for (const order of orders) {
    supabase
      .from("spot_pedidos")
      .upsert(
        {
          spot_order_id: order.id as string,
          status: order.status as string,
          status_color: order.statusColor as string,
          referencia_cliente: (order.reference as string) || null,
          data_pedido: (order.date as string) || null,
          valor_total: (order.total as number) || 0,
          transportadora: (order.carrier as string) || null,
          codigo_rastreamento: (order.tracking as string) || null,
          detalhes_url: (order.detailsUrl as string) || null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "spot_order_id" }
      )
      .catch((cacheError: unknown) => {
        const message = cacheError instanceof Error ? cacheError.message : "Erro desconhecido";
        console.error("Falha ao sincronizar cache de pedidos SPOT:", message);
      });
  }

  return { orders, totalPages: parseTotalPages(html) };
}

function parseOrdersFromHTML(html: string): Array<Record<string, unknown>> {
  const orders: Array<Record<string, unknown>> = [];

  const statusColors: Record<string, string> = {
    "#00B3B2": "Submetida",
    "#808080": "Em processamento",
    "#EEAD2D": "Processada",
    "#FF7F00": "Aguardando Pagamento",
    "#3ab37a": "Pago",
    "#c206c2": "Pendencia Layout",
    "#A8E3A8": "Em Separação",
    "#1bde86": "Em Produção",
    "#2DB200": "Expedida",
    "#DC0000": "Anulada",
  };

  const rowPattern = /<tr[^>]*class="[^"]*tr[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];

    const colorMatch = row.match(/background-color:\s*(#[0-9A-Fa-f]{6})/);
    const statusColor = colorMatch ? colorMatch[1] : "";
    const status = statusColors[statusColor] || "Desconhecido";

    const numMatch = row.match(/<td[^>]*>(\d{5,})<\/td>/);
    const orderId = numMatch ? numMatch[1] : "";

    const refMatch = row.match(/<td[^>]*class="[^"]*ref[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    const reference = refMatch ? refMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const dateMatch = row.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    const date = dateMatch ? dateMatch[1] : "";

    const totalMatch = row.match(/R\$\s*([\d.,]+)/);
    const total = totalMatch ? parseFloat(totalMatch[1].replace(".", "").replace(",", ".")) : 0;

    const detailsMatch = row.match(/href="([^"]*encomenda_id=\d+[^"]*)"/);
    const detailsUrl = detailsMatch ? detailsMatch[1] : "";

    const trackingMatch = row.match(/tracking[^>]*>([\s\S]*?)<\/td>/i);
    const tracking = trackingMatch ? trackingMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const carrierMatch = row.match(/transportadora[^>]*>([\s\S]*?)<\/td>/i);
    const carrier = carrierMatch ? carrierMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    if (orderId) {
      orders.push({
        id: orderId,
        status,
        statusColor,
        reference,
        date,
        total,
        detailsUrl: detailsUrl ? `${SPOT_BASE}${detailsUrl}` : "",
        tracking,
        carrier,
      });
    }
  }

  return orders;
}

function parseTotalPages(html: string): number {
  const pageMatch = html.match(/\?p=(\d+)/g);
  if (pageMatch) {
    const pages = pageMatch.map(p => parseInt(p.replace("?p=", "")));
    return Math.max(...pages, 1);
  }
  return 1;
}

async function handleGetFinancialDocs(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const url = `${SPOT_BASE}/${LANG}/clientes/documentos/`;
  const res = await spotFetch(supabase, url);
  const html = await res.text();
  return parseFinancialDocsFromHTML(html);
}

function parseFinancialDocsFromHTML(html: string): Record<string, unknown> {
  const docs: Array<Record<string, unknown>> = [];
  const hasOverdue = html.includes("vencida") || html.includes("Atenção");

  const rowPattern = /<tr[^>]*class="[^"]*tr[^"]*(?:vencida)?[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const row = match[1];
    const isOverdue = match[0].includes("vencida");

    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const values = cells.map(c => c.replace(/<[^>]+>/g, "").trim());

    const downloadMatch = row.match(/download\.php\?id=(\d+)/);
    const downloadId = downloadMatch ? downloadMatch[1] : null;

    if (values.length >= 5) {
      docs.push({
        docNumber: values[0] || "",
        orderNumber: values[1] || "",
        date: values[2] || "",
        dueDate: values[3] || "",
        amount: values[4] || "",
        status: isOverdue ? "Vencida" : (values[5] || ""),
        downloadUrl: downloadId ? `${SPOT_BASE}/${LANG}/clientes/documentos/download.php?id=${downloadId}` : null,
        isOverdue,
      });
    }
  }

  return { documents: docs, hasOverdue, total: docs.length };
}

async function handleCheckout(supabase: ReturnType<typeof getSupabaseAdmin>, addressId: string) {
  const destinoUrl = `${SPOT_BASE}/${LANG}/loja/destino/`;
  const destinoRes = await spotFetch(supabase, destinoUrl);
  const destinoHtml = await destinoRes.text();

  const hashMatch = destinoHtml.match(/name="carrinho_hash"\s+value="([^"]*)"/);
  const hash = hashMatch ? hashMatch[1] : "";

  const addresses: Array<{id: string; label: string}> = [];
  const addrPattern = /<option\s+value="(\d+)"[^>]*>([\s\S]*?)<\/option>/g;
  let addrMatch;
  while ((addrMatch = addrPattern.exec(destinoHtml)) !== null) {
    if (addrMatch[1] !== "") {
      addresses.push({ id: addrMatch[1], label: addrMatch[2].replace(/<[^>]+>/g, "").trim() });
    }
  }

  return {
    hash,
    addresses,
    checkoutUrl: destinoUrl,
  };
}

// MAIN HANDLER
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify authentication BEFORE processing
    await verifyAuth(req, supabase);

    const body = await readJsonBody(req);
    const action = readRequestAction(body);

    let result: unknown;

    switch (action) {
      case "search":
        result = await handleSearch(supabase, readRequiredString(body.query, "query", 200));
        break;
      case "catalog":
        result = await handleCatalog(supabase, readCatalogFilters(body.filters));
        break;
      case "product":
        result = await handleProductDetail(supabase, readRequiredString(body.productId, "productId", 120));
        break;
      case "stock":
        result = await handleStockCheck(
          supabase,
          readRequiredString(body.productId, "productId", 120),
          readPositiveInteger(body.quantity, "quantity"),
          readStringArray(body.opcionais, "opcionais")
        );
        break;
      case "addToCart":
        result = await handleAddToCart(
          supabase,
          readRequiredString(body.productId, "productId", 120),
          readPositiveInteger(body.quantity, "quantity"),
          readOptionalString(body.opcional0, "opcional0", 30) ?? "0",
          readOptionalString(body.opcional1, "opcional1", 30) ?? "0"
        );
        break;
      case "getCart":
        result = await handleGetCart(supabase);
        break;
      case "removeFromCart":
        result = await handleRemoveFromCart(supabase, readRequiredString(body.groupId, "groupId", 120));
        break;
      case "updateCartQty":
        result = await handleUpdateCartQty(
          supabase,
          readRequiredString(body.groupId, "groupId", 120),
          readPositiveInteger(body.quantity, "quantity")
        );
        break;
      case "orders":
        result = await handleGetOrders(supabase, readOrderYear(body.year), readOrderPage(body.page));
        break;
      case "financial":
        result = await handleGetFinancialDocs(supabase);
        break;
      case "checkout":
        result = await handleCheckout(supabase, readOptionalString(body.addressId, "addressId", 60) ?? "");
        break;
      case "login":
        await loginToSpot(supabase);
        result = { success: true };
        break;
      default:
        throw new HttpError(400, `Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    const status = error instanceof HttpError ? error.status : 500;
    console.error("SPOT proxy error:", msg);

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
