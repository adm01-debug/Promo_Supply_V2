import { describe, it, expect, vi } from 'vitest';

// ─── mocks for hooks with React/Supabase deps ─────────────────────────────────

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/features/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('zustand', () => ({
  create: vi.fn(() => {
    const fn = vi.fn(() => ({ soundEnabled: true, hapticEnabled: true, volume: 0.5, setSoundEnabled: vi.fn(), setHapticEnabled: vi.fn(), setVolume: vi.fn() }));
    fn.getState = vi.fn(() => ({ soundEnabled: true, hapticEnabled: true, volume: 0.5 }));
    return fn;
  }),
}));
vi.mock('zustand/middleware', () => ({ persist: (fn: unknown) => fn }));

import {
  solicitacoesStatusOptions,
  pedidosStatusOptions,
  pagamentosStatusOptions,
} from '../useBulkOperations';

import { hapticPatterns, soundConfigs } from '../useFeedback';
import { COMMON_COUNTRIES } from '../useGeoRestriction';
import { recentItemTypeIcons, recentItemTypeLabels, recentItemTypeColors } from '../useRecentlyViewed';

// ─── useBulkOperations status constants ───────────────────────────────────────

describe('solicitacoesStatusOptions', () => {
  const EXPECTED_VALUES = ['pendente', 'em_cotacao', 'aprovada', 'em_andamento', 'concluida', 'rejeitada', 'cancelada'];

  it('has 7 status options', () => {
    expect(solicitacoesStatusOptions).toHaveLength(7);
  });

  it('covers all expected status values', () => {
    const values = solicitacoesStatusOptions.map(o => o.value);
    EXPECTED_VALUES.forEach(v => expect(values).toContain(v));
  });

  it('every option has value, label, color', () => {
    solicitacoesStatusOptions.forEach(opt => {
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.color).toBe('string');
    });
  });

  it('all labels are non-empty', () => {
    solicitacoesStatusOptions.forEach(opt => {
      expect(opt.label.length).toBeGreaterThan(0);
    });
  });

  it('all colors are non-empty strings', () => {
    solicitacoesStatusOptions.forEach(opt => {
      expect(opt.color.length).toBeGreaterThan(0);
    });
  });

  it('all values are unique', () => {
    const values = solicitacoesStatusOptions.map(o => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('pedidosStatusOptions', () => {
  const EXPECTED_VALUES = ['pendente', 'aprovado', 'enviado', 'em_transito', 'entregue', 'cancelado'];

  it('has 6 status options', () => {
    expect(pedidosStatusOptions).toHaveLength(6);
  });

  it('covers all expected status values', () => {
    const values = pedidosStatusOptions.map(o => o.value);
    EXPECTED_VALUES.forEach(v => expect(values).toContain(v));
  });

  it('every option has value, label, color', () => {
    pedidosStatusOptions.forEach(opt => {
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.color).toBe('string');
    });
  });

  it('em_transito has label "Em Trânsito"', () => {
    const opt = pedidosStatusOptions.find(o => o.value === 'em_transito');
    expect(opt?.label).toBe('Em Trânsito');
  });
});

describe('pagamentosStatusOptions', () => {
  it('has 4 status options', () => {
    expect(pagamentosStatusOptions).toHaveLength(4);
  });

  it('covers pendente, aprovado, pago, cancelado', () => {
    const values = pagamentosStatusOptions.map(o => o.value);
    ['pendente', 'aprovado', 'pago', 'cancelado'].forEach(v => expect(values).toContain(v));
  });

  it('every option has value, label, color', () => {
    pagamentosStatusOptions.forEach(opt => {
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.color).toBe('string');
    });
  });
});

// ─── useFeedback constants ────────────────────────────────────────────────────

const FEEDBACK_TYPES = ['success', 'error', 'warning', 'info', 'notification', 'click', 'approval', 'rejection'] as const;

describe('hapticPatterns', () => {
  it('has all 8 feedback types', () => {
    FEEDBACK_TYPES.forEach(type => {
      expect(hapticPatterns[type]).toBeDefined();
    });
  });

  it('every pattern is a non-empty array of numbers', () => {
    FEEDBACK_TYPES.forEach(type => {
      const pattern = hapticPatterns[type];
      expect(Array.isArray(pattern)).toBe(true);
      expect(pattern.length).toBeGreaterThan(0);
      pattern.forEach(v => expect(typeof v).toBe('number'));
    });
  });

  it('success has shorter pattern than error', () => {
    expect(hapticPatterns.success.length).toBeLessThan(hapticPatterns.error.length);
  });

  it('click pattern is very short (single tap)', () => {
    expect(hapticPatterns.click.length).toBe(1);
  });

  it('rejection has longest total duration', () => {
    const rejectionTotal = hapticPatterns.rejection.reduce((a, b) => a + b, 0);
    expect(rejectionTotal).toBeGreaterThan(100);
  });
});

describe('soundConfigs', () => {
  it('has all 8 feedback types', () => {
    FEEDBACK_TYPES.forEach(type => {
      expect(soundConfigs[type]).toBeDefined();
    });
  });

  it('every config has frequency, duration, type', () => {
    FEEDBACK_TYPES.forEach(type => {
      const config = soundConfigs[type];
      expect(typeof config.frequency).toBe('number');
      expect(typeof config.duration).toBe('number');
      expect(typeof config.type).toBe('string');
    });
  });

  it('all frequencies are positive', () => {
    FEEDBACK_TYPES.forEach(type => {
      expect(soundConfigs[type].frequency).toBeGreaterThan(0);
    });
  });

  it('all durations are positive', () => {
    FEEDBACK_TYPES.forEach(type => {
      expect(soundConfigs[type].duration).toBeGreaterThan(0);
    });
  });

  it('success uses sine oscillator type', () => {
    expect(soundConfigs.success.type).toBe('sine');
  });

  it('error uses sawtooth oscillator type', () => {
    expect(soundConfigs.error.type).toBe('sawtooth');
  });
});

// ─── useGeoRestriction constants ──────────────────────────────────────────────

describe('COMMON_COUNTRIES', () => {
  it('has 20 countries', () => {
    expect(COMMON_COUNTRIES).toHaveLength(20);
  });

  it('every entry has code and name', () => {
    COMMON_COUNTRIES.forEach(country => {
      expect(typeof country.code).toBe('string');
      expect(typeof country.name).toBe('string');
      expect(country.code.length).toBeGreaterThan(0);
      expect(country.name.length).toBeGreaterThan(0);
    });
  });

  it('all codes are 2-character uppercase ISO codes', () => {
    COMMON_COUNTRIES.forEach(country => {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
    });
  });

  it('all codes are unique', () => {
    const codes = COMMON_COUNTRIES.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('includes Brazil (BR) as first entry', () => {
    expect(COMMON_COUNTRIES[0].code).toBe('BR');
    expect(COMMON_COUNTRIES[0].name).toBe('Brasil');
  });

  it('includes Portugal (PT)', () => {
    expect(COMMON_COUNTRIES.some(c => c.code === 'PT')).toBe(true);
  });

  it('includes United States (US)', () => {
    expect(COMMON_COUNTRIES.some(c => c.code === 'US')).toBe(true);
  });
});

// ─── useRecentlyViewed constants ──────────────────────────────────────────────

const RECENT_TYPES = ['solicitacao', 'pedido', 'fornecedor', 'pagamento', 'cotacao', 'contrato', 'page'] as const;

describe('recentItemTypeIcons', () => {
  it('has 7 type entries', () => {
    expect(Object.keys(recentItemTypeIcons)).toHaveLength(7);
  });

  it('every type has a non-empty icon string', () => {
    RECENT_TYPES.forEach(type => {
      expect(typeof recentItemTypeIcons[type]).toBe('string');
      expect(recentItemTypeIcons[type].length).toBeGreaterThan(0);
    });
  });

  it('solicitacao icon is "FileText"', () => {
    expect(recentItemTypeIcons.solicitacao).toBe('FileText');
  });

  it('pedido icon is "ShoppingCart"', () => {
    expect(recentItemTypeIcons.pedido).toBe('ShoppingCart');
  });
});

describe('recentItemTypeLabels', () => {
  it('has 7 type entries', () => {
    expect(Object.keys(recentItemTypeLabels)).toHaveLength(7);
  });

  it('every type has a non-empty Portuguese label', () => {
    RECENT_TYPES.forEach(type => {
      expect(typeof recentItemTypeLabels[type]).toBe('string');
      expect(recentItemTypeLabels[type].length).toBeGreaterThan(0);
    });
  });

  it('solicitacao label is "Solicitação"', () => {
    expect(recentItemTypeLabels.solicitacao).toBe('Solicitação');
  });

  it('page label is "Página"', () => {
    expect(recentItemTypeLabels.page).toBe('Página');
  });
});

describe('recentItemTypeColors', () => {
  it('has 7 type entries', () => {
    expect(Object.keys(recentItemTypeColors)).toHaveLength(7);
  });

  it('every type has a non-empty color class string', () => {
    RECENT_TYPES.forEach(type => {
      expect(typeof recentItemTypeColors[type]).toBe('string');
      expect(recentItemTypeColors[type].length).toBeGreaterThan(0);
    });
  });

  it('all colors contain both bg- and text- classes', () => {
    RECENT_TYPES.forEach(type => {
      expect(recentItemTypeColors[type]).toMatch(/bg-/);
      expect(recentItemTypeColors[type]).toMatch(/text-/);
    });
  });

  it('all colors are unique per type', () => {
    const colors = RECENT_TYPES.map(t => recentItemTypeColors[t]);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
