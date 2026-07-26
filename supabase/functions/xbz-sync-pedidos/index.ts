/**
 * xbz-sync-pedidos — sincroniza pedidos da XBZ e detecta pagamento.
 *
 * Executado por pg_cron (30/30 min) e também sob demanda por admins.
 * Detecta a transição `idLoteDebitoStatus` 0 → 2/3 (PENDENTE → PAGO),
 * grava histórico e dispara alerta em `system_alerts`.
 */
import { corsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { EdgeLogger } from "../_shared/logger.ts";
import { authenticate, loadCredentials, requireRole, serviceClient } from "../_shared/xbz_auth.ts";
import {
  isPago,
  parsePagamentoLabel,
  parseXbzDate,
  toInt,
  toNumber,
  toText,
  XbzError,
  xbzConsultaPedidos,
} from "../_shared/xbz_client.ts";

interface SyncSummary {
  tenantId: string;
  fetched: number;
  upserted: number;
  pagamentosDetectados: string[];
  error?: string;
}

function mapPedido(tenantId: string, raw: Record<string, unknown>) {
  const idLote = toInt(raw.idLoteDebitoStatus);
  const label = toText(raw.loteDebitoStatusCliente);
  const pago = isPago(idLote);

  return {
    tenant_id: tenantId,
    pedido_numero: toText(raw.pedidoNumero ?? raw.numero) ?? "",
    ordem_de_compra: toText(raw.ordemDeCompra),
    pessoa_id: toInt(raw.pessoaId ?? raw.idPessoaEmissao),
    pessoa_razao_social: toText(raw.pessoaRazaoSocial ?? raw.emissaoClienteRazaoSocial),
    data_emissao: parseXbzDate(raw.dataEmissao),
    id_status: toInt(raw.idStatus),
    status_logistico: toText(raw.statusLogistico),
    id_lote_debito_status: idLote,
    lote_debito_status_cliente: label,
    pago,
    data_pagamento: pago
      ? (parsePagamentoLabel(label) ?? parseXbzDate(raw.loteDebitoStatus2Data))
      : null,
    data_status_lote_debito: parseXbzDate(raw.dataStatusLoteDebito),
    lote_debito_status1_data: parseXbzDate(raw.loteDebitoStatus1Data),
    lote_debito_status2_data: parseXbzDate(raw.loteDebitoStatus2Data),
    lote_debito_status3_data: parseXbzDate(raw.loteDebitoStatus3Data),
    valor_produtos: toNumber(raw.pedidoValorProdutos ?? raw.valorProdutos),
    valor_impostos_taxas: toNumber(raw.pedidoValorImpostosTaxas ?? raw.valorImpostosTaxas),
    valor_total: toNumber(raw.pedidoValorTotal ?? raw.valorTotal),
    quantidade: toInt(raw.quantidade),
    produto_codigo_xbz: toText(raw.produtoCodigoXbz ?? raw.produtoSku),
    produto_nome: toText(raw.produtoNome),
    nota_fiscal: toText(raw.notaFiscalNumero ?? raw.notaFiscal),
    entrega_tipo_nome: toText(raw.entregaTipoNome),
    transportadora_nome: toText(raw.entregaTransportadoraGravacaoNome),
    raw: raw as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
  };
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

  const rows = (Array.isArray(pedidos) ? pedidos : [])
    .map((p) => mapPedido(tenantId, p))
    .filter((r) => r.pedido_numero);
  summary.fetched = rows.length;
  if (rows.length === 0) return summary;

  // Estado anterior para detectar transições.
  const { data: previous } = await admin
    .from("xbz_pedidos")
    .select("pedido_numero, id_lote_debito_status, status_logistico")
    .eq("tenant_id", tenantId);

  const prevMap = new Map<string, { id_lote_debito_status: number | null; status_logistico: string | null }>();
  for (const p of previous ?? []) {
    prevMap.set(p.pedido_numero as string, {
      id_lote_debito_status: p.id_lote_debito_status as number | null,
      status_logistico: p.status_logistico as string | null,
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

      // PENDENTE (0) → PAGO (2/3)
      if (prev.id_lote_debito_status === 0 && isPago(row.id_lote_debito_status)) {
        summary.pagamentosDetectados.push(row.pedido_numero);
        alerts.push({
          tenant_id: tenantId,
          alert_type: "xbz_pagamento_confirmado",
          severity: "medium",
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const logger = new EdgeLogger("xbz-sync-pedidos", requestId);
  const headers = buildResponseHeaders(corsHeaders);

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
