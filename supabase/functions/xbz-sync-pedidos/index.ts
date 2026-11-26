/**
 * xbz-sync-pedidos — sincroniza pedidos da XBZ e detecta pagamento.
 *
 * Executado por pg_cron (30/30 min) e também sob demanda por admins.
 * Detecta a transição PENDENTE → PAGO (`pago` boolean, fallback
 * `idLoteDebitoStatus` 0 → 2/3), grava histórico e dispara alerta em
 * `system_alerts` com severidade `high` (o alert-dispatcher só despacha
 * HIGH/CRITICAL). Mapeamento dos 80 campos: `_shared/xbz_pedido_map.ts`.
 */
import { buildCorsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { EdgeLogger } from "../_shared/logger.ts";
import { authenticate, loadCredentials, requireRole, serviceClient } from "../_shared/xbz_auth.ts";
import { XbzError, xbzConsultaPedidos } from "../_shared/xbz_client.ts";
import { normalizePedidos } from "../_shared/xbz_pedido_map.ts";

interface SyncSummary {
  tenantId: string;
  fetched: number;
  upserted: number;
  pagamentosDetectados: string[];
  error?: string;
}

async function syncTenant(
  admin: ReturnType<typeof serviceClient>,
  tenantId: string,
  logger: EdgeLogger,
): Promise<SyncSummary> {
  const summary: SyncSummary = { tenantId, fetched: 0, upserted: 0, pagamentosDetectados: [] };

  const creds = await loadCredentials(admin, tenantId);
  const { data: pedidos } = await xbzConsultaPedidos(creds.portal, {
    idPeriodoSelecionado: 1,
    idStatusFinanceiroSelecionado: 0,
    idMostraEntregues: 1,
  });

  const rows = normalizePedidos(tenantId, pedidos);
  summary.fetched = Array.isArray(pedidos) ? pedidos.length : 0;
  if (rows.length === 0) return summary;

  // Estado anterior para detectar transições.
  const { data: previous } = await admin
    .from("xbz_pedidos")
    .select("pedido_numero, id_lote_debito_status, status_logistico, pago")
    .eq("tenant_id", tenantId);

  const prevMap = new Map<string, { id_lote_debito_status: number | null; status_logistico: string | null; pago: boolean }>();
  for (const p of previous ?? []) {
    prevMap.set(p.pedido_numero as string, {
      id_lote_debito_status: p.id_lote_debito_status as number | null,
      status_logistico: p.status_logistico as string | null,
      pago: p.pago === true,
    });
  }

  const history: Array<Record<string, unknown>> = [];
  const alerts: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    const prev = prevMap.get(row.pedido_numero);
    if (!prev) continue;

    if (prev.id_lote_debito_status !== row.id_lote_debito_status) {
      history.push({
        tenant_id: tenantId,
        pedido_numero: row.pedido_numero,
        campo: "idLoteDebitoStatus",
        valor_anterior: prev.id_lote_debito_status === null ? null : String(prev.id_lote_debito_status),
        valor_novo: row.id_lote_debito_status === null ? null : String(row.id_lote_debito_status),
      });
    }

    // PENDENTE → PAGO (`pago` boolean da XBZ; fallback idLoteDebitoStatus 2/3 no mapeamento).
    // Fica fora do bloco acima: o boolean pode mudar sem o idLoteDebitoStatus mudar.
    if (!prev.pago && row.pago) {
      summary.pagamentosDetectados.push(row.pedido_numero);
      alerts.push({
        tenant_id: tenantId,
        alert_type: "xbz_pagamento_confirmado",
        // Severidade canonica em MAIUSCULA: o despachante de alertas e o indice parcial
    // idx_system_alerts_pending_dispatch filtram por esse conjunto (etapa 218).
    severity: "HIGH",
        title: `Pagamento confirmado — pedido ${row.pedido_numero}`,
        message: row.lote_debito_status_cliente ?? "Pagamento confirmado na XBZ",
        description: `Pedido ${row.pedido_numero} passou de PENDENTE para PAGO na XBZ.`,
        metadata: {
          pedido_numero: row.pedido_numero,
          valor_total: row.valor_total,
          data_pagamento: row.data_pagamento,
        },
      });
    }

    if (prev.status_logistico !== row.status_logistico) {
      history.push({
        tenant_id: tenantId,
        pedido_numero: row.pedido_numero,
        campo: "statusLogistico",
        valor_anterior: prev.status_logistico,
        valor_novo: row.status_logistico,
      });
    }
  }

  const { error: upsertError } = await admin
    .from("xbz_pedidos")
    .upsert(rows, { onConflict: "tenant_id,pedido_numero" });
  if (upsertError) throw new XbzError(500, `Falha ao gravar pedidos XBZ: ${upsertError.message}`);
  summary.upserted = rows.length;

  if (history.length > 0) await admin.from("xbz_pedido_status_history").insert(history);
  if (alerts.length > 0) await admin.from("system_alerts").insert(alerts);

  logger.info("sync XBZ concluído", {
    tenantId,
    fetched: summary.fetched,
    pagamentos: summary.pagamentosDetectados.length,
  });

  return summary;
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = new EdgeLogger("xbz-sync-pedidos", requestId);
  const headers = buildResponseHeaders(cors);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido", requestId }), {
      status: 405,
      headers: { ...headers, Allow: "POST, OPTIONS" },
    });
  }

  const admin = serviceClient();

  // Autenticação do cron: a chave vive no Vault do banco (secret `xbz_cron_key`)
  // e é validada por `verify_xbz_cron_key`, que só compara digests — nunca devolve o valor.
  const cronKey = req.headers.get("x-cron-key");
  let isCron = false;
  if (cronKey) {
    const { data, error } = await admin.rpc("verify_xbz_cron_key", { _key: cronKey });
    if (error) logger.warn("falha ao validar chave de cron", { message: error.message });
    isCron = data === true;
    if (!isCron) {
      logger.warn("tentativa de invocação de cron com chave inválida");
      return new Response(JSON.stringify({ error: "Unauthorized", requestId }), {
        status: 401,
        headers,
      });
    }
  }

  try {
    let tenantIds: string[] = [];

    if (isCron) {

      const { data } = await admin
        .from("xbz_credentials")
        .select("tenant_id")
        .eq("is_active", true)
        .is("deleted_at", null);
      tenantIds = (data ?? []).map((r) => r.tenant_id as string);
    } else {
      const caller = await authenticate(req, admin);
      requireRole(caller, ["admin", "coordinator"]);
      tenantIds = [caller.tenantId];
    }

    const results: SyncSummary[] = [];
    for (const tenantId of tenantIds) {
      try {
        results.push(await syncTenant(admin, tenantId, logger));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        logger.warn("sync XBZ falhou para tenant", { tenantId, message });
        results.push({ tenantId, fetched: 0, upserted: 0, pagamentosDetectados: [], error: message });
      }
    }

    return new Response(JSON.stringify({ results, requestId }), { headers });
  } catch (err) {
    const status = err instanceof XbzError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error("xbz-sync-pedidos falhou", { message });
    return new Response(JSON.stringify({ error: message, requestId }), { status, headers });
  }
});
