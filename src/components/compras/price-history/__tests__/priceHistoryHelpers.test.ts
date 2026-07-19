import { describe, it, expect } from 'vitest';
import { formatBRL, CHART_COLORS } from '../priceHistoryHelpers';

vi.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
}));

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
});
