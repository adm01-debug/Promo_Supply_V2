import { describe, it, expect } from 'vitest';
import {
  buildClearReport,
  formatClearReportDescription,
} from '../filterClearReporter';
import type { FilterFieldDescriptor } from '../filterClearReporter';

// ─── buildClearReport ─────────────────────────────────────────────────────────

describe('buildClearReport', () => {
  it('returns empty report when no fields provided', () => {
    const report = buildClearReport([]);
    expect(report.filterLines).toEqual([]);
    expect(report.hadActiveFilters).toBe(false);
  });

  it('excludes field with null value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: null }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with undefined value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: undefined }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with empty string', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: '' }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with whitespace-only string', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: '   ' }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with "all" sentinel value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: 'all' }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with "todas" sentinel value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: 'todas' }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with "todos" sentinel value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: 'todos' }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with empty array', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: [] }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('excludes field with empty object', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Label', value: {} }];
    expect(buildClearReport(fields).filterLines).toHaveLength(0);
  });

  it('includes field with active string value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Busca', value: 'laptop' }];
    const report = buildClearReport(fields);
    expect(report.filterLines).toHaveLength(1);
    expect(report.filterLines[0]).toBe('Busca: laptop');
  });

  it('includes field with numeric value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Valor', value: 42 }];
    const report = buildClearReport(fields);
    expect(report.filterLines[0]).toBe('Valor: 42');
  });

  it('includes field with boolean value', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Urgente', value: true }];
    const report = buildClearReport(fields);
    expect(report.filterLines[0]).toBe('Urgente: true');
  });

  it('includes field with non-empty array value, joining with comma', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'Tags', value: ['a', 'b'] }];
    const report = buildClearReport(fields);
    expect(report.filterLines[0]).toBe('Tags: a, b');
  });

  it('uses custom formatter when provided', () => {
    const fields: FilterFieldDescriptor[] = [
      { key: 'k', label: 'Período', value: 'q1', format: (v) => `Período: ${v}` },
    ];
    const report = buildClearReport(fields);
    expect(report.filterLines[0]).toBe('Período: Período: q1');
  });

  it('sets hadActiveFilters to true when there is at least one active field', () => {
    const fields: FilterFieldDescriptor[] = [{ key: 'k', label: 'X', value: 'val' }];
    expect(buildClearReport(fields).hadActiveFilters).toBe(true);
  });

  it('sets hadActiveFilters to false when all fields are empty', () => {
    const fields: FilterFieldDescriptor[] = [
      { key: 'a', label: 'A', value: null },
      { key: 'b', label: 'B', value: 'all' },
    ];
    expect(buildClearReport(fields).hadActiveFilters).toBe(false);
  });

  it('passes removedStorageKeys through unchanged', () => {
    const keys = ['key-1', 'key-2'];
    const report = buildClearReport([], keys);
    expect(report.removedStorageKeys).toEqual(keys);
  });

  it('defaults removedStorageKeys to empty array', () => {
    expect(buildClearReport([]).removedStorageKeys).toEqual([]);
  });

  it('includes multiple active fields', () => {
    const fields: FilterFieldDescriptor[] = [
      { key: 'a', label: 'Busca', value: 'test' },
      { key: 'b', label: 'Categoria', value: 'Mochilas' },
    ];
    expect(buildClearReport(fields).filterLines).toHaveLength(2);
  });

  it('mixes active and empty fields correctly', () => {
    const fields: FilterFieldDescriptor[] = [
      { key: 'a', label: 'Busca', value: 'test' },
      { key: 'b', label: 'Status', value: 'all' },
      { key: 'c', label: 'Tipo', value: 'pedido' },
    ];
    const report = buildClearReport(fields);
    expect(report.filterLines).toHaveLength(2);
  });
});

// ─── formatClearReportDescription ────────────────────────────────────────────

describe('formatClearReportDescription', () => {
  it('returns empty string when no filter lines and no storage keys', () => {
    const report = { filterLines: [], removedStorageKeys: [], hadActiveFilters: false };
    expect(formatClearReportDescription(report)).toBe('');
  });

  it('starts with "Filtros removidos:" when there are filter lines', () => {
    const report = { filterLines: ['Busca: test'], removedStorageKeys: [], hadActiveFilters: true };
    expect(formatClearReportDescription(report)).toContain('Filtros removidos:');
  });

  it('formats each filter line with bullet prefix', () => {
    const report = { filterLines: ['Busca: test'], removedStorageKeys: [], hadActiveFilters: true };
    expect(formatClearReportDescription(report)).toContain('  • Busca: test');
  });

  it('includes "Armazenamento local limpo:" when there are storage keys', () => {
    const report = { filterLines: [], removedStorageKeys: ['myKey'], hadActiveFilters: false };
    expect(formatClearReportDescription(report)).toContain('Armazenamento local limpo:');
  });

  it('formats each storage key with bullet prefix', () => {
    const report = { filterLines: [], removedStorageKeys: ['myKey'], hadActiveFilters: false };
    expect(formatClearReportDescription(report)).toContain('  • myKey');
  });

  it('includes both sections when both are present', () => {
    const report = {
      filterLines: ['Busca: test'],
      removedStorageKeys: ['someKey'],
      hadActiveFilters: true,
    };
    const result = formatClearReportDescription(report);
    expect(result).toContain('Filtros removidos:');
    expect(result).toContain('Armazenamento local limpo:');
  });

  it('separates sections with a blank line when both present', () => {
    const report = {
      filterLines: ['X: y'],
      removedStorageKeys: ['k'],
      hadActiveFilters: true,
    };
    expect(formatClearReportDescription(report)).toContain('\n\n');
  });

  it('returns a string type', () => {
    const report = { filterLines: ['A: B'], removedStorageKeys: [], hadActiveFilters: true };
    expect(typeof formatClearReportDescription(report)).toBe('string');
  });

  it('multiple filter lines all appear in output', () => {
    const report = {
      filterLines: ['Busca: foo', 'Categoria: bar'],
      removedStorageKeys: [],
      hadActiveFilters: true,
    };
    const result = formatClearReportDescription(report);
    expect(result).toContain('  • Busca: foo');
    expect(result).toContain('  • Categoria: bar');
  });
});
