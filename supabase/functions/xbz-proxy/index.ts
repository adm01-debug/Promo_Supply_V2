/**
 * xbz-proxy — proxy seguro para a API XBZ Brindes.
 *
 * Regras:
 *  - POST obrigatório (405 nos demais métodos)
 *  - JWT validado em código; tenant resolvido de `user_tenants` (nunca do body)
 *  - Papéis: leitura = admin/coordinator/buyer/approver/viewer(conforme ação)
 *            escrita de carrinho = buyer+; gerarPedidos = admin/coordinator
 *  - Credenciais decifradas apenas no servidor, nunca retornadas ao browser
 *  - Toda escrita é auditada em `xbz_carrinho_log`
 */
import { corsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import {
  authenticate,
  loadCredentials,
  logCartOperation,
  requirePortalPermission,
  requireRole,
  serviceClient,
  type ResolvedCredentials,
  type XbzCaller,
} from "../_shared/xbz_auth.ts";
import { encryptSecret } from "../_shared/xbz_crypto.ts";
import { mirrorCatalogo, readCatalogoCacheWithMeta } from "../_shared/xbz_catalog_cache.ts";

import {
  extractPermissions,
  XbzError,
  xbzCarrinhoGet,
  xbzCarrinhoWrite,
  xbzConsultaEstoque,
  xbzConsultaPedidos,
  xbzCores,
  xbzDashboard,
  xbzGetSt,
  xbzLogin,
  xbzPessoaToken,
  type XbzResult,
} from "../_shared/xbz_client.ts";

const READ_ROLES = ["admin", "coordinator", "buyer", "approver"] as const;
const WRITE_ROLES = ["admin", "coordinator", "buyer"] as const;
const ORDER_ROLES = ["admin", "coordinator"] as const;

const READ_ACTIONS = new Set([
  "login", "dashboard", "pessoaToken", "vendedor", "creditoLimite", "empresasGrupo",
  "pedidos", "pedidoDetalhe", "catalogo", "cores", "fiscalSt",
  "carrinhoResumo", "carrinhoListar", "entregaTipos", "pagamentoTipos",
  "credentialsStatus",
]);

const WRITE_ACTIONS = new Set([
  "itemLancar", "itemAlterar", "itemAlterarQuantidade", "itemRemover", "cancelarPedido",
]);

const ORDER_ACTIONS = new Set(["gerarPedidos"]);
const ADMIN_ACTIONS = new Set(["saveCredentials", "testConnection"]);

const VALID_ACTIONS = new Set([
  ...READ_ACTIONS,
  ...WRITE_ACTIONS,
  ...ORDER_ACTIONS,
  ...ADMIN_ACTIONS,
]);

/**
 * Limites por ação. Ações que geram efeito colateral irreversível na XBZ
 * (gerar/cancelar pedido, salvar credenciais) recebem janelas bem mais
 * estreitas do que leituras de catálogo.
 */
const ACTION_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  gerarPedidos: { maxRequests: 3, windowSeconds: 60 },
  cancelarPedido: { maxRequests: 5, windowSeconds: 60 },
  saveCredentials: { maxRequests: 5, windowSeconds: 300 },
  testConnection: { maxRequests: 10, windowSeconds: 300 },
  login: { maxRequests: 20, windowSeconds: 60 },
  catalogo: { maxRequests: 40, windowSeconds: 60 },
};
const DEFAULT_LIMIT = { maxRequests: 60, windowSeconds: 60 };

/** Janela de deduplicação para geração de pedidos (double-submit / retry). */
const GERAR_PEDIDOS_DEDUP_SECONDS = 30;

interface Body {
  action?: string;
  [key: string]: unknown;
}


function json(payload: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...buildResponseHeaders(corsHeaders), ...extra },
  });
}

function ok<T>(result: XbzResult<T>, requestId: string) {
  return json(
    {
      data: result.data,
      stockConflict: result.stockConflict,
      warning: result.stockConflict
        ? "Conflito de estoque: a XBZ ajustou o item. Confira a quantidade."
        : null,
      requestId,
    },
    200,
  );
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// deno-lint-ignore no-explicit-any
async function handleAction(
  action: string,
  body: Body,
  caller: XbzCaller,
  admin: ReturnType<typeof serviceClient>,
  logger: EdgeLogger,
  requestId: string,
): Promise<Response> {
  // --- Ações administrativas (não exigem credenciais previamente salvas) ---
  if (action === "saveCredentials") {
    requireRole(caller, ["admin"]);
    const user = String(body.portalUser ?? "").trim();
    const password = String(body.portalPassword ?? "").trim();
    const cnpj = String(body.cnpj ?? "").replace(/\D/g, "") || null;
    if (user.length < 3 || user.length > 100) throw new XbzError(400, "Usuário do portal inválido");
    if (password.length < 3 || password.length > 200) throw new XbzError(400, "Senha do portal inválida");
    if (cnpj && cnpj.length !== 14) throw new XbzError(400, "CNPJ deve ter 14 dígitos");

    // Valida contra a XBZ antes de persistir.
    const login = await xbzLogin({ user, password });

    const [userEnc, passEnc] = await Promise.all([
      encryptSecret(user),
      encryptSecret(password),
    ]);

    const { error } = await admin.from("xbz_credentials").upsert({
      tenant_id: caller.tenantId,
      label: String(body.label ?? "") || null,
      portal_user_enc: userEnc,
      portal_password_enc: passEnc,
      cnpj,
      pessoa_id: login.Id,
      razao_social: login.RazaoSocialNome,
      permissions: extractPermissions(login),
      is_active: true,
      last_login_at: new Date().toISOString(),
      last_login_ok: true,
      last_error: null,
      created_by: caller.userId,
      deleted_at: null,
    }, { onConflict: "tenant_id" });

    if (error) throw new XbzError(500, `Falha ao salvar credenciais: ${error.message}`);

    logger.info("credenciais XBZ salvas", { tenantId: caller.tenantId, pessoaId: login.Id });
    return json({
      data: {
        pessoaId: login.Id,
        razaoSocial: login.RazaoSocialNome,
        bloqueado: login.Bloqueado === true,
        permissions: extractPermissions(login),
      },
      requestId,
    });
  }

  if (action === "credentialsStatus") {
    requireRole(caller, READ_ROLES);
    const { data } = await admin
      .from("xbz_credentials")
      .select("pessoa_id, cnpj, razao_social, permissions, is_active, last_login_at, last_login_ok, last_error, label")
      .eq("tenant_id", caller.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    return json({ data: data ?? null, requestId });
  }

  if (action === "cores") {
    requireRole(caller, READ_ROLES);
    const result = await xbzCores();
    return ok(result, requestId);
  }

  // --- A partir daqui, todas as ações exigem credenciais do tenant ---
  const creds: ResolvedCredentials = await loadCredentials(admin, caller.tenantId);
  const portal = creds.portal;

  if (action === "testConnection" || action === "login") {
    requireRole(caller, action === "testConnection" ? ["admin"] : READ_ROLES);
    const login = await xbzLogin(portal);
    const permissions = extractPermissions(login);
    await admin.from("xbz_credentials")
      .update({
        pessoa_id: login.Id,
        razao_social: login.RazaoSocialNome,
        permissions,
        last_login_at: new Date().toISOString(),
        last_login_ok: true,
        last_error: null,
      })
      .eq("tenant_id", caller.tenantId);

    return json({
      data: {
        pessoaId: login.Id,
        razaoSocial: login.RazaoSocialNome,
        nomeFantasia: login.NomeFantasia,
        bloqueado: login.Bloqueado === true,
        bloqueioMotivo: login.BloqueioMotivoDivulgado,
        permissions,
      },
      requestId,
    });
  }

  if (action === "dashboard") {
    requireRole(caller, READ_ROLES);
    return ok(await xbzDashboard(portal), requestId);
  }

  if (action === "pessoaToken") {
    requireRole(caller, READ_ROLES);
    return ok(await xbzPessoaToken(portal), requestId);
  }

  if (action === "pedidos" || action === "pedidoDetalhe") {
    requireRole(caller, READ_ROLES);
    requirePortalPermission(creds, "WebConsultaPedidos");
    const filters = action === "pedidoDetalhe"
      ? { numeroPedido: String(body.numeroPedido ?? "").trim().slice(0, 30) }
      : {
        idPeriodoSelecionado: num(body.periodo, 1),
        idStatusFinanceiroSelecionado: num(body.statusFinanceiro, 0),
        idStatusLogisticoSelecionado: num(body.statusLogistico, 0),
        idPessoaEmissao: num(body.pessoaEmissao, 0),
        idTipoListagemSelecionada: num(body.tipoListagem, 2),
        idMostraEntregues: num(body.mostraEntregues, 1),
        numeroPedido: String(body.numeroPedido ?? "").trim().slice(0, 30),
      };
    if (action === "pedidoDetalhe" && !filters.numeroPedido) {
      throw new XbzError(400, "numeroPedido é obrigatório");
    }
    return ok(await xbzConsultaPedidos(portal, filters), requestId);
  }

  if (action === "catalogo") {
    requireRole(caller, READ_ROLES);
    requirePortalPermission(creds, "WebConsultaProdutos");
    const busca = String(body.busca ?? "").slice(0, 100);
    try {
      const result = await xbzConsultaEstoque(portal, {
        busca,
        cor_id: num(body.corId, 0),
        filtro_id: num(body.filtroId, 0),
        web_tipo_id: num(body.tipoId, 0),
        web_sub_tipo_id: num(body.subTipoId, 0),
        tema_id: num(body.temaId, 0),
        quantidade: num(body.quantidade, 0),
        preco_minimo: num(body.precoMinimo, 0),
        preco_maximo: num(body.precoMaximo, 0),
      });

      // Espelho best-effort: nunca compromete a resposta ao usuário.
      const mirrored = await mirrorCatalogo(
        admin,
        caller.tenantId,
        result.data,
        (message) => logger.warn("falha ao espelhar catálogo XBZ", { message }),
      );
      logger.info("catálogo XBZ espelhado", { mirrored });

      return ok(result, requestId);
    } catch (err) {
      // Degradação elegante: XBZ fora do ar (rede/5xx/circuit breaker aberto)
      // → devolve o último snapshot conhecido em vez de falhar a tela.
      const status = err instanceof XbzError ? err.status : 500;
      if (status < 500) throw err;

      const cached = await readCatalogoCacheWithMeta(admin, caller.tenantId, busca);
      if (cached.items.length === 0) throw err;

      logger.warn("catálogo servido do cache local", { status, items: cached.items.length });
      return json({
        success: true,
        data: cached.items,
        stale: true,
        source: "cache",
        syncedAt: cached.syncedAt,
        requestId,
      });

    }
  }


  if (action === "fiscalSt") {
    requireRole(caller, READ_ROLES);
    const produtoId = num(body.produtoId, 0);
    if (produtoId <= 0) throw new XbzError(400, "produtoId é obrigatório");
    const pessoaId = creds.row.pessoa_id ?? 0;
    if (pessoaId <= 0) throw new XbzError(412, "pessoaId da XBZ desconhecido — execute o teste de conexão");
    return ok(await xbzGetSt(produtoId, pessoaId), requestId);
  }

  // --- Leituras do carrinho ---
  const cartReads: Record<string, string> = {
    carrinhoResumo: "CarrinhoResumo",
    carrinhoListar: "CarrinhoItemListar",
    entregaTipos: "EntregaTipoListar",
    pagamentoTipos: "PagamentoTipoListar",
    vendedor: "VendedorCarregar",
    creditoLimite: "CreditoLimiteConsultar",
    empresasGrupo: "PessoasMesmoGrupoListar",
  };
  if (cartReads[action]) {
    requireRole(caller, READ_ROLES);
    if (action.startsWith("carrinho")) requirePortalPermission(creds, "WebCarrinhoVisualizar");
    return ok(await xbzCarrinhoGet(cartReads[action], portal), requestId);
  }

  // --- Escritas ---
  // Cancelar pedido é irreversível na XBZ: exige o mesmo nível de gerarPedidos.
  const isOrderAction = ORDER_ACTIONS.has(action) || action === "cancelarPedido";
  requireRole(caller, isOrderAction ? ORDER_ROLES : WRITE_ROLES);


  try {
    let result: XbzResult<unknown>;

    switch (action) {
      case "itemLancar": {
        requirePortalPermission(creds, "WebCarrinhoInserir");
        const produtoId = num(body.produtoId, 0);
        const quantidade = num(body.quantidade, 0);
        if (produtoId <= 0) throw new XbzError(400, "produtoId é obrigatório");
        if (quantidade < 1) throw new XbzError(400, "quantidade deve ser maior ou igual a 1");
        result = await xbzCarrinhoWrite("CarrinhoItemLancar", "POST", portal, {
          ProdutoId: produtoId,
          Quantidade: quantidade,
        });
        break;
      }
      case "itemAlterar":
      case "itemAlterarQuantidade": {
        requirePortalPermission(creds, "WebCarrinhoInserir");
        const item = body.item;
        if (!item || typeof item !== "object") throw new XbzError(400, "item é obrigatório");
        const endpoint = action === "itemAlterar" ? "CarrinhoItemAlterar" : "CarrinhoItemAlterarQuantidade";
        result = await xbzCarrinhoWrite(endpoint, "PUT", portal, item);
        break;
      }
      case "itemRemover": {
        requirePortalPermission(creds, "WebCarrinhoInserir");
        const itemId = num(body.itemId, 0);
        if (itemId <= 0) throw new XbzError(400, "itemId é obrigatório");
        result = await xbzCarrinhoWrite("CarrinhoItemRemover", "DELETE", portal, { id: itemId });
        break;
      }
      case "cancelarPedido": {
        const numero = String(body.numeroPedido ?? "").trim().slice(0, 30);
        if (!numero) throw new XbzError(400, "numeroPedido é obrigatório");
        result = await xbzCarrinhoGet("CancelarPedido", portal, { _pedido_numero: numero });
        break;
      }
      case "gerarPedidos": {
        requirePortalPermission(creds, "WebPedidoEnviar");
        if (body.confirm !== true) {
          throw new XbzError(400, "Confirmação explícita obrigatória para gerar pedidos na XBZ");
        }
        // Deduplicação: evita que double-click / retry de rede gere o pedido
        // duas vezes na XBZ (operação sem idempotency key do lado deles).
        const since = new Date(Date.now() - GERAR_PEDIDOS_DEDUP_SECONDS * 1000).toISOString();
        const { data: recent } = await admin
          .from("xbz_carrinho_log")
          .select("id")
          .eq("tenant_id", caller.tenantId)
          .eq("action", "gerarPedidos")
          .eq("success", true)
          .gte("created_at", since)
          .limit(1);
        if (recent && recent.length > 0) {
          throw new XbzError(
            409,
            "Um pedido já foi gerado há poucos segundos. Confira a aba Pedidos antes de tentar novamente.",
          );
        }
        result = await xbzCarrinhoWrite("GerarPedidos", "PUT", portal);
        break;
      }

      default:
        throw new XbzError(400, `Ação não suportada: ${action}`);
    }

    await logCartOperation(admin, {
      tenantId: caller.tenantId,
      userId: caller.userId,
      action,
      payload: body,
      status: result.status,
      success: true,
    });

    return ok(result, requestId);
  } catch (err) {
    const xbzErr = err instanceof XbzError ? err : null;
    await logCartOperation(admin, {
      tenantId: caller.tenantId,
      userId: caller.userId,
      action,
      payload: body,
      status: xbzErr?.status,
      success: false,
      error: (err as Error).message,
    });
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = new EdgeLogger("xbz-proxy", requestId);

  if (req.method !== "POST") {
    return json({ error: "Método não permitido", requestId }, 405, { Allow: "POST, OPTIONS" });
  }

  const admin = serviceClient();

  try {
    const caller = await authenticate(req, admin);

    let body: Body;
    try {
      body = await req.json() as Body;
    } catch {
      throw new XbzError(400, "Corpo da requisição deve ser JSON válido");
    }

    const action = String(body.action ?? "");
    if (!VALID_ACTIONS.has(action)) {
      throw new XbzError(400, `Ação inválida: ${action || "(vazia)"}`);
    }

    // Rate limit por ação: escritas críticas têm janela muito mais estreita.
    const limit = ACTION_LIMITS[action] ?? DEFAULT_LIMIT;
    const rl = await checkRateLimit({
      identifier: caller.userId,
      endpoint: `xbz-proxy:${action}`,
      maxRequests: limit.maxRequests,
      windowSeconds: limit.windowSeconds,
    });
    if (!rl.allowed) {
      logger.warn("rate limit atingido", { action, tenantId: caller.tenantId });
      return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);
    }


    logger.info("xbz action", { action, tenantId: caller.tenantId });
    return await handleAction(action, body, caller, admin, logger, requestId);
  } catch (err) {
    const status = err instanceof XbzError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (status >= 500) logger.error("xbz-proxy falhou", { message });
    else logger.warn("xbz-proxy rejeitou requisição", { status, message });
    return json({ error: message, requestId }, status);
  }
});
