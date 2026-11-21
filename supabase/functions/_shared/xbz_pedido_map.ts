/**
 * Normalização de uma linha do `/api/ruiz/consultaPedidos` (80 campos, 1 linha
 * por item) para `public.xbz_pedidos`. Nomes reais dos campos:
 * DOCS/INTEGRACOES/XBZ.md §4.2. Função pura (sem rede/banco) para ser testável.
 */
import { isPago, parsePagamentoLabel, parseXbzDate, toInt, toNumber, toText } from "./xbz_client.ts";

export interface XbzPedidoRow {
  tenant_id: string;
  pedido_numero: string;
  ordem_de_compra: string | null;
  pessoa_id: number | null;
  pessoa_razao_social: string | null;
  data_emissao: string | null;
  id_status: number | null;
  status_logistico: string | null;
  id_lote_debito_status: number | null;
  lote_debito_status_cliente: string | null;
  pago: boolean;
  data_pagamento: string | null;
  data_status_lote_debito: string | null;
  lote_debito_status1_data: string | null;
  lote_debito_status2_data: string | null;
  lote_debito_status3_data: string | null;
  valor_produtos: number | null;
  valor_impostos_taxas: number | null;
  valor_total: number | null;
  quantidade: number | null;
  produto_codigo_xbz: string | null;
  produto_nome: string | null;
  nota_fiscal: string | null;
  entrega_tipo_nome: string | null;
  transportadora_nome: string | null;
  raw: Record<string, unknown>;
  last_synced_at: string;
}

export function mapPedido(
  tenantId: string,
  raw: Record<string, unknown>,
  syncedAt = new Date().toISOString(),
): XbzPedidoRow {
  const idLote = toInt(raw.idLoteDebitoStatus);
  const label = toText(raw.loteDebitoStatusCliente);
  // `pago` (boolean) chegou em nov/2026; o fallback por idLoteDebitoStatus 2/3 continua válido.
  const pago = typeof raw.pago === "boolean" ? raw.pago : isPago(idLote);

  const ipi = toNumber(raw.valorIpiTotal);
  const st = toNumber(raw.valorStTotal);
  const impostos = ipi === null && st === null ? null : (ipi ?? 0) + (st ?? 0);

  return {
    tenant_id: tenantId,
    // `numero` vem como "P… (OC: …)"; `pedidoNumero` é o número limpo.
    pedido_numero: toText(raw.pedidoNumero) ?? toText(raw.numero)?.split(" ")[0] ?? "",
    ordem_de_compra: toText(raw.numeroPedidoInternoCliente ?? raw.ordemDeCompra),
    pessoa_id: toInt(raw.pessoaCodigo ?? raw.pessoaId),
    pessoa_razao_social: toText(raw.razaoSocial ?? raw.pessoaRazaoSocial),
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
    valor_produtos: toNumber(raw.valorProdutos),
    valor_impostos_taxas: impostos,
    valor_total: toNumber(raw.valor ?? raw.pedidoValorTotal),
    quantidade: toInt(raw.pedidoItemQuantidade ?? raw.quantidade),
    produto_codigo_xbz: toText(raw.produtoCodigoSistema ?? raw.produtoCodigoXbz),
    produto_nome: toText(raw.produtoNome),
    nota_fiscal: toText(raw.nfNumero ?? raw.notaFiscalNumero),
    entrega_tipo_nome: toText(raw.tipoEntrega ?? raw.entregaTipoNome),
    // `transportadora` vem "" (não null) quando é gravação/transportadora da XBZ.
    transportadora_nome: toText(raw.transportadora) ?? toText(raw.entregaTransportadoraGravacaoNome),
    raw,
    last_synced_at: syncedAt,
  };
}

/**
 * `consultaPedidos` devolve 1 linha por item. A XBZ gera 1 pedido por item do
 * carrinho, mas um pedido com 2+ itens repetiria `pedido_numero` e o upsert em
 * lote falharia ("cannot affect row a second time"). Mantém a primeira linha de
 * cada pedido e descarta as sem número.
 */
export function normalizePedidos(tenantId: string, items: unknown): XbzPedidoRow[] {
  if (!Array.isArray(items)) return [];
  const syncedAt = new Date().toISOString();
  const byNumero = new Map<string, XbzPedidoRow>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = mapPedido(tenantId, item as Record<string, unknown>, syncedAt);
    if (!row.pedido_numero || byNumero.has(row.pedido_numero)) continue;
    byNumero.set(row.pedido_numero, row);
  }
  return Array.from(byNumero.values());
}
