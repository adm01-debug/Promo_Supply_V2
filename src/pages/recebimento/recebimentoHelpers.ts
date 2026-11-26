export interface PendingOrder {
  id: string;
  numero: string;
  fornecedor_nome: string;
  data_previsao: string | null;
  valor_total: number;
  status: string;
  /** Observacoes atuais do pedido: o recebimento acrescenta em vez de substituir. */
  observacoes?: string | null;
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

/**
 * Uma linha so esta recebida quando a quantidade recebida cobre a pedida.
 * Usar `> 0` marcava o pedido como `entregue` com 1 unidade de 100, e o trigger
 * `trg_pedido_entregue_status` entao liberava pagamento e concluia a solicitacao.
 */
export function isLineComplete(item: { quantidade: number }, recebida: number): boolean {
  return recebida >= item.quantidade;
}

/** Status do pedido apos o recebimento; `undefined` quando nada foi recebido. */
export function statusFromReceived(
  items: { id: string; quantidade: number }[],
  receivedQty: Record<string, number>,
): "entregue" | "parcial" | undefined {
  const total = items.reduce((sum, item) => sum + (receivedQty[item.id] || 0), 0);
  if (total <= 0) return undefined;
  return items.every((item) => isLineComplete(item, receivedQty[item.id] || 0))
    ? "entregue"
    : "parcial";
}

/**
 * Transicoes aceitas por `validate_pedido_status_transition` (trigger
 * `trg_validate_pedido_status`) restritas ao caminho que o recebimento percorre.
 * O contrato completo vive em src/features/pedidos/hooks/usePedidos.ts.
 */
const TRANSICOES_RECEBIMENTO: Record<string, string[]> = {
  pendente: ['aprovado'],
  aprovado: ['em_transito', 'enviado'],
  enviado: ['em_transito', 'entregue'],
  em_transito: ['entregue', 'parcial'],
  entregue: ['parcial'],
  parcial: ['entregue'],
};

/**
 * Sequencia de status a gravar para sair de `atual` e chegar em `alvo` sem
 * violar o trigger: `aprovado`/`enviado` nao aceitam `entregue`/`parcial`
 * direto, entao a mercadoria passa por `em_transito` no mesmo fluxo.
 * `[]` quando o pedido ja esta no alvo; `null` quando nao existe caminho legal.
 */
export function caminhoDeStatus(
  atual: string,
  alvo: 'entregue' | 'parcial',
): string[] | null {
  if (atual === alvo) return [];
  const fila: string[][] = [[atual]];
  const visitados = new Set<string>([atual]);
  while (fila.length > 0) {
    const caminho = fila.shift() as string[];
    const ultimo = caminho[caminho.length - 1];
    for (const proximo of TRANSICOES_RECEBIMENTO[ultimo] || []) {
      if (visitados.has(proximo)) continue;
      const novo = [...caminho, proximo];
      if (proximo === alvo) return novo.slice(1);
      visitados.add(proximo);
      fila.push(novo);
    }
  }
  return null;
}

/** Campos que o recebimento escreve em `pedidos` ao registrar a entrega. */
export interface CamposStatusPedido {
  status?: string;
  observacoes?: string | null;
  data_entrega?: string;
}

/** Atualiza `pedidos` e devolve o erro do PostgREST (nunca lanca). */
export type AtualizarPedido = (
  pedidoId: string,
  campos: CamposStatusPedido,
) => Promise<{ error: { message: string } | null }>;

/**
 * Grava o status pelo caminho que o trigger aceita, um UPDATE por transicao, e
 * devolve a mensagem de erro quando um deles falha. Antes disso o erro do
 * UPDATE era descartado e a tela anunciava "recebimento registrado" com o
 * pedido intacto.
 */
export async function aplicarStatusRecebimento(
  atualizarPedido: AtualizarPedido,
  pedidoId: string,
  statusAtual: string,
  alvo: 'entregue' | 'parcial',
  observacoes: string | null = null,
): Promise<string | null> {
  const caminho = caminhoDeStatus(statusAtual, alvo);
  if (!caminho) return `Transicao de status invalida: ${statusAtual} -> ${alvo}`;

  // Sem transicao a aplicar, um UPDATE so para as observacoes do recebimento.
  const passos: (string | null)[] = caminho.length > 0 ? caminho : [null];
  for (const [i, status] of passos.entries()) {
    const campos: CamposStatusPedido = {};
    if (status) campos.status = status;
    if (i === 0 && observacoes !== null) campos.observacoes = observacoes;
    if (status === 'entregue') campos.data_entrega = new Date().toISOString().split('T')[0];
    const { error } = await atualizarPedido(pedidoId, campos);
    if (error) return error.message;
  }
  return null;
}

/** Atualiza a quantidade recebida de um item; o resultado do PostgREST nunca lanca. */
export type AtualizarItem = (
  itemId: string,
  quantidade: number,
) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;

/**
 * Grava a quantidade recebida de cada item conferindo o erro e as linhas afetadas:
 * a RLS filtra a linha em silencio (0 linhas, sem erro) e o supabase-js nao lanca,
 * entao a tela anunciava recebimento registrado com a quantidade intacta. Devolve a
 * mensagem do primeiro item que nao gravou, ou null quando todos gravaram.
 */
export async function gravarItensRecebidos(
  items: { item_id: string; quantidade_recebida: number }[],
  atualizarItem: AtualizarItem,
): Promise<string | null> {
  for (const item of items) {
    const { data, error } = await atualizarItem(item.item_id, item.quantidade_recebida);
    if (error) return `Item ${item.item_id}: ${error.message}`;
    if (!data || data.length === 0) {
      return `Item ${item.item_id}: nenhuma linha atualizada (sem permissao ou fora da empresa)`;
    }
  }
  return null;
}

/** Observacoes do recebimento consolidadas para a coluna `pedidos.observacoes`. */
export function buildReceivingObservation(
  itemNotes: Record<string, string>,
  generalNote: string,
  existente: string | null = null,
): string | null {
  const lines = Object.entries(itemNotes)
    .map(([, note]) => note.trim())
    .filter(Boolean);
  const parts: string[] = [];
  if (lines.length > 0) parts.push(`Itens: ${lines.join(" | ")}`);
  if (generalNote.trim()) parts.push(generalNote.trim());
  // Sem nota nova devolve null: `aplicarStatusRecebimento` so grava observacoes
  // quando recebe uma string, entao null preserva a observacao que a OC gravou.
  if (parts.length === 0) return null;
  const nova = parts.join(" — ");
  const anterior = existente?.trim();
  if (!anterior) return nova;
  // O sync offline repete a gravacao: sem esta checagem a nota seria duplicada.
  if (anterior.includes(nova)) return anterior;
  return `${anterior} — ${nova}`;
}

/** Data de previsao do pedido complementar: 7 dias a frente, em YYYY-MM-DD. */
export function defaultForecastDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}
