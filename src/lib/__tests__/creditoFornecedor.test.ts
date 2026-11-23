import { describe, expect, it } from 'vitest';
import {
  calcularAbatimentoCredito,
  mensagemAbatimentoBloqueado,
  statusAbatimentoAlcancavel,
  statusAlvoAbatimento,
} from '@/lib/creditoFornecedor';

describe('calcularAbatimentoCredito', () => {
  it('acumula o valor utilizado em vez de substituir', () => {
    expect(calcularAbatimentoCredito({ saldo: 80, valor_utilizado: 20 }, 30)).toEqual({
      valor_utilizado: 50,
      saldo: 50,
      status: 'ativo',
    });
  });

  it('marca o credito como utilizado quando o saldo zera', () => {
    expect(calcularAbatimentoCredito({ saldo: 40, valor_utilizado: 60 }, 40)).toEqual({
      valor_utilizado: 100,
      saldo: 0,
      status: 'utilizado',
    });
  });

  it('nunca deixa o saldo negativo', () => {
    expect(calcularAbatimentoCredito({ saldo: 10, valor_utilizado: 0 }, 25)).toEqual({
      valor_utilizado: 25,
      saldo: 0,
      status: 'utilizado',
    });
  });

  it('trata valor_utilizado nulo como zero', () => {
    expect(
      calcularAbatimentoCredito({ saldo: 100, valor_utilizado: null as unknown as number }, 10).valor_utilizado,
    ).toBe(10);
  });
});

describe('statusAlvoAbatimento', () => {
  it('quita quando o pago alcanca o total', () => {
    expect(statusAlvoAbatimento(100, 100)).toBe('pago');
    expect(statusAlvoAbatimento(120, 100)).toBe('pago');
  });

  it('fica parcial quando ainda falta valor', () => {
    expect(statusAlvoAbatimento(99.99, 100)).toBe('parcial');
  });
});

describe('statusAbatimentoAlcancavel', () => {
  it('permite quitar um pagamento aprovado, agendado ou atrasado', () => {
    expect(statusAbatimentoAlcancavel('aprovado', 100, 100)).toBe('pago');
    expect(statusAbatimentoAlcancavel('agendado', 100, 100)).toBe('pago');
    expect(statusAbatimentoAlcancavel('atrasado', 100, 100)).toBe('pago');
    expect(statusAbatimentoAlcancavel('parcial', 100, 100)).toBe('pago');
  });

  it('bloqueia quitar um pagamento pendente (exige aprovacao), cancelado ou concluido', () => {
    expect(statusAbatimentoAlcancavel('pendente', 100, 100)).toBeNull();
    expect(statusAbatimentoAlcancavel('cancelado', 100, 100)).toBeNull();
    expect(statusAbatimentoAlcancavel('concluido', 100, 100)).toBeNull();
  });

  it('bloqueia parcial fora de parcial, porque o banco so aceita pago depois de pago', () => {
    expect(statusAbatimentoAlcancavel('pendente', 10, 100)).toBeNull();
    expect(statusAbatimentoAlcancavel('aprovado', 10, 100)).toBeNull();
    expect(statusAbatimentoAlcancavel('parcial', 10, 100)).toBe('parcial');
    expect(statusAbatimentoAlcancavel('cancelado', 10, 100)).toBeNull();
    // o banco aceita pago -> parcial (ARRAY['parcial'] na function de validacao)
    expect(statusAbatimentoAlcancavel('pago', 10, 100)).toBe('parcial');
  });

  it('mantem o status quando ja esta no alvo (banco aceita mesma transicao)', () => {
    expect(statusAbatimentoAlcancavel('pago', 100, 100)).toBe('pago');
    expect(statusAbatimentoAlcancavel('parcial', 50, 100)).toBe('parcial');
  });
});

describe('mensagemAbatimentoBloqueado', () => {
  it('explica o bloqueio de cada alvo', () => {
    expect(mensagemAbatimentoBloqueado('pago')).toContain('Aprove o pagamento');
    expect(mensagemAbatimentoBloqueado('parcial')).toContain('parcial');
  });
});