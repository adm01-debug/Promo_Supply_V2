import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDuration,
  getTimeThreshold,
  computeStats,
  type TelemetryRow,
} from '../telemetriaHelpers';

vi.mock('@/lib/feedbackToast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const makeRow = (overrides: Partial<TelemetryRow> = {}): TelemetryRow => ({
  id: 'row-1',
  operation: 'SELECT',
  table_name: 'solicitacoes',
  rpc_name: null,
  duration_ms: 100,
  record_count: 5,
  query_limit: 20,
  query_offset: 0,
  count_mode: null,
  severity: 'ok',
  error_message: null,
  user_id: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('formatDuration', () => {
  it('returns ms for durations below 1000', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(1)).toBe('1ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('returns seconds with one decimal for 1000ms', () => {
    expect(formatDuration(1000)).toBe('1.0s');
  });

  it('returns seconds with one decimal for values above 1000', () => {
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(2000)).toBe('2.0s');
    expect(formatDuration(10000)).toBe('10.0s');
  });

  it('rounds to one decimal for fractional seconds', () => {
    expect(formatDuration(1234)).toBe('1.2s');
    expect(formatDuration(9876)).toBe('9.9s');
  });
});

describe('getTimeThreshold', () => {
  const FIXED_NOW = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a from/to pair with to equal to now for 1h', () => {
    const { from, to } = getTimeThreshold('1h');
    expect(to).toBe(FIXED_NOW.toISOString());
    const fromDate = new Date(from);
    expect(FIXED_NOW.getTime() - fromDate.getTime()).toBe(3600000);
  });

  it('returns 6h offset for 6h filter', () => {
    const { from, to } = getTimeThreshold('6h');
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(21600000);
  });

  it('returns 24h offset for 24h filter', () => {
    const { from } = getTimeThreshold('24h');
    expect(FIXED_NOW.getTime() - new Date(from).getTime()).toBe(86400000);
  });

  it('returns 7d offset for 7d filter', () => {
    const { from } = getTimeThreshold('7d');
    expect(FIXED_NOW.getTime() - new Date(from).getTime()).toBe(604800000);
  });

  it('custom with only from date uses start of that day to end of today', () => {
    const customFrom = new Date('2024-06-10');
    const { from, to } = getTimeThreshold('custom', customFrom);
    const fromDate = new Date(from);
    expect(fromDate.getHours()).toBe(0);
    expect(fromDate.getMinutes()).toBe(0);
    expect(fromDate.getSeconds()).toBe(0);
    const toDate = new Date(to);
    expect(toDate.getHours()).toBe(23);
    expect(toDate.getMinutes()).toBe(59);
    expect(toDate.getSeconds()).toBe(59);
  });

  it('custom with both from and to dates sets end of to-day at 23:59:59', () => {
    // dias do calendário chegam como Date LOCAL (react-day-picker), não como meia-noite UTC
    const customFrom = new Date(2024, 5, 10);
    const customTo = new Date(2024, 5, 12);
    const { from, to } = getTimeThreshold('custom', customFrom, customTo);
    const fromDate = new Date(from);
    expect(fromDate.getFullYear()).toBe(2024);
    expect(fromDate.getMonth()).toBe(5); // June = 5
    expect(fromDate.getDate()).toBe(10);
    const toDate = new Date(to);
    expect(toDate.getHours()).toBe(23);
    expect(toDate.getMinutes()).toBe(59);
    expect(toDate.getSeconds()).toBe(59);
  });

  it('custom without customDateFrom falls back to 24h offset', () => {
    const { from } = getTimeThreshold('custom');
    expect(FIXED_NOW.getTime() - new Date(from).getTime()).toBe(86400000);
  });
});

describe('computeStats', () => {
  it('returns zeros for empty rows', () => {
    const stats = computeStats([]);
    expect(stats.verySlow).toBe(0);
    expect(stats.slow).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.avgDuration).toBe(0);
    expect(stats.topOffenders).toEqual([]);
  });

  it('counts very_slow rows', () => {
    const rows = [
      makeRow({ severity: 'very_slow' }),
      makeRow({ severity: 'very_slow' }),
      makeRow({ severity: 'ok' }),
    ];
    expect(computeStats(rows).verySlow).toBe(2);
  });

  it('counts slow rows', () => {
    const rows = [
      makeRow({ severity: 'slow' }),
      makeRow({ severity: 'ok' }),
    ];
    expect(computeStats(rows).slow).toBe(1);
  });

  it('counts error rows', () => {
    const rows = [
      makeRow({ severity: 'error', error_message: 'timeout' }),
      makeRow({ severity: 'error', error_message: 'connection refused' }),
    ];
    expect(computeStats(rows).errors).toBe(2);
  });

  it('computes avgDuration correctly', () => {
    const rows = [
      makeRow({ duration_ms: 100 }),
      makeRow({ duration_ms: 200 }),
      makeRow({ duration_ms: 300 }),
    ];
    expect(computeStats(rows).avgDuration).toBe(200);
  });

  it('rounds avgDuration to integer', () => {
    const rows = [
      makeRow({ duration_ms: 100 }),
      makeRow({ duration_ms: 200 }),
    ];
    expect(Number.isInteger(computeStats(rows).avgDuration)).toBe(true);
  });

  it('prefers rpc_name over table_name for grouping', () => {
    const rows = [
      makeRow({ rpc_name: 'get_users', table_name: 'users' }),
      makeRow({ rpc_name: 'get_users', table_name: 'users' }),
    ];
    const { topOffenders } = computeStats(rows);
    expect(topOffenders[0][0]).toBe('get_users');
    expect(topOffenders[0][1].count).toBe(2);
  });

  it('falls back to table_name when rpc_name is null', () => {
    const rows = [
      makeRow({ rpc_name: null, table_name: 'fornecedores' }),
      makeRow({ rpc_name: null, table_name: 'fornecedores' }),
    ];
    const { topOffenders } = computeStats(rows);
    expect(topOffenders[0][0]).toBe('fornecedores');
  });

  it('uses "unknown" when both rpc_name and table_name are null', () => {
    const rows = [makeRow({ rpc_name: null, table_name: null })];
    const { topOffenders } = computeStats(rows);
    expect(topOffenders[0][0]).toBe('unknown');
  });

  it('sorts topOffenders by count descending', () => {
    const rows = [
      makeRow({ table_name: 'a' }),
      makeRow({ table_name: 'b' }),
      makeRow({ table_name: 'b' }),
      makeRow({ table_name: 'c' }),
      makeRow({ table_name: 'c' }),
      makeRow({ table_name: 'c' }),
    ];
    const { topOffenders } = computeStats(rows);
    expect(topOffenders[0][0]).toBe('c');
    expect(topOffenders[0][1].count).toBe(3);
    expect(topOffenders[1][0]).toBe('b');
    expect(topOffenders[1][1].count).toBe(2);
    expect(topOffenders[2][0]).toBe('a');
    expect(topOffenders[2][1].count).toBe(1);
  });

  it('caps topOffenders at 8 entries', () => {
    const tables = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const rows = tables.map(t => makeRow({ table_name: t }));
    const { topOffenders } = computeStats(rows);
    expect(topOffenders.length).toBe(8);
  });

  it('tracks maxMs per operation', () => {
    const rows = [
      makeRow({ table_name: 'users', duration_ms: 100 }),
      makeRow({ table_name: 'users', duration_ms: 500 }),
      makeRow({ table_name: 'users', duration_ms: 250 }),
    ];
    const { topOffenders } = computeStats(rows);
    expect(topOffenders[0][1].maxMs).toBe(500);
  });

  it('tracks totalMs per operation', () => {
    const rows = [
      makeRow({ table_name: 'users', duration_ms: 100 }),
      makeRow({ table_name: 'users', duration_ms: 200 }),
    ];
    const { topOffenders } = computeStats(rows);
    expect(topOffenders[0][1].totalMs).toBe(300);
  });

  it('handles mixed severities in single call', () => {
    const rows = [
      makeRow({ severity: 'very_slow', duration_ms: 5000 }),
      makeRow({ severity: 'slow', duration_ms: 1500 }),
      makeRow({ severity: 'error', duration_ms: 0 }),
      makeRow({ severity: 'ok', duration_ms: 50 }),
    ];
    const stats = computeStats(rows);
    expect(stats.verySlow).toBe(1);
    expect(stats.slow).toBe(1);
    expect(stats.errors).toBe(1);
    expect(stats.avgDuration).toBe(Math.round((5000 + 1500 + 0 + 50) / 4));
  });
});
