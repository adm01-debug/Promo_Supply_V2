import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatDate, formatDateTime } from '../utils';

describe('cn', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, null, '', 'bar')).toBe('foo bar');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('deduplicates text-color classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('merges non-conflicting classes', () => {
    const result = cn('flex', 'items-center', 'gap-2');
    expect(result).toBe('flex items-center gap-2');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles mixed inputs', () => {
    const active = true;
    expect(cn('base', active && 'active', 'end')).toBe('base active end');
  });
});

describe('formatCurrency', () => {
  it('formats positive number as BRL currency', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('R$');
    expect(result).toContain('1');
  });

  it('returns R$ 0,00 for null', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
  });

  it('formats zero with R$ prefix and 0,00', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R$');
    expect(result).toContain('0,00');
  });

  it('includes cents separator', () => {
    const result = formatCurrency(1.5);
    expect(result).toContain(',');
  });

  it('formats large numbers', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('R$');
    expect(result).toContain('1');
  });
});

describe('formatDate', () => {
  it('formats a date string as dd/MM/yyyy', () => {
    const result = formatDate('2024-06-15');
    expect(result).toBe('15/06/2024');
  });

  it('formats a Date object as dd/MM/yyyy', () => {
    const result = formatDate(new Date('2024-01-01T00:00:00Z'));
    // The exact date depends on timezone, so just verify format pattern
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('formats ISO datetime string stripping the time', () => {
    const result = formatDate('2024-12-31T23:59:59.000Z');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('formatDateTime', () => {
  it('formats a date string with time in dd/MM/yyyy HH:mm', () => {
    // Use a fixed UTC time; result may vary by tz — just check pattern
    const result = formatDateTime('2024-06-15T10:30:00');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('formats a Date object with time', () => {
    const result = formatDateTime(new Date('2024-03-20T14:00:00'));
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('includes a slash separator between date parts', () => {
    const result = formatDateTime('2024-06-15T10:30:00');
    expect(result.split('/').length).toBe(3);
  });
});
