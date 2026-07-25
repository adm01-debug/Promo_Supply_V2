import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('react', () => ({
  ...vi.importActual('react'),
  useState: vi.fn((v: unknown) => [v, vi.fn()]),
  useMemo: vi.fn((fn: () => unknown) => fn()),
}));
vi.mock('@/components/ui/card', () => ({ Card: {} }));
vi.mock('@/components/ui/input', () => ({ Input: {} }));
vi.mock('@/components/ui/button', () => ({ Button: {} }));
vi.mock('@/components/ui/badge', () => ({ Badge: {} }));
vi.mock('@/components/ui/select', () => ({
  Select: {}, SelectContent: {}, SelectItem: {}, SelectTrigger: {}, SelectValue: {},
}));
vi.mock('@/components/ui/popover', () => ({ Popover: {}, PopoverContent: {}, PopoverTrigger: {} }));
vi.mock('@/components/ui/calendar', () => ({ Calendar: {} }));
vi.mock('@/components/ui/slider', () => ({ Slider: {} }));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/hooks/usePagamentos', () => ({}));
vi.mock('lucide-react', () => ({
  Search: { displayName: 'Search' },
  Filter: { displayName: 'Filter' },
  X: { displayName: 'X' },
  CalendarIcon: { displayName: 'CalendarIcon' },
  RotateCcw: { displayName: 'RotateCcw' },
}));
vi.mock('date-fns/format', () => ({ format: vi.fn((d: Date) => d.toISOString().split('T')[0]) }));

import { applyAdvancedFilters } from '../PagamentoAdvancedFilters';
import type { PagamentoFiltersState } from '../PagamentoAdvancedFilters';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type MinPagamento = {
  numero: string;
  fornecedor?: { razao_social?: string } | null;
  numero_nf?: string | null;
  status: string;
  forma_pagamento?: string | null;
  fornecedor_id?: string | null;
  data_vencimento: string;
  valor: number;
  [key: string]: unknown;
};

const TODAY = '2026-07-24';

const makePagamento = (overrides: Partial<MinPagamento> = {}): MinPagamento => ({
  numero: 'PAG-001',
  status: 'pendente',
  forma_pagamento: 'boleto',
  fornecedor_id: 'f1',
  data_vencimento: TODAY,
  valor: 1000,
  fornecedor: { razao_social: 'Fornecedor Alpha' },
  numero_nf: '12345',
  ...overrides,
});

const PAGAMENTOS: MinPagamento[] = [
  makePagamento({ numero: 'PAG-001', status: 'pendente', valor: 500, data_vencimento: '2026-07-23', fornecedor_id: 'f1', fornecedor: { razao_social: 'Alpha LTDA' }, numero_nf: 'NF-001', forma_pagamento: 'boleto' }),
  makePagamento({ numero: 'PAG-002', status: 'pago', valor: 2500, data_vencimento: TODAY, fornecedor_id: 'f2', fornecedor: { razao_social: 'Beta SA' }, numero_nf: 'NF-002', forma_pagamento: 'pix' }),
  makePagamento({ numero: 'PAG-003', status: 'pendente', valor: 8000, data_vencimento: '2026-07-30', fornecedor_id: 'f1', fornecedor: { razao_social: 'Alpha LTDA' }, numero_nf: 'NF-003', forma_pagamento: 'transferencia' }),
  makePagamento({ numero: 'PAG-004', status: 'cancelado', valor: 150, data_vencimento: '2026-08-15', fornecedor_id: 'f3', fornecedor: { razao_social: 'Gamma ME' }, numero_nf: null, forma_pagamento: 'boleto' }),
];

const BASE_FILTERS: PagamentoFiltersState = {
  search: '',
  status: 'todos',
  formaPagamento: 'todos',
  fornecedorId: 'todos',
  periodoVencimento: 'todos',
  valorMin: 0,
  valorMax: 1000000,
  dateFrom: undefined,
  dateTo: undefined,
};

// ─── applyAdvancedFilters ─────────────────────────────────────────────────────

describe('applyAdvancedFilters — no filters', () => {
  it('returns all items when all filters are default', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, BASE_FILTERS);
    expect(result).toHaveLength(PAGAMENTOS.length);
  });

  it('returns empty array when input is empty', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(applyAdvancedFilters([] as any, BASE_FILTERS)).toHaveLength(0);
  });
});

describe('applyAdvancedFilters — search filter', () => {
  it('filters by numero (case-insensitive)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, search: 'pag-001' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-001');
  });

  it('filters by fornecedor razao_social', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, search: 'beta' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-002');
  });

  it('filters by numero_nf', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, search: 'NF-003' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-003');
  });

  it('returns empty when no match', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, search: 'zzznomatch' });
    expect(result).toHaveLength(0);
  });

  it('matches multiple items when search term is broad', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, search: 'PAG' });
    expect(result).toHaveLength(PAGAMENTOS.length);
  });
});

describe('applyAdvancedFilters — status filter', () => {
  it('filters by status pendente', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, status: 'pendente' });
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.status).toBe('pendente'));
  });

  it('filters by status pago', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, status: 'pago' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-002');
  });

  it('filters by status cancelado', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, status: 'cancelado' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-004');
  });

  it('returns all when status is "todos"', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, status: 'todos' });
    expect(result).toHaveLength(PAGAMENTOS.length);
  });
});

describe('applyAdvancedFilters — formaPagamento filter', () => {
  it('filters by boleto', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, formaPagamento: 'boleto' });
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.forma_pagamento).toBe('boleto'));
  });

  it('filters by pix', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, formaPagamento: 'pix' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-002');
  });

  it('returns all when formaPagamento is "todos"', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, formaPagamento: 'todos' });
    expect(result).toHaveLength(PAGAMENTOS.length);
  });
});

describe('applyAdvancedFilters — fornecedorId filter', () => {
  it('filters by fornecedorId f1', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, fornecedorId: 'f1' });
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.fornecedor_id).toBe('f1'));
  });

  it('filters by fornecedorId f3', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, fornecedorId: 'f3' });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-004');
  });

  it('returns all when fornecedorId is "todos"', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, fornecedorId: 'todos' });
    expect(result).toHaveLength(PAGAMENTOS.length);
  });
});

describe('applyAdvancedFilters — valor range filter', () => {
  it('filters by valorMin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, valorMin: 1000 });
    expect(result.every(p => p.valor >= 1000)).toBe(true);
    expect(result).toHaveLength(2); // 2500 and 8000
  });

  it('filters by valorMax below default 1000000', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, valorMax: 999 });
    expect(result.every(p => p.valor <= 999)).toBe(true);
    expect(result).toHaveLength(2); // 500 and 150
  });

  it('valorMin=0 does not filter (default)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, valorMin: 0 });
    expect(result).toHaveLength(PAGAMENTOS.length);
  });

  it('valorMax=1000000 does not filter (default)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, valorMax: 1000000 });
    expect(result).toHaveLength(PAGAMENTOS.length);
  });

  it('exact valorMin equals entry valor includes it', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, valorMin: 500 });
    expect(result.some(p => p.valor === 500)).toBe(true);
  });
});

describe('applyAdvancedFilters — dateFrom / dateTo filter', () => {
  it('filters by dateFrom', () => {
    const dateFrom = new Date('2026-07-24');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, dateFrom });
    result.forEach(p => {
      expect(p.data_vencimento >= '2026-07-24').toBe(true);
    });
  });

  it('filters by dateTo', () => {
    const dateTo = new Date('2026-07-24');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, dateTo });
    result.forEach(p => {
      expect(p.data_vencimento <= '2026-07-24').toBe(true);
    });
  });

  it('combining dateFrom and dateTo narrows results', () => {
    const dateFrom = new Date('2026-07-24');
    const dateTo = new Date('2026-07-30');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, { ...BASE_FILTERS, dateFrom, dateTo });
    expect(result).toHaveLength(2); // TODAY and 2026-07-30
  });
});

describe('applyAdvancedFilters — combined filters', () => {
  it('status + formaPagamento narrows results', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, {
      ...BASE_FILTERS,
      status: 'pendente',
      formaPagamento: 'boleto',
    });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-001');
  });

  it('fornecedorId + valorMin narrows results', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, {
      ...BASE_FILTERS,
      fornecedorId: 'f1',
      valorMin: 5000,
    });
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe('PAG-003');
  });

  it('all strict filters together can return empty', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyAdvancedFilters(PAGAMENTOS as any, {
      ...BASE_FILTERS,
      status: 'pago',
      formaPagamento: 'boleto',
    });
    expect(result).toHaveLength(0);
  });
});
