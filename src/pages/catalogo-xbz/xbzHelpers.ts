/**
 * Helpers puros da integração XBZ (frontend).
 * Espelham as regras do documento de análise da API XBZ v5.
 */

/** Sentinela de "sem data" usada pela XBZ. */
export const XBZ_NULL_DATE_PREFIX = "2000-01-01T00:00:00";

export interface XbzPermissions {
  WebHabilitarAcessoPortal?: boolean;
  WebExibePreco?: boolean;
  WebExibeQuantidade?: boolean;
  WebIgnoraRestricoes?: boolean;
  WebConsultaProdutos?: boolean;
  WebConsultaPedidos?: boolean;
  WebExibePrecosPedidos?: boolean;
  WebCarrinhoInserir?: boolean;
  WebCarrinhoVisualizar?: boolean;
  WebPedidoEnviar?: boolean;
}

/** Converte data da XBZ, tratando a sentinela 2000-01-01 como ausente. */
export function parseXbzDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith(XBZ_NULL_DATE_PREFIX)) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : new Date(ts);
}

export function formatXbzDate(value: unknown): string {
  const date = parseXbzDate(value);
  if (!date) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatBRL(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** `idLoteDebitoStatus`: 0 = pendente, 2/3 = pago. */
export function isPagamentoConfirmado(idLoteDebitoStatus: number | null | undefined): boolean {
  return idLoteDebitoStatus === 2 || idLoteDebitoStatus === 3;
}

export type PagamentoStatus = 'pago' | 'pendente' | 'desconhecido';

export function pagamentoStatus(idLoteDebitoStatus: number | null | undefined): PagamentoStatus {
  if (idLoteDebitoStatus === 0) return 'pendente';
  if (isPagamentoConfirmado(idLoteDebitoStatus)) return 'pago';
  return 'desconhecido';
}

/** Extrai a data embutida em "PAGO (06/03/26 17:48:21)". */
export function parsePagamentoLabel(label: unknown): Date | null {
  if (typeof label !== 'string') return null;
  const m = label.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yy, hh, mi, ss] = m;
  const ts = Date.parse(`20${yy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`);
  return Number.isNaN(ts) ? null : new Date(ts);
}

/** Mapa `idStatus` → rótulo logístico (Seção 7.6 do documento). */
export const XBZ_STATUS_LOGISTICO: Record<number, string> = {
  0: 'Cancelado',
  2: 'Pedido emitido',
  7: 'Pronto — aguardando pagamento',
  9: 'Retirado / Enviado / Finalizado',
};

export function statusLogisticoLabel(idStatus: number | null | undefined, fallback?: string | null): string {
  if (typeof idStatus === 'number' && XBZ_STATUS_LOGISTICO[idStatus]) {
    return XBZ_STATUS_LOGISTICO[idStatus];
  }
  return fallback?.trim() || 'Desconhecido';
}

/**
 * `consultaEstoque` devolve [] quando `busca` é vazio.
 * "a" é o termo documentado para varrer praticamente todo o catálogo.
 */
export function normalizeBusca(term: string | null | undefined): string {
  const trimmed = (term ?? '').trim();
  return trimmed.length > 0 ? trimmed.slice(0, 100) : 'a';
}

/** Tipos de entrega do controller /api/carrinho/ (IDs divergem de /api/clientes/). */
export const XBZ_ENTREGA_TIPOS: Record<number, string> = {
  30: 'Transportadora indicada pelo cliente',
  40: 'Empresa de gravação',
  101: 'Veículo próprio',
  102: 'Aplicativo / motoboy',
};

export const XBZ_PAGAMENTO_TIPOS: Record<number, string> = {
  1: 'Dinheiro',
  4: 'PIX / Transferência / Depósito',
  5: 'Cartão de crédito',
  6: 'Cartão de débito',
};

/** Períodos aceitos por consultaPedidos. */
export const XBZ_PERIODOS = [
  { value: 1, label: 'Recente (~2 meses)' },
  { value: 2, label: 'Médio (~3 meses)' },
  { value: 3, label: 'Longo (~6 meses)' },
] as const;

export const XBZ_FILTROS_FINANCEIROS = [
  { value: 0, label: 'Todos' },
  { value: 2, label: 'Somente pagos' },
  { value: 3, label: 'Somente pendentes' },
] as const;
