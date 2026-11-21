import { describe, expect, it } from 'vitest';
import { pagamentoStatusPedido } from '../xbzHelpers';

describe('pagamentoStatusPedido', () => {
  it('usa o boolean `pago` do consultaPedidos (nov/2026) quando presente', () => {
    expect(pagamentoStatusPedido({ pago: true, idLoteDebitoStatus: 0 })).toBe('pago');
    expect(pagamentoStatusPedido({ pago: false, idLoteDebitoStatus: 3 })).toBe('pendente');
  });

  it('cai no idLoteDebitoStatus (0 pendente, 2/3 pago) quando `pago` não vem', () => {
    expect(pagamentoStatusPedido({ idLoteDebitoStatus: 0 })).toBe('pendente');
    expect(pagamentoStatusPedido({ idLoteDebitoStatus: 2 })).toBe('pago');
    expect(pagamentoStatusPedido({ idLoteDebitoStatus: 3 })).toBe('pago');
    expect(pagamentoStatusPedido({})).toBe('desconhecido');
    expect(pagamentoStatusPedido({ pago: 'sim' })).toBe('desconhecido');
  });
});
