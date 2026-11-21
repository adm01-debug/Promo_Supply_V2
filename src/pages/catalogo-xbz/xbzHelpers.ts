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

/** Tamanho mínimo de `busca` aceito pela XBZ (abaixo disso `consultaEstoque` devolve []). */
export const XBZ_BUSCA_MIN = 3;

export function normalizeBusca(term: string | null | undefined): string {
  return (term ?? '').trim().slice(0, 100);
}

export function isBuscaValida(term: string | null | undefined): boolean {
  return normalizeBusca(term).length >= XBZ_BUSCA_MIN;
}

/** Converte número no formato pt-BR da XBZ ("8.044", "12,50") ou numérico. */
export function parseXbzNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Campos do item de catálogo que a tela usa, lidos dos nomes reais da API (v6 §4.3). */
export interface XbzProdutoView {
  id: number;
  sku: string;
  nome: string;
  cor: string | null;
  preco: number | null;
  /** `QtdDisponivel`, ou `QtdDisponivelExibicao` quando aquele vem 0 (observado 21/11/2026). */
  quantidade: number | null;
  vendaMinima: number;
  multiplos: number;
  disponivel: string;
  imagem: string | null;
}

export function produtoView(p: Record<string, unknown>): XbzProdutoView {
  const cor = p.CorPredominante && typeof p.CorPredominante === 'object'
    ? (p.CorPredominante as Record<string, unknown>)
    : null;
  const qtd = parseXbzNumber(p.QtdDisponivel);
  const qtdExibicao = parseXbzNumber(p.QtdDisponivelExibicao);
  return {
    id: Number(p.IdProduto ?? 0) || 0,
    sku: String(p.CodigoXbz ?? ''),
    nome: String(p.Nome ?? '—'),
    cor: cor && cor.NomeCor ? String(cor.NomeCor) : null,
    preco: parseXbzNumber(p.PrecoVenda),
    quantidade: qtd !== null && qtd > 0 ? qtd : qtdExibicao ?? qtd,
    vendaMinima: Number(p.VendaMinima ?? 1) || 1,
    multiplos: Number(p.Multiplos ?? 1) || 1,
    disponivel: String(p.Disponivel ?? '—'),
    imagem: typeof p.ImageLink === 'string' && p.ImageLink ? p.ImageLink : null,
  };
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
