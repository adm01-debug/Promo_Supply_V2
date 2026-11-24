import { describe, it, expect } from 'vitest';
import { transicaoDeStatusPermitida } from '../../statusTransitions';

describe('transicaoDeStatusPermitida', () => {
  it('recusa pular etapas do fluxo de compra', () => {
    expect(transicaoDeStatusPermitida('pendente', 'enviado')).toBe(false);
    expect(transicaoDeStatusPermitida('pendente', 'em_transito')).toBe(false);
    expect(transicaoDeStatusPermitida('aprovado', 'entregue')).toBe(false);
  });

  it('aceita o caminho normal do pedido', () => {
    expect(transicaoDeStatusPermitida('pendente', 'aprovado')).toBe(true);
    expect(transicaoDeStatusPermitida('aprovado', 'enviado')).toBe(true);
    expect(transicaoDeStatusPermitida('enviado', 'entregue')).toBe(true);
    expect(transicaoDeStatusPermitida('em_transito', 'entregue')).toBe(true);
  });

  it('não devolve pedido concluído para uma etapa anterior', () => {
    expect(transicaoDeStatusPermitida('concluido', 'entregue')).toBe(false);
    expect(transicaoDeStatusPermitida('concluido', 'pendente')).toBe(false);
  });

  it('permite corrigir o status de um pedido cancelado', () => {
    expect(transicaoDeStatusPermitida('cancelado', 'pendente')).toBe(true);
  });

  it('não bloqueia quando o status atual é nulo ou desconhecido', () => {
    expect(transicaoDeStatusPermitida(null, 'aprovado')).toBe(true);
    expect(transicaoDeStatusPermitida(undefined, 'aprovado')).toBe(true);
    expect(transicaoDeStatusPermitida('status-novo-qualquer', 'aprovado')).toBe(true);
  });
});
