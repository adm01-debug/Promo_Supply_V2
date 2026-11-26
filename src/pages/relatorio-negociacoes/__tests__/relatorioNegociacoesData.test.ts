import { describe, it, expect } from 'vitest';
import {
  historicoMensal,
  comparativoCompradores,
  economiaPorCategoria,
  economiaPorFornecedor,
  COLORS,
} from '../relatorioNegociacoesData';

// ─── relatorioNegociacoesData ─────────────────────────────────────────────────

describe('historicoMensal', () => {
  it('has 6 months of data', () => {
    expect(historicoMensal).toHaveLength(6);
  });

  it('every item has mes, economia, volume, percentual, cotacoes', () => {
    historicoMensal.forEach(item => {
      expect(typeof item.mes).toBe('string');
      expect(typeof item.economia).toBe('number');
      expect(typeof item.volume).toBe('number');
      expect(typeof item.percentual).toBe('number');
      expect(typeof item.cotacoes).toBe('number');
    });
  });

  it('all economia values are positive', () => {
    historicoMensal.forEach(item => {
      expect(item.economia).toBeGreaterThan(0);
    });
  });

  it('all percentual values are between 0 and 100', () => {
    historicoMensal.forEach(item => {
      expect(item.percentual).toBeGreaterThan(0);
      expect(item.percentual).toBeLessThan(100);
    });
  });

  it('last month is Dez', () => {
    expect(historicoMensal[historicoMensal.length - 1].mes).toBe('Dez');
  });

  it('first month is Jul', () => {
    expect(historicoMensal[0].mes).toBe('Jul');
  });

  it('economia is always less than volume (savings < total)', () => {
    historicoMensal.forEach(item => {
      expect(item.economia).toBeLessThan(item.volume);
    });
  });
});

describe('comparativoCompradores', () => {
  it('has 4 buyers', () => {
    expect(comparativoCompradores).toHaveLength(4);
  });

  it('every item has required fields', () => {
    comparativoCompradores.forEach(comprador => {
      expect(typeof comprador.nome).toBe('string');
      expect(typeof comprador.economia).toBe('number');
      expect(typeof comprador.percentual).toBe('number');
      expect(typeof comprador.cotacoes).toBe('number');
      expect(typeof comprador.melhorPreco).toBe('number');
      expect(typeof comprador.tendencia).toBe('string');
      expect(typeof comprador.avatar).toBe('string');
    });
  });

  it('tendencia values are either "up" or "down"', () => {
    comparativoCompradores.forEach(comprador => {
      expect(['up', 'down']).toContain(comprador.tendencia);
    });
  });

  it('all avatars are 2-character uppercase initials', () => {
    comparativoCompradores.forEach(comprador => {
      expect(comprador.avatar).toMatch(/^[A-Z]{2}$/);
    });
  });

  it('all melhorPreco values are between 0 and 100', () => {
    comparativoCompradores.forEach(comprador => {
      expect(comprador.melhorPreco).toBeGreaterThan(0);
      expect(comprador.melhorPreco).toBeLessThanOrEqual(100);
    });
  });

  it('is sorted by economia descending (best buyer first)', () => {
    for (let i = 1; i < comparativoCompradores.length; i++) {
      expect(comparativoCompradores[i - 1].economia).toBeGreaterThanOrEqual(
        comparativoCompradores[i].economia
      );
    }
  });
});

describe('economiaPorCategoria', () => {
  it('has 5 categories', () => {
    expect(economiaPorCategoria).toHaveLength(5);
  });

  it('every item has categoria, economia, percentual', () => {
    economiaPorCategoria.forEach(item => {
      expect(typeof item.categoria).toBe('string');
      expect(typeof item.economia).toBe('number');
      expect(typeof item.percentual).toBe('number');
    });
  });

  it('all economia values are positive', () => {
    economiaPorCategoria.forEach(item => {
      expect(item.economia).toBeGreaterThan(0);
    });
  });

  it('all categoria names are non-empty', () => {
    economiaPorCategoria.forEach(item => {
      expect(item.categoria.length).toBeGreaterThan(0);
    });
  });
});

describe('economiaPorFornecedor', () => {
  it('has 4 suppliers', () => {
    expect(economiaPorFornecedor).toHaveLength(4);
  });

  it('every item has fornecedor, economia, negociacoes', () => {
    economiaPorFornecedor.forEach(item => {
      expect(typeof item.fornecedor).toBe('string');
      expect(typeof item.economia).toBe('number');
      expect(typeof item.negociacoes).toBe('number');
    });
  });

  it('all economia values are positive', () => {
    economiaPorFornecedor.forEach(item => {
      expect(item.economia).toBeGreaterThan(0);
    });
  });

  it('is sorted by economia descending', () => {
    for (let i = 1; i < economiaPorFornecedor.length; i++) {
      expect(economiaPorFornecedor[i - 1].economia).toBeGreaterThanOrEqual(
        economiaPorFornecedor[i].economia
      );
    }
  });
});

describe('COLORS', () => {
  it('has 5 color values', () => {
    expect(COLORS).toHaveLength(5);
  });

  it('all values are non-empty strings', () => {
    COLORS.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('first color uses CSS variable hsl(var(--primary))', () => {
    expect(COLORS[0]).toBe('hsl(var(--primary))');
  });

  it('remaining colors are hsl() values', () => {
    COLORS.slice(1).forEach(color => {
      expect(color).toMatch(/^hsl\(/);
    });
  });
});
