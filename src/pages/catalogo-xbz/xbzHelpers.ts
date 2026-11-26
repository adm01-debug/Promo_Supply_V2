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

/** Status de pagamento de uma linha do `consultaPedidos`: usa `pago` (boolean, nov/2026) e cai no `idLoteDebitoStatus`. */
export function pagamentoStatusPedido(p: { pago?: unknown; idLoteDebitoStatus?: number | null }): PagamentoStatus {
  if (typeof p.pago === 'boolean') return p.pago ? 'pago' : 'pendente';
  return pagamentoStatus(p.idLoteDebitoStatus);
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

// ---------------------------------------------------------------- portador
// Cadastro antecipado do motorista/placa para retirada na XBZ (substitui o token
// de retirada a partir de 23/11/2026). Mesmas regras do `portador.js` do portal.

export function somenteDigitos(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '');
}

export function cpfValido(valor: unknown): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (quantidade: number) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i += 1) soma += Number(cpf[i]) * (quantidade + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function formatarCpf(valor: unknown): string {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11) return String(valor ?? '');
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function normalizarPlaca(valor: unknown): string {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

/** Padrão antigo (ABC1234) e Mercosul (ABC1D23). */
export function placaValida(valor: unknown): boolean {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(valor));
}

export function formatarPlaca(valor: unknown): string {
  const placa = normalizarPlaca(valor);
  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

/** Portador como a XBZ devolve no `expedicaoautorizacao/Carregar` (camelCase). */
export interface XbzPortador {
  motoristaNome?: string;
  motoristaRg?: string;
  motoristaCpf?: string;
  veiculoPlaca?: string;
  detalhes?: string;
  cadastroData?: string;
  [key: string]: unknown;
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
