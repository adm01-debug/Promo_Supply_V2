/**
 * Regra única de transição de status de pedido.
 *
 * Vive fora do hook para poder ser reusada por qualquer tela que grave
 * `pedidos.status` (ex.: o Kanban de Acompanhamento) sem arrastar o hook inteiro.
 */
export const VALID_PEDIDO_TRANSITIONS: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado'],
  aprovado: ['enviado', 'em_transito', 'cancelado'],
  enviado: ['em_transito', 'entregue', 'cancelado'],
  em_transito: ['entregue', 'parcial', 'cancelado'],
  entregue: ['parcial'],
  parcial: ['entregue', 'cancelado'],
  cancelado: ['pendente'], // Allow reset for corrections
  concluido: [],
};

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
