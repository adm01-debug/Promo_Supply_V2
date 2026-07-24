import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Search: { displayName: 'Search' },
  LayoutDashboard: { displayName: 'LayoutDashboard' },
  FileText: { displayName: 'FileText' },
  ShoppingCart: { displayName: 'ShoppingCart' },
  CreditCard: { displayName: 'CreditCard' },
  Building2: { displayName: 'Building2' },
  FileSignature: { displayName: 'FileSignature' },
  TrendingUp: { displayName: 'TrendingUp' },
  Settings: { displayName: 'Settings' },
}));

import {
  fuseOptions,
  categoryConfig,
  navigationPages,
  quickActions,
  SEARCH_HISTORY_KEY,
  MAX_HISTORY_ITEMS,
  parseNaturalLanguageIntent,
  getStatusColor,
} from '../searchConfig';

// ─── searchConfig ─────────────────────────────────────────────────────────────

describe('fuseOptions', () => {
  it('isCaseSensitive is false', () => {
    expect(fuseOptions.isCaseSensitive).toBe(false);
  });

  it('includeScore and includeMatches are true', () => {
    expect(fuseOptions.includeScore).toBe(true);
    expect(fuseOptions.includeMatches).toBe(true);
  });

  it('threshold is 0.4', () => {
    expect(fuseOptions.threshold).toBe(0.4);
  });

  it('minMatchCharLength is 2', () => {
    expect(fuseOptions.minMatchCharLength).toBe(2);
  });

  it('has 4 search keys', () => {
    expect(fuseOptions.keys).toHaveLength(4);
  });

  it('title key has highest weight (2.0)', () => {
    const titleKey = fuseOptions.keys.find(k => k.name === 'title');
    expect(titleKey?.weight).toBe(2.0);
  });

  it('normalizedTitle key weight is 1.8', () => {
    const key = fuseOptions.keys.find(k => k.name === 'normalizedTitle');
    expect(key?.weight).toBe(1.8);
  });
});

describe('categoryConfig', () => {
  const EXPECTED_CATEGORIES = ['all', 'pages', 'solicitacoes', 'pedidos', 'fornecedores', 'pagamentos', 'contratos'] as const;

  it('has exactly 7 categories', () => {
    expect(Object.keys(categoryConfig)).toHaveLength(7);
  });

  it('covers all expected categories', () => {
    EXPECTED_CATEGORIES.forEach(cat => {
      expect(categoryConfig[cat]).toBeDefined();
    });
  });

  it('every category has a non-empty label', () => {
    EXPECTED_CATEGORIES.forEach(cat => {
      expect(typeof categoryConfig[cat].label).toBe('string');
      expect(categoryConfig[cat].label.length).toBeGreaterThan(0);
    });
  });

  it('every category has a defined icon', () => {
    EXPECTED_CATEGORIES.forEach(cat => {
      expect(categoryConfig[cat].icon).toBeDefined();
    });
  });

  it('every category has a non-empty color class', () => {
    EXPECTED_CATEGORIES.forEach(cat => {
      expect(typeof categoryConfig[cat].color).toBe('string');
      expect(categoryConfig[cat].color.length).toBeGreaterThan(0);
    });
  });

  it('"all" has label "Todos"', () => {
    expect(categoryConfig.all.label).toBe('Todos');
  });

  it('"pages" has label "Páginas"', () => {
    expect(categoryConfig.pages.label).toBe('Páginas');
  });
});

describe('navigationPages', () => {
  it('has 9 navigation pages', () => {
    expect(navigationPages).toHaveLength(9);
  });

  it('every page has id, title, subtitle, type, href', () => {
    navigationPages.forEach(page => {
      expect(typeof page.id).toBe('string');
      expect(typeof page.title).toBe('string');
      expect(typeof page.subtitle).toBe('string');
      expect(page.type).toBe('pages');
      expect(typeof page.href).toBe('string');
    });
  });

  it('every page has normalizedTitle and normalizedSubtitle strings', () => {
    navigationPages.forEach(page => {
      expect(typeof page.normalizedTitle).toBe('string');
      expect(typeof page.normalizedSubtitle).toBe('string');
    });
  });

  it('all ids are unique', () => {
    const ids = navigationPages.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all hrefs start with /', () => {
    navigationPages.forEach(page => {
      expect(page.href.startsWith('/')).toBe(true);
    });
  });

  it('dashboard page href is "/compras"', () => {
    const dashboard = navigationPages.find(p => p.id === 'dashboard');
    expect(dashboard?.href).toBe('/compras');
  });

  it('solicitacoes page href is "/solicitacoes"', () => {
    const page = navigationPages.find(p => p.id === 'solicitacoes');
    expect(page?.href).toBe('/solicitacoes');
  });
});

describe('quickActions', () => {
  it('has 3 quick actions', () => {
    expect(quickActions).toHaveLength(3);
  });

  it('every action has id, label, icon, action', () => {
    quickActions.forEach(action => {
      expect(typeof action.id).toBe('string');
      expect(typeof action.label).toBe('string');
      expect(action.icon).toBeDefined();
      expect(typeof action.action).toBe('string');
    });
  });

  it('all action paths start with /', () => {
    quickActions.forEach(action => {
      expect(action.action.startsWith('/')).toBe(true);
    });
  });

  it('nova-solicitacao action points to /solicitacoes?action=new', () => {
    const action = quickActions.find(a => a.id === 'nova-solicitacao');
    expect(action?.action).toBe('/solicitacoes?action=new');
  });
});

describe('constants', () => {
  it('SEARCH_HISTORY_KEY is "advanced_search_history"', () => {
    expect(SEARCH_HISTORY_KEY).toBe('advanced_search_history');
  });

  it('MAX_HISTORY_ITEMS is 10', () => {
    expect(MAX_HISTORY_ITEMS).toBe(10);
  });
});

describe('parseNaturalLanguageIntent', () => {
  it('returns null for unrecognized query', () => {
    expect(parseNaturalLanguageIntent('banana')).toBeNull();
    expect(parseNaturalLanguageIntent('')).toBeNull();
    expect(parseNaturalLanguageIntent('xyz 123')).toBeNull();
  });

  it('matches "pedidos atrasados" → category pedidos, status pendente', () => {
    const result = parseNaturalLanguageIntent('pedidos atrasados');
    expect(result).not.toBeNull();
    expect(result?.category).toBe('pedidos');
    expect(result?.statusFilter).toBe('pendente');
    expect(result?.redirectPath).toContain('/pedidos');
  });

  it('matches "pedidos pendentes" → pedidos category', () => {
    const result = parseNaturalLanguageIntent('pedidos pendentes');
    expect(result?.category).toBe('pedidos');
    expect(result?.statusFilter).toBe('pendente');
  });

  it('matches "pedidos entregues" → entregue status', () => {
    const result = parseNaturalLanguageIntent('pedidos entregues');
    expect(result?.category).toBe('pedidos');
    expect(result?.statusFilter).toBe('entregue');
  });

  it('matches "pagamentos pendentes" → pagamentos category', () => {
    const result = parseNaturalLanguageIntent('pagamentos pendentes');
    expect(result?.category).toBe('pagamentos');
    expect(result?.statusFilter).toBe('pendente');
  });

  it('matches "pagamentos pagos" → pagamentos category with pago status', () => {
    const result = parseNaturalLanguageIntent('pagamentos pagos');
    expect(result?.category).toBe('pagamentos');
    expect(result?.statusFilter).toBe('pago');
  });

  it('matches "fornecedor melhor" → fornecedores category', () => {
    const result = parseNaturalLanguageIntent('fornecedor melhor');
    expect(result?.category).toBe('fornecedores');
    expect(result?.redirectPath).toContain('supplier-performance');
  });

  it('matches "solicitações urgentes" → solicitacoes category with urgente', () => {
    const result = parseNaturalLanguageIntent('solicitações urgentes');
    expect(result?.category).toBe('solicitacoes');
    expect(result?.statusFilter).toBe('urgente');
  });

  it('matches "cotacao pendente" → redirectPath for pending cotacoes', () => {
    const result = parseNaturalLanguageIntent('cotacao pendente');
    expect(result).not.toBeNull();
    expect(result?.redirectPath).toContain('/cotacao');
  });

  it('matches "contratos vencendo" → contratos category', () => {
    const result = parseNaturalLanguageIntent('contratos vencendo');
    expect(result?.category).toBe('contratos');
  });

  it('matches "relatório" → pages category', () => {
    const result = parseNaturalLanguageIntent('relatório');
    expect(result?.category).toBe('pages');
    expect(result?.redirectPath).toContain('/relatorios');
  });

  it('matches "dashboard" → pages category', () => {
    const result = parseNaturalLanguageIntent('dashboard');
    expect(result?.category).toBe('pages');
  });

  it('matches "aprovações" → pages category redirecting to aprovacoes', () => {
    const result = parseNaturalLanguageIntent('aprovações');
    expect(result?.category).toBe('pages');
    expect(result?.redirectPath).toContain('/aprovacoes');
  });

  it('matches "catálogo" → pages category', () => {
    const result = parseNaturalLanguageIntent('catálogo');
    expect(result?.category).toBe('pages');
  });

  it('matches "produto" → pages category', () => {
    const result = parseNaturalLanguageIntent('produto');
    expect(result?.category).toBe('pages');
  });

  it('result always has a non-empty description', () => {
    const queries = ['pedidos atrasados', 'pagamentos pendentes', 'relatório', 'produto'];
    queries.forEach(q => {
      const result = parseNaturalLanguageIntent(q);
      expect(result?.description.length).toBeGreaterThan(0);
    });
  });

  it('is case-insensitive (uppercase input)', () => {
    const result = parseNaturalLanguageIntent('PEDIDOS ATRASADOS');
    expect(result?.category).toBe('pedidos');
  });
});

describe('getStatusColor', () => {
  it('returns success class for "aprovado"', () => {
    expect(getStatusColor('aprovado')).toContain('success');
  });

  it('returns success class for "ativo"', () => {
    expect(getStatusColor('ativo')).toContain('success');
  });

  it('returns success class for "pago"', () => {
    expect(getStatusColor('pago')).toContain('success');
  });

  it('returns success class for "entregue"', () => {
    expect(getStatusColor('entregue')).toContain('success');
  });

  it('returns warning class for "pendente"', () => {
    expect(getStatusColor('pendente')).toContain('warning');
  });

  it('returns warning class for "aguardando"', () => {
    expect(getStatusColor('aguardando')).toContain('warning');
  });

  it('returns destructive class for "rejeitado"', () => {
    expect(getStatusColor('rejeitado')).toContain('destructive');
  });

  it('returns destructive class for "cancelado"', () => {
    expect(getStatusColor('cancelado')).toContain('destructive');
  });

  it('returns destructive class for "atrasado"', () => {
    expect(getStatusColor('atrasado')).toContain('destructive');
  });

  it('returns muted class for unknown status', () => {
    expect(getStatusColor('unknown')).toContain('muted');
  });

  it('returns muted class for undefined', () => {
    expect(getStatusColor(undefined)).toContain('muted');
  });

  it('is case-insensitive for "APROVADO"', () => {
    expect(getStatusColor('APROVADO')).toContain('success');
  });
});
