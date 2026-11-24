/**
 * Regra unica de abatimento de credito de devolucao em pagamento.
 *
 * Antes existia em duas versoes divergentes: PagamentoDetailModal substituia
 * `valor_utilizado` (perdendo o acumulado) e useDevolucoes acumulava. Alem
 * disso o status gravado no pagamento nao era conferido contra a maquina de
 * estados do banco, e o erro do UPDATE era descartado.
 *
 * A matriz de status usada aqui vem de src/lib/statusTransitionsBanco.ts: este
 * arquivo tinha uma copia propria dela, defasada, que recusava
 * aprovado/agendado/atrasado -> parcial - os caminhos de pagamento parcial.
 */

import { TRANSICOES_PAGAMENTO_BANCO } from './statusTransitionsBanco';

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
 * Status que o abatimento grava: `pago` quando quita, `parcial` quando nao.
 */
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
    return 'O banco nao aceita status "parcial" a partir do status atual deste pagamento. Aprove o pagamento ou registre a parcela pelo fluxo de pagamento.';
  }
  return 'Aprove o pagamento antes de aplicar o credito de devolucao.';
}
