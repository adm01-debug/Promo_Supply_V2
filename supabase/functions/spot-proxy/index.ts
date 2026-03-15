import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPOT_BASE = "https://www.spotgifts.com.br";
const LANG = "pt";

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

// Get or create a valid SPOT session
async function getSpotSession(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  // Try to get existing valid session
  const { data: sessions } = await supabase
    .from("spot_sessions")
    .select("*")
    .eq("is_valid", true)
    .order("last_used_at", { ascending: false })
    .limit(1);

  if (sessions && sessions.length > 0) {
    const session = sessions[0];
    // Check if session is less than 30 minutes old
    const age = Date.now() - new Date(session.last_used_at).getTime();
    if (age < 30 * 60 * 1000) {
      // Update last_used_at
      await supabase
        .from("spot_sessions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", session.id);
      return session.session_cookie;
    }
    // Mark old session as invalid
    await supabase
      .from("spot_sessions")
      .update({ is_valid: false })
      .eq("id", session.id);
  }

  // Login to SPOT
  return await loginToSpot(supabase);
}

async function loginToSpot(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const username = Deno.env.get("SPOT_USERNAME");
  const password = Deno.env.get("SPOT_PASSWORD");

  if (!username || !password) {
    throw new Error("SPOT credentials not configured");
  }

  const loginUrl = `${SPOT_BASE}/${LANG}/area-reservada/login/`;

  // First GET to get initial PHPSESSID
  const initRes = await fetch(loginUrl, { redirect: "manual" });
  const initCookies = initRes.headers.get("set-cookie") || "";
  const phpSessionMatch = initCookies.match(/PHPSESSID=([^;]+)/);
  let sessionId = phpSessionMatch ? phpSessionMatch[1] : "";

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

  // Verify login was successful (should be 302 redirect)
  const status = loginRes.status;
  if (status !== 302 && status !== 301 && status !== 200) {
    throw new Error(`SPOT login failed with status ${status}`);
  }

  // Store session
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
    // Invalidate current session
    await supabase
      .from("spot_sessions")
      .update({ is_valid: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Re-login and retry
    const newCookie = await loginToSpot(supabase);
    return fetch(url, {
      ...options,
      headers: { ...headers, Cookie: newCookie },
      redirect: "manual",
    });
  }

  return res;
}

// HANDLERS

async function handleSearch(supabase: ReturnType<typeof getSupabaseAdmin>, query: string) {
  const url = `${SPOT_BASE}/${LANG}/catalogo/ajax/pesquisar.php?ajax=1&q=${encodeURIComponent(query)}`;
  const res = await spotFetch(supabase, url);
  const data = await res.json();
  return data;
}

async function handleCatalog(supabase: ReturnType<typeof getSupabaseAdmin>, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const url = `${SPOT_BASE}/${LANG}/catalogo/?${searchParams.toString()}`;
  const res = await spotFetch(supabase, url);
  const html = await res.text();

  // Parse product cards from HTML
  const products = parseProductsFromHTML(html);
  return { products, total: products.length };
}

function parseProductsFromHTML(html: string): Array<Record<string, unknown>> {
  const products: Array<Record<string, unknown>> = [];
  // Match product blocks — simplified regex-based parser
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

  // Fallback: try to extract from a simpler pattern if above fails
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
  // Try to find product URL first
  const searchRes = await handleSearch(supabase, productId);
  let productUrl = "";

  if (searchRes.search && searchRes.search.length > 0) {
    productUrl = `${SPOT_BASE}${searchRes.search[0].value}`;
  } else {
    productUrl = `${SPOT_BASE}/${LANG}/catalogo/produto/${productId}/`;
  }

  const res = await spotFetch(supabase, productUrl);
  const html = await res.text();

  // Extract product details from HTML
  const detail = parseProductDetailFromHTML(html, productId);
  return detail;
}

function parseProductDetailFromHTML(html: string, productId: string): Record<string, unknown> {
  const detail: Record<string, unknown> = { id: productId };

  // Extract product name
  const nameMatch = html.match(/<h1[^>]*class="[^"]*product-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (nameMatch) detail.name = nameMatch[1].replace(/<[^>]+>/g, "").trim();

  // Extract reference
  const refMatch = html.match(/data-iderp="(\d+)"/);
  if (refMatch) detail.ref = refMatch[1];

  // Extract price (if visible)
  const priceMatch = html.match(/data-original="([\d.]+)"/);
  if (priceMatch) detail.price = parseFloat(priceMatch[1]);

  // Extract stock info
  const stockMatch = html.match(/data-stock-total="(\d+)"/);
  if (stockMatch) detail.stock = parseInt(stockMatch[1]);

  const stockActualMatch = html.match(/data-stock-actual="(\d+)"/);
  if (stockActualMatch) detail.stockActual = parseInt(stockActualMatch[1]);

  // Extract step
  const stepMatch = html.match(/data-step="(\d+)"/);
  if (stepMatch) detail.step = parseInt(stepMatch[1]);

  // Extract main image
  const imgMatch = html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]*)"/i)
    || html.match(/<img[^>]*id="[^"]*main[^"]*"[^>]*src="([^"]*)"/i);
  if (imgMatch) detail.image = imgMatch[1].startsWith("http") ? imgMatch[1] : `${SPOT_BASE}${imgMatch[1]}`;

  // Extract colors/variants
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
  const url = `${SPOT_BASE}/${LANG}/produto/ajax/adicionaCarrinho.php?prod=${productId}&ajax=1&todos=0`;
  const formData = new URLSearchParams();
  formData.append("opcional[0]", opcional0);
  formData.append("opcional[1]", opcional1 || "0");
  formData.append("qtd", quantity.toString());

  const res = await spotFetch(supabase, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  return await res.json();
}

async function handleGetCart(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const url = `${SPOT_BASE}/${LANG}/loja/carrinho/`;
  const res = await spotFetch(supabase, url);
  const html = await res.text();
  return parseCartFromHTML(html);
}

function parseCartFromHTML(html: string): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [];

  // Parse cart items
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

  // Parse totals
  const totalMatch = html.match(/id="dtotal"[^>]*>([\s\S]*?)<\/span>/i);
  const total = totalMatch ? totalMatch[1].replace(/[^\d.,]/g, "").replace(",", ".") : "0";

  // Parse cart hash
  const hashMatch = html.match(/name="carrinho_hash"\s+value="([^"]*)"/);

  return {
    items,
    total: parseFloat(total),
    hash: hashMatch ? hashMatch[1] : null,
    itemCount: items.length,
  };
}

async function handleRemoveFromCart(supabase: ReturnType<typeof getSupabaseAdmin>, groupId: string) {
  const url = `${SPOT_BASE}/${LANG}/calculos/ajax/actualizarGrupoProduto.php?action=del&id=${groupId}`;
  const res = await spotFetch(supabase, url);
  return { success: res.status === 200 || res.status === 302 };
}

async function handleUpdateCartQty(supabase: ReturnType<typeof getSupabaseAdmin>, groupId: string, quantity: number) {
  const url = `${SPOT_BASE}/${LANG}/calculos/ajax/actualizarGrupoProduto.php?id=${groupId}`;
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

  // Cache orders in DB
  for (const order of orders) {
    await supabase
      .from("spot_pedidos")
      .upsert(
        {
          spot_order_id: order.id as string,
          status: order.status as string,
          status_color: order.statusColor as string,
          referencia_cliente: order.reference as string || null,
          data_pedido: order.date as string || null,
          valor_total: order.total as number || 0,
          transportadora: order.carrier as string || null,
          codigo_rastreamento: order.tracking as string || null,
          detalhes_url: order.detailsUrl as string || null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "spot_order_id" }
      );
  }

  return { orders, totalPages: parseTotalPages(html) };
}

function parseOrdersFromHTML(html: string): Array<Record<string, unknown>> {
  const orders: Array<Record<string, unknown>> = [];

  // Status color mapping
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

  // Parse table rows — each <tr> contains order data
  const rowPattern = /<tr[^>]*class="[^"]*tr[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];

    // Extract status color from span style
    const colorMatch = row.match(/background-color:\s*(#[0-9A-Fa-f]{6})/);
    const statusColor = colorMatch ? colorMatch[1] : "";
    const status = statusColors[statusColor] || "Desconhecido";

    // Extract order number
    const numMatch = row.match(/<td[^>]*>(\d{5,})<\/td>/);
    const orderId = numMatch ? numMatch[1] : "";

    // Extract reference
    const refMatch = row.match(/<td[^>]*class="[^"]*ref[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    const reference = refMatch ? refMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // Extract date
    const dateMatch = row.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    const date = dateMatch ? dateMatch[1] : "";

    // Extract total
    const totalMatch = row.match(/R\$\s*([\d.,]+)/);
    const total = totalMatch ? parseFloat(totalMatch[1].replace(".", "").replace(",", ".")) : 0;

    // Extract details URL
    const detailsMatch = row.match(/href="([^"]*encomenda_id=\d+[^"]*)"/);
    const detailsUrl = detailsMatch ? detailsMatch[1] : "";

    // Extract tracking
    const trackingMatch = row.match(/tracking[^>]*>([\s\S]*?)<\/td>/i);
    const tracking = trackingMatch ? trackingMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // Extract carrier
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

    // Extract download link
    const downloadMatch = row.match(/download\.php\?id=(\d+)/);
    const downloadId = downloadMatch ? downloadMatch[1] : null;

    if (values.length >= 4) {
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
  // Step 1: Go to destino page
  const destinoUrl = `${SPOT_BASE}/${LANG}/loja/destino/`;
  const destinoRes = await spotFetch(supabase, destinoUrl);
  const destinoHtml = await destinoRes.text();

  // Extract hash
  const hashMatch = destinoHtml.match(/name="carrinho_hash"\s+value="([^"]*)"/);
  const hash = hashMatch ? hashMatch[1] : "";

  // Extract available addresses
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

  try {
    const supabase = getSupabaseAdmin();
    const { action, ...params } = await req.json();

    let result: unknown;

    switch (action) {
      case "search":
        result = await handleSearch(supabase, params.query);
        break;
      case "catalog":
        result = await handleCatalog(supabase, params.filters || {});
        break;
      case "product":
        result = await handleProductDetail(supabase, params.productId);
        break;
      case "stock":
        result = await handleStockCheck(supabase, params.productId, params.quantity, params.opcionais || []);
        break;
      case "addToCart":
        result = await handleAddToCart(supabase, params.productId, params.quantity, params.opcional0, params.opcional1);
        break;
      case "getCart":
        result = await handleGetCart(supabase);
        break;
      case "removeFromCart":
        result = await handleRemoveFromCart(supabase, params.groupId);
        break;
      case "updateCartQty":
        result = await handleUpdateCartQty(supabase, params.groupId, params.quantity);
        break;
      case "orders":
        result = await handleGetOrders(supabase, params.year, params.page);
        break;
      case "financial":
        result = await handleGetFinancialDocs(supabase);
        break;
      case "checkout":
        result = await handleCheckout(supabase, params.addressId);
        break;
      case "login":
        await loginToSpot(supabase);
        result = { success: true };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("SPOT proxy error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
