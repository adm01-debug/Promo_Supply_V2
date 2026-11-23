/**
 * Regra unica de abatimento de credito de devolucao em pagamento.
 *
 * Antes existia em duas versoes divergentes: PagamentoDetailModal substituia
 * `valor_utilizado` (perdendo o acumulado) e useDevolucoes acumulava. Alem
 * disso o status gravado no pagamento nao era conferido contra a maquina de
 * estados do banco, e o erro do UPDATE era descartado.
 */

export interface CreditoAtual {
  saldo: number;
  valor_utilizado: number;
}

export interface CreditoAbatido {
  valor_utilizado: number;
  saldo: number;
  status: 'utilizado' | 'ativo';
}

/** Acumula o valor utilizado (nunca substitui) e baixa o saldo. */
export function calcularAbatimentoCredito(
  credito: CreditoAtual,
  valorAplicado: number,
): CreditoAbatido {
  const valorUtilizadoAtual = Number(credito.valor_utilizado) || 0;
  const saldo = (Number(credito.saldo) || 0) - valorAplicado;
  return {
    valor_utilizado: valorUtilizadoAtual + valorAplicado,
    saldo: saldo < 0 ? 0 : saldo,
    status: saldo <= 0 ? 'utilizado' : 'ativo',
  };
}

/**
 * Transicoes aceitas por public.validate_pagamento_status_transition (trigger
 * trg_validate_pagamento_status), lidas em producao. O mapa do front
 * (VALID_PAGAMENTO_TRANSITIONS em src/hooks/usePagamentos.ts) oferece 'parcial'
 * a partir de aprovado/agendado/atrasado, o que o banco rejeita.
 */
const TRANSICOES_PAGAMENTO_BANCO: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado', 'atrasado'],
  aprovado: ['agendado', 'pago', 'cancelado', 'atrasado'],
  agendado: ['pago', 'cancelado', 'atrasado'],
  pago: ['parcial'],
  parcial: ['pago'],
  atrasado: ['pago', 'cancelado', 'aprovado'],
  cancelado: [],
  concluido: [],
};

/** Status que o abatimento grava: `pago` quando quita, `parcial` quando nao. */
export function statusAlvoAbatimento(valorPago: number, valorTotal: number): 'pago' | 'parcial' {
  return valorPago >= valorTotal ? 'pago' : 'parcial';
}

/**
 * Status a gravar, ou `null` quando o banco nao aceita a transicao direta -
 * caso em que o abatimento deve ser abortado ANTES de debitar o credito.
 * Somente transicoes diretas: quitar um pagamento `pendente` passa pela
 * aprovacao, que e uma decisao de alcada e nao pode ser pulada aqui.
 */
export function statusAbatimentoAlcancavel(
  statusAtual: string,
  valorPago: number,
  valorTotal: number,
): 'pago' | 'parcial' | null {
  const alvo = statusAlvoAbatimento(valorPago, valorTotal);
  if (statusAtual === alvo) return alvo;
  return (TRANSICOES_PAGAMENTO_BANCO[statusAtual] || []).includes(alvo) ? alvo : null;
}

/** Explicacao para o operador quando `statusAbatimentoAlcancavel` devolve null. */
export function mensagemAbatimentoBloqueado(alvo: 'pago' | 'parcial'): string {
  if (alvo === 'parcial') {
    return 'O banco nao aceita status "parcial" a partir do status atual deste pagamento. Quite o valor restante ou registre uma parcela pelo fluxo de pagamento.';
  }
  return 'Aprove o pagamento antes de aplicar o credito de devolucao.';
}
