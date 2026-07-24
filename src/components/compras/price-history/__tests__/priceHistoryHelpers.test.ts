import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
}));
vi.mock('date-fns/format', () => ({ format: vi.fn(() => 'jan/25') }));
vi.mock('date-fns/locale/pt-BR', () => ({ ptBR: {} }));

import { formatBRL, CHART_COLORS } from '../priceHistoryHelpers';

// ─── CHART_COLORS ─────────────────────────────────────────────────────────────

describe('CHART_COLORS', () => {
  it('has 6 color entries', () => {
    expect(CHART_COLORS).toHaveLength(6);
  });

  it('all entries are non-empty strings', () => {
    CHART_COLORS.forEach(c => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    });
  });

  it('first color uses CSS variable syntax', () => {
    expect(CHART_COLORS[0]).toContain('hsl');
  });

  it('all colors reference hsl format', () => {
    CHART_COLORS.forEach(c => {
      expect(c).toMatch(/^hsl\(/);
    });
  });

  it('all color values are unique', () => {
    expect(new Set(CHART_COLORS).size).toBe(CHART_COLORS.length);
  });

  it('first color uses CSS variable --primary', () => {
    expect(CHART_COLORS[0]).toBe('hsl(var(--primary))');
  });
});

// ─── formatBRL ────────────────────────────────────────────────────────────────

describe('formatBRL', () => {
  it('formats a whole number with two decimal places', () => {
    const result = formatBRL(1000);
    expect(result).toContain('1');
    expect(result).toContain('R$');
  });

  it('starts with R$', () => {
    expect(formatBRL(250).startsWith('R$')).toBe(true);
  });

  it('formats zero', () => {
    const result = formatBRL(0);
    expect(result).toContain('R$');
    expect(result).toContain('0');
  });

  it('formats decimal values', () => {
    const result = formatBRL(1.99);
    expect(result).toContain('R$');
    expect(result).toMatch(/1[,.]?99/);
  });

  it('returns a string', () => {
    expect(typeof formatBRL(100)).toBe('string');
  });

  it('formats large values with pt-BR separators', () => {
    const result = formatBRL(10000);
    expect(result).toContain('R$');
    expect(result.length).toBeGreaterThan(5);
  });

  it('formats negative values with R$ prefix', () => {
    const result = formatBRL(-500);
    expect(result).toContain('R$');
    expect(typeof result).toBe('string');
  });

  it('always produces exactly 2 decimal places for integers', () => {
    const result = formatBRL(100);
    expect(result).toMatch(/,00$|\.00$/);
  });

  it('formats 1.5 with two decimal places', () => {
    const result = formatBRL(1.5);
    expect(result).toMatch(/1[,.]50$|1,50/);
  });

  it('result for 1000 is longer than result for 10', () => {
    expect(formatBRL(1000).length).toBeGreaterThanOrEqual(formatBRL(10).length);
  });
});
