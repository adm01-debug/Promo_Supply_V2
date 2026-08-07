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
