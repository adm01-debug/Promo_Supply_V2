/**
 * Matrizes de transicao de status como o banco as implementa.
 *
 * Fonte: supabase/migrations/20261125170000_matriz_transicoes_alinhada.sql
 * (CREATE OR REPLACE das funcoes validate_*_status_transition). Antes dela o
 * banco tratava 'parcial' como estado posterior a 'pago' e recusava
 * aprovado/agendado/atrasado -> parcial - exatamente os caminhos de pagamento
 * parcial do produto - e recusava parcial -> cancelado em pedidos.
 *
 * Este arquivo existe para a matriz viver em um lugar so: o front tinha duas
 * copias dela e uma ficou para tras quando o banco mudou (o abatimento por
 * credito deixava de aplicar 'parcial' num pagamento aprovado). O teste
 * src/lib/__tests__/statusTransitionsBanco.test.ts le a ULTIMA migration que
 * define cada funcao e falha se estas constantes divergirem dela.
 */

/** Alvos que o trigger aceita a partir de cada status de `pagamentos`. */
export const TRANSICOES_PAGAMENTO_BANCO: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado', 'atrasado'],
  aprovado: ['agendado', 'pago', 'parcial', 'cancelado', 'atrasado'],
  agendado: ['pago', 'parcial', 'cancelado', 'atrasado'],
  pago: ['parcial'],
  parcial: ['pago', 'cancelado'],
  cancelado: [],
  atrasado: ['pago', 'parcial', 'cancelado', 'aprovado'],
};

/** Alvos que o trigger aceita a partir de cada status de `pedidos`. */
export const TRANSICOES_PEDIDO_BANCO: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado'],
  aprovado: ['enviado', 'em_transito', 'cancelado'],
  enviado: ['em_transito', 'entregue', 'cancelado'],
  em_transito: ['entregue', 'parcial', 'cancelado'],
  entregue: ['parcial'],
  parcial: ['entregue', 'cancelado'],
  cancelado: [],
  concluido: [],
};

/**
 * Guarda de tela: aceita quando o banco aceita.
 *
 * Mesma transicao passa (o trigger faz IF OLD.status = NEW.status THEN RETURN
 * NEW) e status desconhecido tambem - o trigger cai no ELSE, recusa e a
 * mensagem do banco aparece. Preferimos isso a bloquear por engano: a lista da
 * tela pode estar defasada de um status novo, e a tela nunca e a autoridade.
 * Quem debita credito nao usa esta funcao: `statusAbatimentoAlcancavel` e
 * falha-fechado porque precisa da certeza de que o UPDATE vai passar.
 */
export function transicaoPermitidaNaTela(
  matriz: Record<string, string[]>,
  statusAtual: string | null | undefined,
  novoStatus: string,
): boolean {
  if (!statusAtual || statusAtual === novoStatus) return true;
  const permitidos = matriz[statusAtual];
  return !permitidos || permitidos.includes(novoStatus);
}
