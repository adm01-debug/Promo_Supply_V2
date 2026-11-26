import { describe, expect, it } from 'vitest';
import { cpfValido, formatarCpf, formatarPlaca, normalizarPlaca, placaValida, somenteDigitos } from '../xbzHelpers';

describe('portador — CPF', () => {
  it('valida pelo dígito verificador e rejeita sequências repetidas', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('52998224724')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });

  it('formata e extrai dígitos', () => {
    expect(somenteDigitos('529.982.247-25')).toBe('52998224725');
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('123')).toBe('123');
  });
});

describe('portador — placa', () => {
  it('aceita padrão antigo e Mercosul, normalizando', () => {
    expect(placaValida('abc-1234')).toBe(true);
    expect(placaValida('ABC1D23')).toBe(true);
    expect(placaValida('ABCD123')).toBe(false);
    expect(normalizarPlaca(' abc-1d23 ')).toBe('ABC1D23');
  });

  it('formata com hífen só no padrão antigo', () => {
    expect(formatarPlaca('abc1234')).toBe('ABC-1234');
    expect(formatarPlaca('ABC1D23')).toBe('ABC1D23');
  });
});
