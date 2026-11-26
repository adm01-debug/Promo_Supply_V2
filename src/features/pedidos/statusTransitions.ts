/**
 * Regra única de transição de status de pedido.
 *
 * Vive fora do hook para poder ser reusada por qualquer tela que grave
 * `pedidos.status` (ex.: o Kanban de Acompanhamento) sem arrastar o hook inteiro.
 *
 * A matriz vem de src/lib/statusTransitionsBanco.ts, que é lida da migration do
 * trigger: até aqui este arquivo mantinha uma cópia própria que oferecia
 * `cancelado -> pendente` (comentado como "reset para correção"), destino que o
 * banco recusa desde sempre - o operador recebia o erro cru do trigger. Reabrir
 * pedido cancelado seria mudança de regra de negócio e exigiria migration; não é
 * o que esta matriz representa hoje.
 */
import { TRANSICOES_PEDIDO_BANCO } from '@/lib/statusTransitionsBanco';

export const VALID_PEDIDO_TRANSITIONS: Record<string, string[]> = TRANSICOES_PEDIDO_BANCO;

// Kanban usa nomes de status da UI; aqui ficam ligados ao status gravado em `pedidos`.
export const KANBAN_TO_DB_STATUS: Record<string, string> = {
  FORNECEDOR_SELECIONADO: 'pendente',
  PEDIDO_GERADO: 'pendente',
  AGUARDANDO_PAGAMENTO: 'aprovado',
  PAGO: 'enviado',
  EM_TRANSITO: 'em_transito',
  ENTREGUE: 'entregue',
};

// A entrega exige conferência na tela de Recebimento: marcar 'entregue' pelo Kanban
// dispara no banco o trigger que cria a conta a pagar do pedido.
export const KANBAN_STATUS_SEM_ESCRITA: readonly string[] = ['ENTREGUE'];

export const transicaoDeStatusPermitida = (
  statusAtual: string | null | undefined,
  novoStatus: string,
): boolean => {
  const permitidos = statusAtual ? VALID_PEDIDO_TRANSITIONS[statusAtual] : undefined;
  if (!permitidos) return true;
  return permitidos.includes(novoStatus);
};
