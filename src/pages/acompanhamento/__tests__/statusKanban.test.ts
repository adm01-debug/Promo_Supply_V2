import { describe, it, expect } from 'vitest';
import { avaliarAlteracaoStatusKanban } from '../AcompanhamentoHelpers';
import { KANBAN_STATUS_SEM_ESCRITA } from '@/features/pedidos/statusTransitions';

describe('avaliarAlteracaoStatusKanban', () => {
  it('bloqueia a entrega feita pelo Kanban', () => {
    expect(KANBAN_STATUS_SEM_ESCRITA).toContain('ENTREGUE');
    const avaliacao = avaliarAlteracaoStatusKanban('em_transito', 'ENTREGUE');
    expect(avaliacao.permitido).toBe(false);
    if (avaliacao.permitido) return;
    expect(avaliacao.motivo).toBe('coluna-somente-leitura');
    expect(avaliacao.mensagem).toContain('Recebimento');
  });

  it('traduz as colunas válidas para o status do banco', () => {
    expect(avaliarAlteracaoStatusKanban('pendente', 'AGUARDANDO_PAGAMENTO')).toEqual({
      permitido: true,
      dbStatus: 'aprovado',
    });
    expect(avaliarAlteracaoStatusKanban('aprovado', 'PAGO')).toEqual({
      permitido: true,
      dbStatus: 'enviado',
    });
    expect(avaliarAlteracaoStatusKanban('enviado', 'EM_TRANSITO')).toEqual({
      permitido: true,
      dbStatus: 'em_transito',
    });
  });

  it('recusa transição que o banco rejeitaria, com mensagem de negócio', () => {
    const avaliacao = avaliarAlteracaoStatusKanban('pendente', 'EM_TRANSITO');
    expect(avaliacao.permitido).toBe(false);
    if (avaliacao.permitido) return;
    expect(avaliacao.motivo).toBe('transicao-invalida');
    expect(avaliacao.mensagem).toContain('Pedido Gerado');
    expect(avaliacao.mensagem).toContain('Em Trânsito');
  });

  it('recusa status que o Kanban não conhece', () => {
    const avaliacao = avaliarAlteracaoStatusKanban('pendente', 'STATUS_INEXISTENTE');
    expect(avaliacao.permitido).toBe(false);
    if (avaliacao.permitido) return;
    expect(avaliacao.motivo).toBe('status-desconhecido');
  });
});
