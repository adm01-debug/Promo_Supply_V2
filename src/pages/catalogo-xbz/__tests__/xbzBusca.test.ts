import { describe, expect, it } from 'vitest';
import { isBuscaValida, normalizeBusca, XBZ_BUSCA_MIN } from '../xbzHelpers';

describe('normalizeBusca / isBuscaValida', () => {
  it('não substitui termo vazio pelo antigo hack "a" (XBZ devolve [] para termos curtos)', () => {
    expect(normalizeBusca('')).toBe('');
    expect(normalizeBusca('   ')).toBe('');
    expect(normalizeBusca(null)).toBe('');
    expect(normalizeBusca(undefined)).toBe('');
  });

  it('apara espaços e limita a 100 caracteres', () => {
    expect(normalizeBusca('  caneta  ')).toBe('caneta');
    expect(normalizeBusca('x'.repeat(150))).toHaveLength(100);
  });

  it(`exige ao menos ${XBZ_BUSCA_MIN} caracteres após aparar`, () => {
    expect(isBuscaValida('a')).toBe(false);
    expect(isBuscaValida('ca')).toBe(false);
    expect(isBuscaValida(' a ')).toBe(false);
    expect(isBuscaValida('can')).toBe(true);
    expect(isBuscaValida('caneta')).toBe(true);
    expect(isBuscaValida('09211')).toBe(true);
  });
});
