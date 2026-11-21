export interface PendingOrder {
  id: string;
  numero: string;
  fornecedor_nome: string;
  data_previsao: string | null;
  valor_total: number;
  status: string;
  itens: OrderItem[];
}

export interface OrderItem {
  id: string;
  descricao: string;
  quantidade: number;
  quantidade_recebida: number | null;
  unidade: string | null;
  valor_unitario: number;
  pim_product_id?: string | null;
  pim_variant_id?: string | null;
  codigo_fornecedor?: string | null;
  ncm?: string | null;
  ipi_rate?: number | null;
}

export interface ReceivingEntry {
  pedido_id: string;
  pedido_numero: string;
  items: { item_id: string; quantidade_recebida: number; observacao: string }[];
  observacao_geral: string;
  timestamp: string;
  synced: boolean;
}

export const OFFLINE_STORAGE_KEY = "offline-receiving-entries";

export function getOfflineEntries(): ReceivingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveOfflineEntries(entries: ReceivingEntry[]) {
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(entries));
}

export const ORDERS_CACHE_KEY = "offline-orders-cache";

export function getCachedOrders(): PendingOrder[] | null {
  try {
    const cached = localStorage.getItem(ORDERS_CACHE_KEY);
    return cached ? (JSON.parse(cached) as PendingOrder[]) : null;
  } catch {
    return null;
  }
}

export function saveCachedOrders(orders: PendingOrder[]) {
  localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders));
}

/** Linha de um pedido complementar: saldo nao entregue de um item. */
export interface PendingLine {
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  pim_product_id?: string | null;
  pim_variant_id?: string | null;
  codigo_fornecedor?: string | null;
  ncm?: string | null;
  ipi_rate?: number | null;
}

/** Itens com saldo a receber, ja com a quantidade restante calculada. */
export function buildPendingLines(
  itens: PendingOrder["itens"],
  receivedQty: Record<string, number>,
): PendingLine[] {
  return itens
    .map((item) => ({ item, remaining: item.quantidade - (receivedQty[item.id] || 0) }))
    .filter(({ remaining }) => remaining > 0)
    .map(({ item, remaining }) => ({
      descricao: item.descricao,
      quantidade: remaining,
      unidade: item.unidade || "un",
      valor_unitario: item.valor_unitario,
      valor_total: remaining * item.valor_unitario,
      pim_product_id: item.pim_product_id ?? null,
      pim_variant_id: item.pim_variant_id ?? null,
      codigo_fornecedor: item.codigo_fornecedor ?? null,
      ncm: item.ncm ?? null,
      ipi_rate: item.ipi_rate ?? null,
    }));
}

/** Data de previsao do pedido complementar: 7 dias a frente, em YYYY-MM-DD. */
export function defaultForecastDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}
