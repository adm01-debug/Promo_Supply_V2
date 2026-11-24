import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanBoard, type KanbanPedido } from '../KanbanBoard';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const pedido = (over: Partial<KanbanPedido>): KanbanPedido => ({
  id: 'P1',
  status: 'EM_TRANSITO',
  produto: 'Papel A4',
  empresa: 'ACME',
  quantidade: 10,
  tipo: 'PE_LISO',
  ...over,
});

const arrastarPara = (pedidoId: string, colunaTestId: string) => {
  const card = screen.getByText(`#${pedidoId}`).closest('div[draggable="true"]');
  if (!card) throw new Error(`card do pedido #${pedidoId} não encontrado`);
  const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.drop(screen.getByTestId(colunaTestId), { dataTransfer });
};

describe('KanbanBoard — entrega só pelo Recebimento', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('não grava nada quando o card é arrastado para a coluna de entrega', () => {
    const onStatusChange = vi.fn();
    render(
      <KanbanBoard
        pedidos={[pedido({ id: 'P1', status: 'EM_TRANSITO' })]}
        onViewDetails={vi.fn()}
        onStatusChange={onStatusChange}
        statusesSomenteLeitura={['ENTREGUE']}
      />,
    );

    arrastarPara('P1', 'coluna-entregue');

    expect(onStatusChange).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      'A entrega é registrada na tela de Recebimento, com a conferência da mercadoria.',
    );
  });

  it('marca a coluna como somente leitura na interface', () => {
    render(
      <KanbanBoard
        pedidos={[]}
        onViewDetails={vi.fn()}
        onStatusChange={vi.fn()}
        statusesSomenteLeitura={['ENTREGUE']}
      />,
    );

    expect(screen.getAllByText('via Recebimento')).toHaveLength(1);
    expect(screen.getByTestId('coluna-entregue').textContent).toContain('via Recebimento');
  });

  it('continua gravando nas outras colunas', () => {
    const onStatusChange = vi.fn();
    render(
      <KanbanBoard
        pedidos={[pedido({ id: 'P7', status: 'PEDIDO_GERADO' })]}
        onViewDetails={vi.fn()}
        onStatusChange={onStatusChange}
        statusesSomenteLeitura={['ENTREGUE']}
      />,
    );

    arrastarPara('P7', 'coluna-pagamento');

    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith('P7', 'AGUARDANDO_PAGAMENTO');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('bloqueia a entrega mesmo sem a lista explícita de colunas somente leitura', () => {
    const onStatusChange = vi.fn();
    render(
      <KanbanBoard
        pedidos={[pedido({ id: 'P5', status: 'EM_TRANSITO' })]}
        onViewDetails={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    arrastarPara('P5', 'coluna-entregue');

    expect(onStatusChange).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it('continua gravando as outras colunas quando a lista não é informada', () => {
    const onStatusChange = vi.fn();
    render(
      <KanbanBoard
        pedidos={[pedido({ id: 'P3', status: 'PAGO' })]}
        onViewDetails={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    arrastarPara('P3', 'coluna-processamento');

    expect(onStatusChange).toHaveBeenCalledWith('P3', 'FORNECEDOR_SELECIONADO');
  });
});
