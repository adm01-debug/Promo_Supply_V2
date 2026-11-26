/**
 * Regra de ciclo de vida da exclusao de pedido.
 *
 * Excluir um pedido em andamento perde dado em silencio: pedido_itens e
 * receiving_checklists caem em CASCADE e devolucoes.pedido_id vira NULL (a devolucao
 * continua existindo sem vinculo). Por isso a exclusao so vale para pedido que ainda
 * nao entrou no ciclo de recebimento; depois disso o caminho e cancelar/receber.
 */
export const STATUS_PEDIDO_EXCLUIVEL: readonly string[] = ['pendente', 'cancelado'];

export const MOTIVO_EXCLUSAO_BLOQUEADA =
  'Só pedidos pendentes ou cancelados podem ser excluídos. Pedidos em andamento guardam itens recebidos, checklists e devoluções.';

export const MOTIVO_EXCLUSAO_COM_CHECKLIST =
  'Pedido com checklist de recebimento nao pode ser excluido: a conferencia do recebimento seria apagada junto.';

export function statusPermiteExcluirPedido(status: string): boolean {
  return STATUS_PEDIDO_EXCLUIVEL.includes(status);
}

export function selecaoTemExclusaoBloqueada(items: { status: string }[]): boolean {
  return items.some((item) => !statusPermiteExcluirPedido(item.status));
}

export function mensagemExclusaoParcial(excluidos: number, solicitados: number): string {
  return `${excluidos} de ${solicitados} pedido(s) excluído(s). Os demais ficaram de fora: ${MOTIVO_EXCLUSAO_BLOQUEADA}`;
}
