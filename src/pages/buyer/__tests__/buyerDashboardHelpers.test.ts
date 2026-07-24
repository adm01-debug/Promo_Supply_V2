import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/feedbackToast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useBuyerPerformanceData', () => ({}));
vi.mock('@/components/ui/card', () => ({ Card: {} }));
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: {} }));
vi.mock('lucide-react', () => ({
  Users: { displayName: 'Users' },
  CheckCircle2: { displayName: 'CheckCircle2' },
  AlertTriangle: { displayName: 'AlertTriangle' },
  AlertCircle: { displayName: 'AlertCircle' },
}));

import { COLORS, PERIOD_MAP, getMetricStatus } from '../buyerDashboardHelpers';

// ─── buyerDashboardHelpers ────────────────────────────────────────────────────

describe('COLORS', () => {
  it('has 4 color values', () => {
    expect(COLORS).toHaveLength(4);
  });

  it('all values are non-empty strings', () => {
    COLORS.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('first color is the CSS variable primary', () => {
    expect(COLORS[0]).toBe('hsl(var(--primary))');
  });

  it('remaining colors are hsl() values', () => {
    COLORS.slice(1).forEach(color => {
      expect(color).toMatch(/^hsl\(/);
    });
  });
});

describe('PERIOD_MAP', () => {
  it('has 3 period keys', () => {
    expect(Object.keys(PERIOD_MAP)).toHaveLength(3);
  });

  it('3m maps to 3', () => {
    expect(PERIOD_MAP['3m']).toBe(3);
  });

  it('6m maps to 6', () => {
    expect(PERIOD_MAP['6m']).toBe(6);
  });

  it('12m maps to 12', () => {
    expect(PERIOD_MAP['12m']).toBe(12);
  });

  it('all values are positive integers', () => {
    Object.values(PERIOD_MAP).forEach(v => {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    });
  });
});

describe('getMetricStatus', () => {
  it('returns success for percentage exactly 100', () => {
    const result = getMetricStatus(100);
    expect(result.status).toBe('success');
    expect(result.color).toContain('success');
  });

  it('returns success for percentage above 100', () => {
    const result = getMetricStatus(120);
    expect(result.status).toBe('success');
  });

  it('returns warning for percentage exactly 85', () => {
    const result = getMetricStatus(85);
    expect(result.status).toBe('warning');
    expect(result.color).toContain('warning');
  });

  it('returns warning for percentage between 85 and 99', () => {
    expect(getMetricStatus(90).status).toBe('warning');
    expect(getMetricStatus(99).status).toBe('warning');
  });

  it('returns critical for percentage below 85', () => {
    const result = getMetricStatus(84);
    expect(result.status).toBe('critical');
    expect(result.color).toContain('destructive');
  });

  it('returns critical for 0', () => {
    expect(getMetricStatus(0).status).toBe('critical');
  });

  it('returns critical for negative percentage', () => {
    expect(getMetricStatus(-10).status).toBe('critical');
  });

  it('result always has both status and color fields', () => {
    [0, 50, 85, 100, 110].forEach(pct => {
      const result = getMetricStatus(pct);
      expect(result.status).toBeDefined();
      expect(result.color).toBeDefined();
    });
  });

  it('boundary: 84.9 is critical, 85.0 is warning', () => {
    expect(getMetricStatus(84.9).status).toBe('critical');
    expect(getMetricStatus(85.0).status).toBe('warning');
  });

  it('boundary: 99.9 is warning, 100.0 is success', () => {
    expect(getMetricStatus(99.9).status).toBe('warning');
    expect(getMetricStatus(100.0).status).toBe('success');
  });
});
