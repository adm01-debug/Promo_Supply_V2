import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  pedidoColumns,
  solicitacaoColumns,
  fornecedorColumns,
  cotacaoColumns,
  pagamentoColumns,
} from '../exportData';

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a positive number with R$', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('R$');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('R$');
  });

  it('returns empty string for NaN', () => {
    expect(formatCurrency('not-a-number')).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatCurrency(undefined)).toBe('');
  });

  it('formats null as zero (Number(null) === 0)', () => {
    expect(formatCurrency(null)).toContain('R$');
  });

  it('handles string numeric value', () => {
    const result = formatCurrency('250');
    expect(result).toContain('R$');
    expect(result).not.toBe('');
  });

  it('handles decimal value', () => {
    const result = formatCurrency(1.5);
    expect(result).toContain('R$');
  });

  it('returns a string', () => {
    expect(typeof formatCurrency(100)).toBe('string');
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-06-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the raw value for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('formats a valid datetime ISO string', () => {
    const result = formatDate('2024-01-01T10:00:00');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string', () => {
    expect(typeof formatDate('2024-06-15')).toBe('string');
  });
});

// ─── formatDateTime ───────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateTime(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDateTime('')).toBe('');
  });

  it('formats a valid ISO datetime', () => {
    const result = formatDateTime('2024-06-15T14:30:00');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the raw value for invalid datetime', () => {
    expect(formatDateTime('invalid')).toBe('invalid');
  });

  it('produces a longer result than formatDate for the same input (includes time)', () => {
    const date = formatDate('2024-06-15T10:00:00');
    const datetime = formatDateTime('2024-06-15T10:00:00');
    expect(datetime.length).toBeGreaterThanOrEqual(date.length);
  });
});

// ─── Column configs ───────────────────────────────────────────────────────────

describe('pedidoColumns', () => {
  it('has 9 columns', () => {
    expect(pedidoColumns).toHaveLength(9);
  });

  it('each column has key and label', () => {
    pedidoColumns.forEach(col => {
      expect(typeof col.key).toBe('string');
      expect(typeof col.label).toBe('string');
    });
  });

  it('includes "numero" column', () => {
    expect(pedidoColumns.some(c => c.key === 'numero')).toBe(true);
  });

  it('valor_total has a formatter', () => {
    const col = pedidoColumns.find(c => c.key === 'valor_total');
    expect(typeof col?.formatter).toBe('function');
  });

  it('data_emissao formatter formats dates', () => {
    const col = pedidoColumns.find(c => c.key === 'data_emissao');
    expect(col?.formatter).toBeDefined();
    expect(col?.formatter?.('2024-01-01')).toBeTruthy();
  });
});

describe('solicitacaoColumns', () => {
  it('has 10 columns', () => {
    expect(solicitacaoColumns).toHaveLength(10);
  });

  it('includes valor_estimado with currency formatter', () => {
    const col = solicitacaoColumns.find(c => c.key === 'valor_estimado');
    expect(typeof col?.formatter).toBe('function');
    expect(col?.formatter?.(500)).toContain('R$');
  });

  it('includes created_at with datetime formatter', () => {
    const col = solicitacaoColumns.find(c => c.key === 'created_at');
    expect(typeof col?.formatter).toBe('function');
  });
});

describe('fornecedorColumns', () => {
  it('has 12 columns', () => {
    expect(fornecedorColumns).toHaveLength(12);
  });

  it('includes cnpj and email columns', () => {
    const keys = fornecedorColumns.map(c => c.key);
    expect(keys).toContain('cnpj');
    expect(keys).toContain('email');
  });

  it('no column has a formatter (all plain text)', () => {
    fornecedorColumns.forEach(col => {
      expect(col.formatter).toBeUndefined();
    });
  });
});

describe('cotacaoColumns', () => {
  it('has 10 columns', () => {
    expect(cotacaoColumns).toHaveLength(10);
  });

  it('valor_unitario has currency formatter', () => {
    const col = cotacaoColumns.find(c => c.key === 'valor_unitario');
    expect(col?.formatter?.(100)).toContain('R$');
  });
});

describe('pagamentoColumns', () => {
  it('has 8 columns', () => {
    expect(pagamentoColumns).toHaveLength(8);
  });

  it('valor and valor_pago have currency formatters', () => {
    const valor = pagamentoColumns.find(c => c.key === 'valor');
    const valorPago = pagamentoColumns.find(c => c.key === 'valor_pago');
    expect(valor?.formatter?.(500)).toContain('R$');
    expect(valorPago?.formatter?.(200)).toContain('R$');
  });
});
