import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  FileText: { displayName: 'FileText' },
  Users: { displayName: 'Users' },
  Package: { displayName: 'Package' },
  TrendingUp: { displayName: 'TrendingUp' },
}));

import {
  typeIcons,
  typeLabels,
  typeColors,
  fuseOptions,
} from '../enhanced-search-helpers';
import type { SearchResult } from '../enhanced-search-helpers';

// ─── enhanced-search-helpers ─────────────────────────────────────────────────

type ResultType = SearchResult['type'];
const ALL_TYPES: ResultType[] = ['solicitacao', 'pedido', 'fornecedor', 'cotacao', 'pagamento'];

// ── typeLabels ────────────────────────────────────────────────────────────────

describe('typeLabels', () => {
  it('covers all 5 result types', () => {
    ALL_TYPES.forEach(t => {
      expect(typeLabels[t]).toBeDefined();
    });
  });

  it('solicitacao → "Solicitação"', () => {
    expect(typeLabels.solicitacao).toBe('Solicitação');
  });

  it('pedido → "Pedido"', () => {
    expect(typeLabels.pedido).toBe('Pedido');
  });

  it('fornecedor → "Fornecedor"', () => {
    expect(typeLabels.fornecedor).toBe('Fornecedor');
  });

  it('cotacao → "Cotação"', () => {
    expect(typeLabels.cotacao).toBe('Cotação');
  });

  it('pagamento → "Pagamento"', () => {
    expect(typeLabels.pagamento).toBe('Pagamento');
  });

  it('all labels are non-empty strings', () => {
    ALL_TYPES.forEach(t => {
      expect(typeof typeLabels[t]).toBe('string');
      expect(typeLabels[t].length).toBeGreaterThan(0);
    });
  });
});

// ── typeColors ────────────────────────────────────────────────────────────────

describe('typeColors', () => {
  it('covers all 5 result types', () => {
    ALL_TYPES.forEach(t => {
      expect(typeColors[t]).toBeDefined();
    });
  });

  it('all color values are non-empty CSS class strings', () => {
    ALL_TYPES.forEach(t => {
      expect(typeof typeColors[t]).toBe('string');
      expect(typeColors[t].length).toBeGreaterThan(0);
    });
  });

  it('solicitacao color contains "info"', () => {
    expect(typeColors.solicitacao).toContain('info');
  });

  it('pedido color contains "purple"', () => {
    expect(typeColors.pedido).toContain('purple');
  });

  it('fornecedor color contains "success"', () => {
    expect(typeColors.fornecedor).toContain('success');
  });

  it('cotacao color contains "warning"', () => {
    expect(typeColors.cotacao).toContain('warning');
  });
});

// ── typeIcons ─────────────────────────────────────────────────────────────────

describe('typeIcons', () => {
  it('covers all 5 result types', () => {
    ALL_TYPES.forEach(t => {
      expect(typeIcons[t]).toBeDefined();
    });
  });

  it('all icon values are truthy (not null/undefined)', () => {
    ALL_TYPES.forEach(t => {
      expect(typeIcons[t]).toBeTruthy();
    });
  });
});

// ── fuseOptions ───────────────────────────────────────────────────────────────

describe('fuseOptions', () => {
  it('isCaseSensitive is false', () => {
    expect(fuseOptions.isCaseSensitive).toBe(false);
  });

  it('includeScore is true', () => {
    expect(fuseOptions.includeScore).toBe(true);
  });

  it('includeMatches is true', () => {
    expect(fuseOptions.includeMatches).toBe(true);
  });

  it('shouldSort is true', () => {
    expect(fuseOptions.shouldSort).toBe(true);
  });

  it('threshold is 0.4 (medium fuzzy tolerance)', () => {
    expect(fuseOptions.threshold).toBe(0.4);
  });

  it('minMatchCharLength is 2', () => {
    expect(fuseOptions.minMatchCharLength).toBe(2);
  });

  it('keys array has 4 entries', () => {
    expect(fuseOptions.keys).toHaveLength(4);
  });

  it('title key has highest weight', () => {
    const titleKey = fuseOptions.keys.find(k => k.name === 'title');
    expect(titleKey).toBeDefined();
    const maxWeight = Math.max(...fuseOptions.keys.map(k => k.weight));
    expect(titleKey!.weight).toBe(maxWeight);
  });

  it('all keys have name and weight', () => {
    fuseOptions.keys.forEach(k => {
      expect(typeof k.name).toBe('string');
      expect(typeof k.weight).toBe('number');
      expect(k.weight).toBeGreaterThan(0);
    });
  });
});
