import { describe, it, expect } from 'vitest';
import {
  MOTIVO_EXCLUSAO_BLOQUEADA,
  statusPermiteExcluirPedido,
  selecaoTemExclusaoBloqueada,
  mensagemExclusaoParcial,
} from '../exclusaoPedido';

describe('regra de exclusao de pedido', () => {
  it('libera so o que ainda nao entrou no ciclo de recebimento', () => {
    expect(statusPermiteExcluirPedido('pendente')).toBe(true);
    expect(statusPermiteExcluirPedido('cancelado')).toBe(true);
    for (const status of ['aprovado', 'enviado', 'em_transito', 'entregue', 'parcial']) {
      expect(statusPermiteExcluirPedido(status)).toBe(false);
    }
  });

  it('bloqueia a selecao inteira quando um pedido em andamento esta junto', () => {
    expect(selecaoTemExclusaoBloqueada([{ status: 'pendente' }, { status: 'cancelado' }])).toBe(false);
    expect(selecaoTemExclusaoBloqueada([{ status: 'pendente' }, { status: 'enviado' }])).toBe(true);
    expect(selecaoTemExclusaoBloqueada([{ status: 'entregue' }])).toBe(true);
    expect(selecaoTemExclusaoBloqueada([])).toBe(false);
  });

  it('a mensagem de exclusao parcial diz quantos sobraram e por que', () => {
    const msg = mensagemExclusaoParcial(1, 3);
    expect(msg).toContain('1 de 3');
    expect(msg).toContain(MOTIVO_EXCLUSAO_BLOQUEADA);
    expect(MOTIVO_EXCLUSAO_BLOQUEADA).toContain('pendentes ou cancelados');
  });
});
