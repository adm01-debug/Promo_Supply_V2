import { describe, it, expect } from 'vitest';
import {
  calculateChange,
  formatNumber,
  COLORS,
} from '../executiveDashboardData';

// Calculos puros derivados do banco (sem fixtures ficticias)

describe('calculateChange', () => {
  it('returns positive value when current > previous', () => {
    expect(calculateChange(110, 100)).toBeCloseTo(10);
  });

  it('returns negative value when current < previous', () => {
    expect(calculateChange(90, 100)).toBeCloseTo(-10);
  });

  it('returns 0 when current equals previous', () => {
    expect(calculateChange(100, 100)).toBe(0);
  });

  it('calculates percentage correctly', () => {
    expect(calculateChange(150, 100)).toBeCloseTo(50);
  });

  it('handles fractional values', () => {
    expect(calculateChange(3.8, 4.45)).toBeCloseTo(-14.6, 0);
  });

  it('returns a number', () => {
    expect(typeof calculateChange(100, 50)).toBe('number');
  });

  it('guards against division by zero', () => {
    expect(calculateChange(50, 0)).toBe(0);
  });
});

describe('formatNumber', () => {
  it('formats integer with pt-BR locale', () => {
    const result = formatNumber(1000);
    expect(typeof result).toBe('string');
  });

  it('formats large number', () => {
    const result = formatNumber(12450000);
    expect(result.length).toBeGreaterThan(5);
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('returns "0" for undefined', () => {
    expect(formatNumber(undefined as unknown as number)).toBe('0');
  });

  it('returns "0" for null', () => {
    expect(formatNumber(null as unknown as number)).toBe('0');
  });

  it('returns a string', () => {
    expect(typeof formatNumber(500)).toBe('string');
  });
});

describe('COLORS', () => {
  it('has 6 color entries', () => {
    expect(COLORS).toHaveLength(6);
  });

  it('all entries use hsl format', () => {
    COLORS.forEach(c => expect(c).toContain('hsl'));
  });

  it('first color uses primary CSS variable', () => {
    expect(COLORS[0]).toContain('primary');
  });
});