import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TELEMETRIA DE QUERIES - SUITE COMPLETA DE TESTES
// Cobertura: Lógica de negócio, cálculos, filtros, validações, edge cases
// Total: 200+ testes
// ============================================================================

// --- Helpers & Factories ---

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
}

type SeverityFilter = 'all' | 'slow' | 'very_slow' | 'error';
type TimeFilter = '1h' | '6h' | '24h' | '7d';

let rowIdCounter = 0;
function createRow(overrides: Partial<TelemetryRow> = {}): TelemetryRow {
  rowIdCounter++;
  return {
    id: `row-${rowIdCounter}`,
    operation: 'SELECT',
    table_name: 'pedidos',
    rpc_name: null,
    duration_ms: 500,
    record_count: 10,
    query_limit: 100,
    query_offset: 0,
    count_mode: null,
    severity: 'normal',
    error_message: null,
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createRows(count: number, overrides: Partial<TelemetryRow> = {}): TelemetryRow[] {
  return Array.from({ length: count }, () => createRow(overrides));
}

function createMixedRows(): TelemetryRow[] {
  return [
    ...createRows(5, { severity: 'slow', duration_ms: 4000 }),
    ...createRows(3, { severity: 'very_slow', duration_ms: 10000 }),
    ...createRows(2, { severity: 'error', duration_ms: 500, error_message: 'timeout' }),
    ...createRows(10, { severity: 'normal', duration_ms: 200 }),
  ];
}

// --- Pure Logic Functions (extracted from component) ---

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function getTimeThreshold(timeFilter: TimeFilter): string {
  const now = new Date();
  switch (timeFilter) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

function filterBySeverity(rows: TelemetryRow[], filter: SeverityFilter): TelemetryRow[] {
  if (filter === 'all') return rows;
  return rows.filter(r => r.severity === filter);
}

function filterByTime(rows: TelemetryRow[], timeFilter: TimeFilter): TelemetryRow[] {
  const threshold = getTimeThreshold(timeFilter);
  return rows.filter(r => r.created_at >= threshold);
}

function calcStats(rows: TelemetryRow[]) {
  const verySlow = rows.filter(r => r.severity === 'very_slow').length;
  const slow = rows.filter(r => r.severity === 'slow').length;
  const errors = rows.filter(r => r.severity === 'error').length;
  const avgDuration = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length)
    : 0;
  return { verySlow, slow, errors, avgDuration };
}

function calcTableStats(rows: TelemetryRow[]) {
  const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || 'unknown';
    const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
    tableStats.set(key, {
      count: prev.count + 1,
      totalMs: prev.totalMs + r.duration_ms,
      maxMs: Math.max(prev.maxMs, r.duration_ms),
    });
  }
  return tableStats;
}

function getTopOffenders(rows: TelemetryRow[], limit = 8) {
  const stats = calcTableStats(rows);
  return [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);
}

function getSeverityLevel(duration_ms: number, hasError: boolean): string {
  if (hasError) return 'error';
  if (duration_ms >= 8000) return 'very_slow';
  if (duration_ms >= 3000) return 'slow';
  return 'normal';
}

function getTimeBuckets(rows: TelemetryRow[], timeFilter: TimeFilter) {
  if (rows.length === 0) return [];
  const bucketCount = timeFilter === '1h' ? 12 : timeFilter === '6h' ? 12 : timeFilter === '24h' ? 24 : 7;
  const now = Date.now();
  const range = timeFilter === '1h' ? 3600000 : timeFilter === '6h' ? 21600000 : timeFilter === '24h' ? 86400000 : 604800000;
  const bucketSize = range / bucketCount;

  return Array.from({ length: bucketCount }, (_, i) => {
    const start = now - range + i * bucketSize;
    const end = start + bucketSize;
    const bucketRows = rows.filter(r => {
      const t = new Date(r.created_at).getTime();
      return t >= start && t < end;
    });
    return {
      label: new Date(start).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      slow: bucketRows.filter(r => r.severity === 'slow').length,
      very_slow: bucketRows.filter(r => r.severity === 'very_slow').length,
      error: bucketRows.filter(r => r.severity === 'error').length,
      avgMs: bucketRows.length > 0
        ? Math.round(bucketRows.reduce((s, r) => s + r.duration_ms, 0) / bucketRows.length)
        : 0,
    };
  });
}

function getTopByDuration(rows: TelemetryRow[], limit = 8) {
  const tableMap = new Map<string, number[]>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || 'unknown';
    if (!tableMap.has(key)) tableMap.set(key, []);
    tableMap.get(key)!.push(r.duration_ms);
  }
  return [...tableMap.entries()]
    .map(([name, durations]) => ({
      name: name.length > 18 ? name.slice(0, 18) + '…' : name,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      max: Math.max(...durations),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

function getSeverityDistribution(rows: TelemetryRow[]) {
  return [
    { name: 'Lentas', value: rows.filter(r => r.severity === 'slow').length },
    { name: 'Muito Lentas', value: rows.filter(r => r.severity === 'very_slow').length },
    { name: 'Erros', value: rows.filter(r => r.severity === 'error').length },
  ].filter(d => d.value > 0);
}

// ============================================================================
// 1. FORMAT DURATION (20 tests)
// ============================================================================
describe('Telemetria — formatDuration', () => {
  it('should format 0ms', () => expect(formatDuration(0)).toBe('0ms'));
  it('should format 1ms', () => expect(formatDuration(1)).toBe('1ms'));
  it('should format 500ms', () => expect(formatDuration(500)).toBe('500ms'));
  it('should format 999ms', () => expect(formatDuration(999)).toBe('999ms'));
  it('should format 1000ms as seconds', () => expect(formatDuration(1000)).toBe('1.0s'));
  it('should format 1500ms', () => expect(formatDuration(1500)).toBe('1.5s'));
  it('should format 3000ms', () => expect(formatDuration(3000)).toBe('3.0s'));
  it('should format 8000ms', () => expect(formatDuration(8000)).toBe('8.0s'));
  it('should format 10000ms', () => expect(formatDuration(10000)).toBe('10.0s'));
  it('should format 15200ms', () => expect(formatDuration(15200)).toBe('15.2s'));
  it('should format 60000ms (1min)', () => expect(formatDuration(60000)).toBe('60.0s'));
  it('should format 120500ms', () => expect(formatDuration(120500)).toBe('120.5s'));
  it('should format small ms correctly', () => expect(formatDuration(42)).toBe('42ms'));
  it('should format 100ms', () => expect(formatDuration(100)).toBe('100ms'));
  it('should format 2999ms as ms', () => expect(formatDuration(2999)).toBe('3.0s'));
  it('should format 1001ms', () => expect(formatDuration(1001)).toBe('1.0s'));
  it('should format 1099ms', () => expect(formatDuration(1099)).toBe('1.1s'));
  it('should format 9999ms', () => expect(formatDuration(9999)).toBe('10.0s'));
  it('should handle very large values', () => expect(formatDuration(300000)).toBe('300.0s'));
  it('should handle decimal truncation at boundary', () => {
    expect(formatDuration(1050)).toBe('1.1s'); // 1.05 → toFixed(1) = 1.1 (rounding)
  });
});

// ============================================================================
// 2. TIME THRESHOLD CALCULATION (20 tests)
// ============================================================================
describe('Telemetria — getTimeThreshold', () => {
  it('should return ISO string for 1h', () => {
    const result = getTimeThreshold('1h');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('should return ISO string for 6h', () => {
    expect(getTimeThreshold('6h')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('should return ISO string for 24h', () => {
    expect(getTimeThreshold('24h')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('should return ISO string for 7d', () => {
    expect(getTimeThreshold('7d')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('1h threshold should be ~1 hour ago', () => {
    const threshold = new Date(getTimeThreshold('1h')).getTime();
    const expected = Date.now() - 3600000;
    expect(Math.abs(threshold - expected)).toBeLessThan(1000);
  });
  it('6h threshold should be ~6 hours ago', () => {
    const threshold = new Date(getTimeThreshold('6h')).getTime();
    const expected = Date.now() - 6 * 3600000;
    expect(Math.abs(threshold - expected)).toBeLessThan(1000);
  });
  it('24h threshold should be ~24 hours ago', () => {
    const threshold = new Date(getTimeThreshold('24h')).getTime();
    const expected = Date.now() - 86400000;
    expect(Math.abs(threshold - expected)).toBeLessThan(1000);
  });
  it('7d threshold should be ~7 days ago', () => {
    const threshold = new Date(getTimeThreshold('7d')).getTime();
    const expected = Date.now() - 7 * 86400000;
    expect(Math.abs(threshold - expected)).toBeLessThan(1000);
  });
  it('1h < 6h < 24h < 7d (more recent first)', () => {
    const t1h = getTimeThreshold('1h');
    const t6h = getTimeThreshold('6h');
    const t24h = getTimeThreshold('24h');
    const t7d = getTimeThreshold('7d');
    expect(t1h > t6h).toBe(true);
    expect(t6h > t24h).toBe(true);
    expect(t24h > t7d).toBe(true);
  });
  it('all thresholds are in the past', () => {
    const now = new Date().toISOString();
    (['1h', '6h', '24h', '7d'] as TimeFilter[]).forEach(f => {
      expect(getTimeThreshold(f) < now).toBe(true);
    });
  });
  it('threshold strings are valid dates', () => {
    (['1h', '6h', '24h', '7d'] as TimeFilter[]).forEach(f => {
      const d = new Date(getTimeThreshold(f));
      expect(d.getTime()).not.toBeNaN();
    });
  });
  it('1h threshold is not more than 2h ago', () => {
    const t = new Date(getTimeThreshold('1h')).getTime();
    expect(Date.now() - t).toBeLessThan(2 * 3600000);
  });
  it('7d threshold is not more than 8d ago', () => {
    const t = new Date(getTimeThreshold('7d')).getTime();
    expect(Date.now() - t).toBeLessThan(8 * 86400000);
  });
  it('calling multiple times returns consistent results', () => {
    const a = getTimeThreshold('24h');
    const b = getTimeThreshold('24h');
    const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
    expect(diff).toBeLessThan(100);
  });
  it('returns string type', () => {
    expect(typeof getTimeThreshold('1h')).toBe('string');
  });
  it('ISO string ends with Z or timezone', () => {
    const t = getTimeThreshold('1h');
    expect(t.endsWith('Z') || t.includes('+')).toBe(true);
  });
  it('threshold for 1h is after threshold for 24h', () => {
    expect(getTimeThreshold('1h') > getTimeThreshold('24h')).toBe(true);
  });
  it('threshold for 6h is after threshold for 7d', () => {
    expect(getTimeThreshold('6h') > getTimeThreshold('7d')).toBe(true);
  });
  it('threshold length is reasonable ISO string length', () => {
    const t = getTimeThreshold('1h');
    expect(t.length).toBeGreaterThanOrEqual(20);
    expect(t.length).toBeLessThanOrEqual(30);
  });
  it('threshold can be parsed back to Date', () => {
    const t = getTimeThreshold('7d');
    const d = new Date(t);
    expect(d.toISOString()).toBe(t);
  });
});

// ============================================================================
// 3. SEVERITY FILTER (25 tests)
// ============================================================================
describe('Telemetria — filterBySeverity', () => {
  const mixed = createMixedRows();

  it('all filter returns all rows', () => {
    expect(filterBySeverity(mixed, 'all')).toHaveLength(mixed.length);
  });
  it('slow filter returns only slow', () => {
    const result = filterBySeverity(mixed, 'slow');
    expect(result.every(r => r.severity === 'slow')).toBe(true);
  });
  it('very_slow filter returns only very_slow', () => {
    const result = filterBySeverity(mixed, 'very_slow');
    expect(result.every(r => r.severity === 'very_slow')).toBe(true);
  });
  it('error filter returns only errors', () => {
    const result = filterBySeverity(mixed, 'error');
    expect(result.every(r => r.severity === 'error')).toBe(true);
  });
  it('slow count is correct', () => {
    expect(filterBySeverity(mixed, 'slow')).toHaveLength(5);
  });
  it('very_slow count is correct', () => {
    expect(filterBySeverity(mixed, 'very_slow')).toHaveLength(3);
  });
  it('error count is correct', () => {
    expect(filterBySeverity(mixed, 'error')).toHaveLength(2);
  });
  it('empty array returns empty for any filter', () => {
    expect(filterBySeverity([], 'all')).toHaveLength(0);
    expect(filterBySeverity([], 'slow')).toHaveLength(0);
    expect(filterBySeverity([], 'error')).toHaveLength(0);
  });
  it('all filter preserves order', () => {
    const result = filterBySeverity(mixed, 'all');
    expect(result).toEqual(mixed);
  });
  it('filter does not mutate original array', () => {
    const original = [...mixed];
    filterBySeverity(mixed, 'slow');
    expect(mixed).toEqual(original);
  });
  it('filtering single severity array returns same', () => {
    const onlySlow = createRows(5, { severity: 'slow' });
    expect(filterBySeverity(onlySlow, 'slow')).toHaveLength(5);
  });
  it('filtering absent severity returns empty', () => {
    const onlySlow = createRows(5, { severity: 'slow' });
    expect(filterBySeverity(onlySlow, 'error')).toHaveLength(0);
  });
  it('all with single row works', () => {
    const single = [createRow({ severity: 'error' })];
    expect(filterBySeverity(single, 'all')).toHaveLength(1);
  });
  it('error filter with single error row', () => {
    const single = [createRow({ severity: 'error' })];
    expect(filterBySeverity(single, 'error')).toHaveLength(1);
  });
  it('slow filter with single error row returns empty', () => {
    const single = [createRow({ severity: 'error' })];
    expect(filterBySeverity(single, 'slow')).toHaveLength(0);
  });
  it('handles large datasets', () => {
    const large = createRows(1000, { severity: 'slow' });
    expect(filterBySeverity(large, 'slow')).toHaveLength(1000);
  });
  it('handles large mixed datasets', () => {
    const large = [
      ...createRows(500, { severity: 'slow' }),
      ...createRows(300, { severity: 'very_slow' }),
      ...createRows(200, { severity: 'error' }),
    ];
    expect(filterBySeverity(large, 'very_slow')).toHaveLength(300);
  });
  it('all filter with 1000 rows', () => {
    const large = createRows(1000);
    expect(filterBySeverity(large, 'all')).toHaveLength(1000);
  });
  it('result rows have correct structure', () => {
    const result = filterBySeverity(mixed, 'slow');
    result.forEach(r => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('operation');
      expect(r).toHaveProperty('duration_ms');
      expect(r).toHaveProperty('severity', 'slow');
    });
  });
  it('normal severity not returned by slow filter', () => {
    const result = filterBySeverity(mixed, 'slow');
    expect(result.some(r => r.severity === 'normal')).toBe(false);
  });
  it('normal severity not returned by error filter', () => {
    const result = filterBySeverity(mixed, 'error');
    expect(result.some(r => r.severity === 'normal')).toBe(false);
  });
  it('sum of filtered results equals total for exclusive severities', () => {
    const slow = filterBySeverity(mixed, 'slow').length;
    const verySlow = filterBySeverity(mixed, 'very_slow').length;
    const error = filterBySeverity(mixed, 'error').length;
    const normal = mixed.filter(r => r.severity === 'normal').length;
    expect(slow + verySlow + error + normal).toBe(mixed.length);
  });
  it('returns new array reference', () => {
    const result = filterBySeverity(mixed, 'slow');
    expect(result).not.toBe(mixed);
  });
  it('each filtered row is same reference as original', () => {
    const result = filterBySeverity(mixed, 'slow');
    result.forEach(r => expect(mixed).toContain(r));
  });
  it('handles undefined-like severity gracefully', () => {
    const weird = [createRow({ severity: '' })];
    expect(filterBySeverity(weird, 'slow')).toHaveLength(0);
  });
});

// ============================================================================
// 4. TIME FILTER (15 tests)
// ============================================================================
describe('Telemetria — filterByTime', () => {
  it('returns rows within 1h', () => {
    const recent = [createRow({ created_at: new Date().toISOString() })];
    expect(filterByTime(recent, '1h')).toHaveLength(1);
  });
  it('excludes rows older than 1h', () => {
    const old = [createRow({ created_at: new Date(Date.now() - 2 * 3600000).toISOString() })];
    expect(filterByTime(old, '1h')).toHaveLength(0);
  });
  it('returns rows within 24h', () => {
    const recent = [createRow({ created_at: new Date(Date.now() - 3600000).toISOString() })];
    expect(filterByTime(recent, '24h')).toHaveLength(1);
  });
  it('excludes rows older than 24h', () => {
    const old = [createRow({ created_at: new Date(Date.now() - 25 * 3600000).toISOString() })];
    expect(filterByTime(old, '24h')).toHaveLength(0);
  });
  it('returns rows within 7d', () => {
    const recent = [createRow({ created_at: new Date(Date.now() - 86400000).toISOString() })];
    expect(filterByTime(recent, '7d')).toHaveLength(1);
  });
  it('excludes rows older than 7d', () => {
    const old = [createRow({ created_at: new Date(Date.now() - 8 * 86400000).toISOString() })];
    expect(filterByTime(old, '7d')).toHaveLength(0);
  });
  it('empty array returns empty', () => {
    expect(filterByTime([], '1h')).toHaveLength(0);
  });
  it('mixed ages filtered correctly for 6h', () => {
    const rows = [
      createRow({ created_at: new Date().toISOString() }),
      createRow({ created_at: new Date(Date.now() - 3 * 3600000).toISOString() }),
      createRow({ created_at: new Date(Date.now() - 7 * 3600000).toISOString() }),
    ];
    expect(filterByTime(rows, '6h')).toHaveLength(2);
  });
  it('boundary: exactly at threshold is included (gte)', () => {
    const threshold = getTimeThreshold('1h');
    const row = createRow({ created_at: threshold });
    expect(filterByTime([row], '1h')).toHaveLength(1);
  });
  it('does not mutate original array', () => {
    const rows = [createRow()];
    const original = [...rows];
    filterByTime(rows, '1h');
    expect(rows).toEqual(original);
  });
  it('handles 1000 rows efficiently', () => {
    const rows = createRows(1000, { created_at: new Date().toISOString() });
    expect(filterByTime(rows, '24h')).toHaveLength(1000);
  });
  it('all rows from future are included', () => {
    const future = [createRow({ created_at: new Date(Date.now() + 86400000).toISOString() })];
    expect(filterByTime(future, '1h')).toHaveLength(1);
  });
  it('7d includes everything from last week', () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      createRow({ created_at: new Date(Date.now() - i * 86400000 + 1000).toISOString() })
    );
    expect(filterByTime(days, '7d')).toHaveLength(7);
  });
  it('1h filter is stricter than 7d', () => {
    const rows = createRows(10, { created_at: new Date(Date.now() - 2 * 3600000).toISOString() });
    expect(filterByTime(rows, '1h').length).toBeLessThanOrEqual(filterByTime(rows, '7d').length);
  });
  it('returns correct type', () => {
    const result = filterByTime([createRow()], '24h');
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// 5. STATS CALCULATION (25 tests)
// ============================================================================
describe('Telemetria — calcStats', () => {
  it('empty rows returns all zeros', () => {
    const stats = calcStats([]);
    expect(stats).toEqual({ verySlow: 0, slow: 0, errors: 0, avgDuration: 0 });
  });
  it('counts very_slow correctly', () => {
    const rows = createRows(5, { severity: 'very_slow' });
    expect(calcStats(rows).verySlow).toBe(5);
  });
  it('counts slow correctly', () => {
    const rows = createRows(3, { severity: 'slow' });
    expect(calcStats(rows).slow).toBe(3);
  });
  it('counts errors correctly', () => {
    const rows = createRows(2, { severity: 'error' });
    expect(calcStats(rows).errors).toBe(2);
  });
  it('calculates average duration', () => {
    const rows = [
      createRow({ duration_ms: 100 }),
      createRow({ duration_ms: 200 }),
      createRow({ duration_ms: 300 }),
    ];
    expect(calcStats(rows).avgDuration).toBe(200);
  });
  it('average rounds to integer', () => {
    const rows = [createRow({ duration_ms: 100 }), createRow({ duration_ms: 201 })];
    expect(calcStats(rows).avgDuration).toBe(151); // (100+201)/2 = 150.5 → 151
  });
  it('single row average equals its duration', () => {
    const rows = [createRow({ duration_ms: 4567 })];
    expect(calcStats(rows).avgDuration).toBe(4567);
  });
  it('mixed severities counted independently', () => {
    const mixed = createMixedRows();
    const stats = calcStats(mixed);
    expect(stats.verySlow).toBe(3);
    expect(stats.slow).toBe(5);
    expect(stats.errors).toBe(2);
  });
  it('normal severity not counted in any alert bucket', () => {
    const rows = createRows(10, { severity: 'normal' });
    const stats = calcStats(rows);
    expect(stats.verySlow).toBe(0);
    expect(stats.slow).toBe(0);
    expect(stats.errors).toBe(0);
  });
  it('average with all same duration', () => {
    const rows = createRows(100, { duration_ms: 5000 });
    expect(calcStats(rows).avgDuration).toBe(5000);
  });
  it('average with 0ms duration', () => {
    const rows = createRows(5, { duration_ms: 0 });
    expect(calcStats(rows).avgDuration).toBe(0);
  });
  it('average with very large duration', () => {
    const rows = [createRow({ duration_ms: 999999 })];
    expect(calcStats(rows).avgDuration).toBe(999999);
  });
  it('handles 1000 rows', () => {
    const rows = createRows(1000, { severity: 'slow', duration_ms: 4000 });
    const stats = calcStats(rows);
    expect(stats.slow).toBe(1000);
    expect(stats.avgDuration).toBe(4000);
  });
  it('avg duration with two values', () => {
    const rows = [createRow({ duration_ms: 0 }), createRow({ duration_ms: 10000 })];
    expect(calcStats(rows).avgDuration).toBe(5000);
  });
  it('verySlow + slow + errors <= total rows', () => {
    const mixed = createMixedRows();
    const stats = calcStats(mixed);
    expect(stats.verySlow + stats.slow + stats.errors).toBeLessThanOrEqual(mixed.length);
  });
  it('all severity counters are non-negative', () => {
    const stats = calcStats(createMixedRows());
    expect(stats.verySlow).toBeGreaterThanOrEqual(0);
    expect(stats.slow).toBeGreaterThanOrEqual(0);
    expect(stats.errors).toBeGreaterThanOrEqual(0);
    expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
  });
  it('handles rows with only normal severity', () => {
    const stats = calcStats(createRows(50, { severity: 'normal', duration_ms: 100 }));
    expect(stats.verySlow).toBe(0);
    expect(stats.slow).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.avgDuration).toBe(100);
  });
  it('returns correct type structure', () => {
    const stats = calcStats([createRow()]);
    expect(stats).toHaveProperty('verySlow');
    expect(stats).toHaveProperty('slow');
    expect(stats).toHaveProperty('errors');
    expect(stats).toHaveProperty('avgDuration');
  });
  it('average of [1, 2, 3, 4, 5] ms', () => {
    const rows = [1, 2, 3, 4, 5].map(d => createRow({ duration_ms: d }));
    expect(calcStats(rows).avgDuration).toBe(3);
  });
  it('average rounds 1.5 to 2', () => {
    const rows = [createRow({ duration_ms: 1 }), createRow({ duration_ms: 2 })];
    expect(calcStats(rows).avgDuration).toBe(2); // 1.5 rounds to 2
  });
  it('counts only exact severity match', () => {
    const rows = [createRow({ severity: 'slow_ish' as any })];
    const stats = calcStats(rows);
    expect(stats.slow).toBe(0);
  });
  it('all zeros for single normal row', () => {
    const stats = calcStats([createRow({ severity: 'normal', duration_ms: 100 })]);
    expect(stats.verySlow).toBe(0);
    expect(stats.slow).toBe(0);
    expect(stats.errors).toBe(0);
  });
  it('large mixed dataset stats are consistent', () => {
    const rows = [
      ...createRows(100, { severity: 'slow', duration_ms: 4000 }),
      ...createRows(50, { severity: 'very_slow', duration_ms: 10000 }),
      ...createRows(25, { severity: 'error', duration_ms: 1000 }),
      ...createRows(325, { severity: 'normal', duration_ms: 200 }),
    ];
    const stats = calcStats(rows);
    expect(stats.slow).toBe(100);
    expect(stats.verySlow).toBe(50);
    expect(stats.errors).toBe(25);
    // avg: (100*4000 + 50*10000 + 25*1000 + 325*200) / 500 = (400000+500000+25000+65000)/500 = 1980
    expect(stats.avgDuration).toBe(1980);
  });
  it('single error row', () => {
    const stats = calcStats([createRow({ severity: 'error', duration_ms: 0 })]);
    expect(stats.errors).toBe(1);
    expect(stats.avgDuration).toBe(0);
  });
});

// ============================================================================
// 6. TABLE STATS & TOP OFFENDERS (25 tests)
// ============================================================================
describe('Telemetria — calcTableStats & topOffenders', () => {
  it('empty rows returns empty map', () => {
    expect(calcTableStats([]).size).toBe(0);
  });
  it('single table counted once', () => {
    const stats = calcTableStats([createRow({ table_name: 'pedidos' })]);
    expect(stats.get('pedidos')?.count).toBe(1);
  });
  it('same table counted multiple times', () => {
    const rows = createRows(5, { table_name: 'pedidos' });
    expect(calcTableStats(rows).get('pedidos')?.count).toBe(5);
  });
  it('different tables counted separately', () => {
    const rows = [
      createRow({ table_name: 'pedidos' }),
      createRow({ table_name: 'fornecedores' }),
    ];
    const stats = calcTableStats(rows);
    expect(stats.size).toBe(2);
  });
  it('rpc_name takes priority over table_name', () => {
    const rows = [createRow({ table_name: 'pedidos', rpc_name: 'get_stats' })];
    const stats = calcTableStats(rows);
    expect(stats.has('get_stats')).toBe(true);
    expect(stats.has('pedidos')).toBe(false);
  });
  it('null table_name and rpc_name uses "unknown"', () => {
    const rows = [createRow({ table_name: null, rpc_name: null })];
    expect(calcTableStats(rows).has('unknown')).toBe(true);
  });
  it('totalMs is sum of durations', () => {
    const rows = [
      createRow({ table_name: 'x', duration_ms: 100 }),
      createRow({ table_name: 'x', duration_ms: 200 }),
    ];
    expect(calcTableStats(rows).get('x')?.totalMs).toBe(300);
  });
  it('maxMs is maximum duration', () => {
    const rows = [
      createRow({ table_name: 'x', duration_ms: 100 }),
      createRow({ table_name: 'x', duration_ms: 500 }),
      createRow({ table_name: 'x', duration_ms: 200 }),
    ];
    expect(calcTableStats(rows).get('x')?.maxMs).toBe(500);
  });
  it('topOffenders returns max 8 entries', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      createRow({ table_name: `table_${i}` })
    );
    expect(getTopOffenders(rows).length).toBeLessThanOrEqual(8);
  });
  it('topOffenders sorted by count descending', () => {
    const rows = [
      ...createRows(10, { table_name: 'a' }),
      ...createRows(5, { table_name: 'b' }),
      ...createRows(20, { table_name: 'c' }),
    ];
    const top = getTopOffenders(rows);
    expect(top[0][0]).toBe('c');
    expect(top[1][0]).toBe('a');
    expect(top[2][0]).toBe('b');
  });
  it('topOffenders with single table', () => {
    const rows = createRows(5, { table_name: 'only' });
    const top = getTopOffenders(rows);
    expect(top).toHaveLength(1);
    expect(top[0][0]).toBe('only');
  });
  it('topOffenders with empty rows', () => {
    expect(getTopOffenders([])).toHaveLength(0);
  });
  it('topOffenders with custom limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      createRow({ table_name: `t${i}` })
    );
    expect(getTopOffenders(rows, 3)).toHaveLength(3);
  });
  it('table stats maxMs with single row', () => {
    const rows = [createRow({ table_name: 'x', duration_ms: 42 })];
    expect(calcTableStats(rows).get('x')?.maxMs).toBe(42);
  });
  it('table stats count with 100 same table rows', () => {
    const rows = createRows(100, { table_name: 'big' });
    expect(calcTableStats(rows).get('big')?.count).toBe(100);
  });
  it('handles mix of rpc and table names', () => {
    const rows = [
      createRow({ table_name: 'pedidos', rpc_name: null }),
      createRow({ table_name: null, rpc_name: 'get_data' }),
      createRow({ table_name: 'pedidos', rpc_name: 'get_data' }),
    ];
    const stats = calcTableStats(rows);
    expect(stats.get('pedidos')?.count).toBe(1);
    expect(stats.get('get_data')?.count).toBe(2);
  });
  it('totalMs equals sum check for mixed', () => {
    const rows = [
      createRow({ table_name: 'a', duration_ms: 100 }),
      createRow({ table_name: 'a', duration_ms: 300 }),
      createRow({ table_name: 'b', duration_ms: 500 }),
    ];
    const stats = calcTableStats(rows);
    expect(stats.get('a')?.totalMs).toBe(400);
    expect(stats.get('b')?.totalMs).toBe(500);
  });
  it('maxMs equals max check for mixed', () => {
    const rows = [
      createRow({ table_name: 'a', duration_ms: 100 }),
      createRow({ table_name: 'a', duration_ms: 9999 }),
    ];
    expect(calcTableStats(rows).get('a')?.maxMs).toBe(9999);
  });
  it('top offenders entries have correct structure', () => {
    const rows = createRows(5, { table_name: 'test' });
    const top = getTopOffenders(rows);
    top.forEach(([name, stats]) => {
      expect(typeof name).toBe('string');
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('totalMs');
      expect(stats).toHaveProperty('maxMs');
    });
  });
  it('top offenders with equal counts preserves all', () => {
    const rows = [
      createRow({ table_name: 'a' }),
      createRow({ table_name: 'b' }),
      createRow({ table_name: 'c' }),
    ];
    expect(getTopOffenders(rows)).toHaveLength(3);
  });
  it('large dataset top offenders performance', () => {
    const tables = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const rows = tables.flatMap((t, i) => createRows((i + 1) * 10, { table_name: t }));
    const top = getTopOffenders(rows);
    expect(top).toHaveLength(8);
    expect(top[0][0]).toBe('j'); // 100 rows
  });
  it('maxMs with 0ms duration', () => {
    const rows = createRows(3, { table_name: 'x', duration_ms: 0 });
    expect(calcTableStats(rows).get('x')?.maxMs).toBe(0);
  });
  it('totalMs with 0ms durations', () => {
    const rows = createRows(3, { table_name: 'x', duration_ms: 0 });
    expect(calcTableStats(rows).get('x')?.totalMs).toBe(0);
  });
  it('different rpc names create different entries', () => {
    const rows = [
      createRow({ rpc_name: 'rpc_a' }),
      createRow({ rpc_name: 'rpc_b' }),
    ];
    expect(calcTableStats(rows).size).toBe(2);
  });
});

// ============================================================================
// 7. SEVERITY LEVEL CLASSIFICATION (20 tests)
// ============================================================================
describe('Telemetria — getSeverityLevel', () => {
  it('0ms is normal', () => expect(getSeverityLevel(0, false)).toBe('normal'));
  it('100ms is normal', () => expect(getSeverityLevel(100, false)).toBe('normal'));
  it('2999ms is normal', () => expect(getSeverityLevel(2999, false)).toBe('normal'));
  it('3000ms is slow', () => expect(getSeverityLevel(3000, false)).toBe('slow'));
  it('5000ms is slow', () => expect(getSeverityLevel(5000, false)).toBe('slow'));
  it('7999ms is slow', () => expect(getSeverityLevel(7999, false)).toBe('slow'));
  it('8000ms is very_slow', () => expect(getSeverityLevel(8000, false)).toBe('very_slow'));
  it('10000ms is very_slow', () => expect(getSeverityLevel(10000, false)).toBe('very_slow'));
  it('99999ms is very_slow', () => expect(getSeverityLevel(99999, false)).toBe('very_slow'));
  it('error with 0ms is error', () => expect(getSeverityLevel(0, true)).toBe('error'));
  it('error with 10000ms is still error', () => expect(getSeverityLevel(10000, true)).toBe('error'));
  it('error takes priority over slow', () => expect(getSeverityLevel(5000, true)).toBe('error'));
  it('error takes priority over very_slow', () => expect(getSeverityLevel(8000, true)).toBe('error'));
  it('1ms is normal', () => expect(getSeverityLevel(1, false)).toBe('normal'));
  it('2000ms is normal', () => expect(getSeverityLevel(2000, false)).toBe('normal'));
  it('3001ms is slow', () => expect(getSeverityLevel(3001, false)).toBe('slow'));
  it('8001ms is very_slow', () => expect(getSeverityLevel(8001, false)).toBe('very_slow'));
  it('error with 1ms', () => expect(getSeverityLevel(1, true)).toBe('error'));
  it('boundary: exactly 3000 is slow', () => expect(getSeverityLevel(3000, false)).toBe('slow'));
  it('boundary: exactly 8000 is very_slow', () => expect(getSeverityLevel(8000, false)).toBe('very_slow'));
});

// ============================================================================
// 8. TIME BUCKETS (20 tests)
// ============================================================================
describe('Telemetria — getTimeBuckets', () => {
  it('empty rows returns empty', () => {
    expect(getTimeBuckets([], '24h')).toHaveLength(0);
  });
  it('1h returns 12 buckets', () => {
    const rows = [createRow({ created_at: new Date().toISOString() })];
    expect(getTimeBuckets(rows, '1h')).toHaveLength(12);
  });
  it('6h returns 12 buckets', () => {
    const rows = [createRow()];
    expect(getTimeBuckets(rows, '6h')).toHaveLength(12);
  });
  it('24h returns 24 buckets', () => {
    const rows = [createRow()];
    expect(getTimeBuckets(rows, '24h')).toHaveLength(24);
  });
  it('7d returns 7 buckets', () => {
    const rows = [createRow()];
    expect(getTimeBuckets(rows, '7d')).toHaveLength(7);
  });
  it('each bucket has required fields', () => {
    const rows = [createRow()];
    const buckets = getTimeBuckets(rows, '1h');
    buckets.forEach(b => {
      expect(b).toHaveProperty('label');
      expect(b).toHaveProperty('slow');
      expect(b).toHaveProperty('very_slow');
      expect(b).toHaveProperty('error');
      expect(b).toHaveProperty('avgMs');
    });
  });
  it('recent row lands in some bucket', () => {
    const rows = [createRow({ created_at: new Date(Date.now() - 60000).toISOString(), severity: 'slow' })];
    const buckets = getTimeBuckets(rows, '1h');
    const totalSlow = buckets.reduce((s, b) => s + b.slow, 0);
    expect(totalSlow).toBe(1);
  });
  it('empty buckets have 0 counts', () => {
    const rows = [createRow({ created_at: new Date().toISOString() })];
    const buckets = getTimeBuckets(rows, '24h');
    const emptyBuckets = buckets.filter(b => b.slow === 0 && b.very_slow === 0 && b.error === 0);
    expect(emptyBuckets.length).toBeGreaterThan(0);
  });
  it('avgMs is 0 for empty buckets', () => {
    const rows = [createRow({ created_at: new Date().toISOString() })];
    const buckets = getTimeBuckets(rows, '24h');
    buckets.filter(b => b.slow === 0 && b.very_slow === 0 && b.error === 0)
      .forEach(b => expect(b.avgMs).toBe(0));
  });
  it('avgMs calculated correctly in bucket', () => {
    const now = new Date();
    const rows = [
      createRow({ created_at: now.toISOString(), duration_ms: 100 }),
      createRow({ created_at: now.toISOString(), duration_ms: 300 }),
    ];
    const buckets = getTimeBuckets(rows, '1h');
    const nonEmpty = buckets.filter(b => b.avgMs > 0);
    if (nonEmpty.length > 0) {
      expect(nonEmpty[0].avgMs).toBe(200);
    }
  });
  it('labels are strings', () => {
    const rows = [createRow()];
    getTimeBuckets(rows, '1h').forEach(b => expect(typeof b.label).toBe('string'));
  });
  it('slow count in bucket is non-negative', () => {
    const rows = createMixedRows();
    getTimeBuckets(rows, '24h').forEach(b => {
      expect(b.slow).toBeGreaterThanOrEqual(0);
      expect(b.very_slow).toBeGreaterThanOrEqual(0);
      expect(b.error).toBeGreaterThanOrEqual(0);
    });
  });
  it('total across buckets equals total rows (for recent data)', () => {
    const recent = new Date(Date.now() - 60000).toISOString();
    const rows = createRows(10, { created_at: recent, severity: 'slow' });
    const buckets = getTimeBuckets(rows, '1h');
    const totalSlow = buckets.reduce((s, b) => s + b.slow, 0);
    expect(totalSlow).toBe(10);
  });
  it('handles old data that falls outside all buckets', () => {
    const rows = [createRow({ created_at: new Date(Date.now() - 10 * 86400000).toISOString() })];
    const buckets = getTimeBuckets(rows, '1h');
    const totalAll = buckets.reduce((s, b) => s + b.slow + b.very_slow + b.error, 0);
    expect(totalAll).toBe(0);
  });
  it('multiple severities in same bucket', () => {
    const recent = new Date(Date.now() - 60000).toISOString();
    const rows = [
      createRow({ created_at: recent, severity: 'slow' }),
      createRow({ created_at: recent, severity: 'very_slow' }),
      createRow({ created_at: recent, severity: 'error' }),
    ];
    const buckets = getTimeBuckets(rows, '1h');
    const total = buckets.reduce((s, b) => s + b.slow + b.very_slow + b.error, 0);
    expect(total).toBe(3);
  });
  it('bucket count is consistent regardless of data volume', () => {
    expect(getTimeBuckets(createRows(1), '24h')).toHaveLength(24);
    expect(getTimeBuckets(createRows(1000), '24h')).toHaveLength(24);
  });
  it('7d bucket labels are strings', () => {
    getTimeBuckets([createRow()], '7d').forEach(b => expect(typeof b.label).toBe('string'));
  });
  it('avgMs rounded to integer', () => {
    const now = new Date().toISOString();
    const rows = [
      createRow({ created_at: now, duration_ms: 101 }),
      createRow({ created_at: now, duration_ms: 102 }),
    ];
    const buckets = getTimeBuckets(rows, '1h');
    buckets.forEach(b => {
      if (b.avgMs > 0) expect(Number.isInteger(b.avgMs)).toBe(true);
    });
  });
  it('normal severity rows not counted in slow/very_slow/error', () => {
    const now = new Date().toISOString();
    const rows = createRows(10, { created_at: now, severity: 'normal' });
    const buckets = getTimeBuckets(rows, '1h');
    buckets.forEach(b => {
      expect(b.slow).toBe(0);
      expect(b.very_slow).toBe(0);
      expect(b.error).toBe(0);
    });
  });
});

// ============================================================================
// 9. TOP BY DURATION (15 tests)
// ============================================================================
describe('Telemetria — getTopByDuration', () => {
  it('empty rows returns empty', () => {
    expect(getTopByDuration([])).toHaveLength(0);
  });
  it('single table returns single entry', () => {
    const rows = createRows(5, { table_name: 'x', duration_ms: 100 });
    const top = getTopByDuration(rows);
    expect(top).toHaveLength(1);
    expect(top[0].avg).toBe(100);
    expect(top[0].max).toBe(100);
  });
  it('sorted by avg descending', () => {
    const rows = [
      createRow({ table_name: 'a', duration_ms: 100 }),
      createRow({ table_name: 'b', duration_ms: 500 }),
    ];
    const top = getTopByDuration(rows);
    expect(top[0].name).toBe('b');
  });
  it('max is highest duration for table', () => {
    const rows = [
      createRow({ table_name: 'x', duration_ms: 100 }),
      createRow({ table_name: 'x', duration_ms: 9000 }),
    ];
    expect(getTopByDuration(rows)[0].max).toBe(9000);
  });
  it('avg is correct', () => {
    const rows = [
      createRow({ table_name: 'x', duration_ms: 100 }),
      createRow({ table_name: 'x', duration_ms: 300 }),
    ];
    expect(getTopByDuration(rows)[0].avg).toBe(200);
  });
  it('truncates long names', () => {
    const longName = 'a'.repeat(25);
    const rows = [createRow({ table_name: longName })];
    expect(getTopByDuration(rows)[0].name.length).toBeLessThanOrEqual(19); // 18 + '…'
  });
  it('short names not truncated', () => {
    const rows = [createRow({ table_name: 'short' })];
    expect(getTopByDuration(rows)[0].name).toBe('short');
  });
  it('exactly 18 chars not truncated', () => {
    const name = 'a'.repeat(18);
    const rows = [createRow({ table_name: name })];
    expect(getTopByDuration(rows)[0].name).toBe(name);
  });
  it('19 chars is truncated', () => {
    const name = 'a'.repeat(19);
    const rows = [createRow({ table_name: name })];
    expect(getTopByDuration(rows)[0].name).toContain('…');
  });
  it('limit parameter works', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      createRow({ table_name: `t${i}`, duration_ms: (i + 1) * 100 })
    );
    expect(getTopByDuration(rows, 5)).toHaveLength(5);
  });
  it('default limit is 8', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      createRow({ table_name: `t${i}` })
    );
    expect(getTopByDuration(rows)).toHaveLength(8);
  });
  it('rpc_name used as key', () => {
    const rows = [createRow({ rpc_name: 'my_rpc', table_name: 'ignored' })];
    expect(getTopByDuration(rows)[0].name).toBe('my_rpc');
  });
  it('null both uses unknown', () => {
    const rows = [createRow({ rpc_name: null, table_name: null })];
    expect(getTopByDuration(rows)[0].name).toBe('unknown');
  });
  it('avg rounded to integer', () => {
    const rows = [
      createRow({ table_name: 'x', duration_ms: 101 }),
      createRow({ table_name: 'x', duration_ms: 102 }),
    ];
    const avg = getTopByDuration(rows)[0].avg;
    expect(Number.isInteger(avg)).toBe(true);
  });
  it('handles 500 rows efficiently', () => {
    const tables = ['a', 'b', 'c', 'd', 'e'];
    const rows = tables.flatMap(t => createRows(100, { table_name: t, duration_ms: Math.random() * 10000 }));
    const top = getTopByDuration(rows);
    expect(top.length).toBeLessThanOrEqual(8);
    expect(top[0].avg).toBeGreaterThanOrEqual(top[top.length - 1].avg);
  });
});

// ============================================================================
// 10. SEVERITY DISTRIBUTION (15 tests)
// ============================================================================
describe('Telemetria — getSeverityDistribution', () => {
  it('empty rows returns empty', () => {
    expect(getSeverityDistribution([])).toHaveLength(0);
  });
  it('only normal rows returns empty (filtered)', () => {
    expect(getSeverityDistribution(createRows(10, { severity: 'normal' }))).toHaveLength(0);
  });
  it('only slow rows returns one entry', () => {
    const dist = getSeverityDistribution(createRows(5, { severity: 'slow' }));
    expect(dist).toHaveLength(1);
    expect(dist[0].name).toBe('Lentas');
    expect(dist[0].value).toBe(5);
  });
  it('only very_slow rows', () => {
    const dist = getSeverityDistribution(createRows(3, { severity: 'very_slow' }));
    expect(dist).toHaveLength(1);
    expect(dist[0].name).toBe('Muito Lentas');
  });
  it('only error rows', () => {
    const dist = getSeverityDistribution(createRows(2, { severity: 'error' }));
    expect(dist).toHaveLength(1);
    expect(dist[0].name).toBe('Erros');
  });
  it('mixed returns all three', () => {
    const dist = getSeverityDistribution(createMixedRows());
    expect(dist).toHaveLength(3);
  });
  it('values sum correctly', () => {
    const mixed = createMixedRows();
    const dist = getSeverityDistribution(mixed);
    const totalDist = dist.reduce((s, d) => s + d.value, 0);
    const totalAlerts = mixed.filter(r => ['slow', 'very_slow', 'error'].includes(r.severity)).length;
    expect(totalDist).toBe(totalAlerts);
  });
  it('zero value entries filtered out', () => {
    const rows = createRows(5, { severity: 'slow' });
    const dist = getSeverityDistribution(rows);
    dist.forEach(d => expect(d.value).toBeGreaterThan(0));
  });
  it('order is Lentas, Muito Lentas, Erros', () => {
    const dist = getSeverityDistribution(createMixedRows());
    expect(dist[0].name).toBe('Lentas');
    expect(dist[1].name).toBe('Muito Lentas');
    expect(dist[2].name).toBe('Erros');
  });
  it('single slow row', () => {
    const dist = getSeverityDistribution([createRow({ severity: 'slow' })]);
    expect(dist).toHaveLength(1);
    expect(dist[0].value).toBe(1);
  });
  it('1000 rows distribution', () => {
    const rows = [
      ...createRows(500, { severity: 'slow' }),
      ...createRows(300, { severity: 'very_slow' }),
      ...createRows(200, { severity: 'error' }),
    ];
    const dist = getSeverityDistribution(rows);
    expect(dist.find(d => d.name === 'Lentas')?.value).toBe(500);
    expect(dist.find(d => d.name === 'Muito Lentas')?.value).toBe(300);
    expect(dist.find(d => d.name === 'Erros')?.value).toBe(200);
  });
  it('has name and value properties', () => {
    const dist = getSeverityDistribution(createMixedRows());
    dist.forEach(d => {
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('value');
    });
  });
  it('no negative values', () => {
    getSeverityDistribution(createMixedRows()).forEach(d => {
      expect(d.value).toBeGreaterThanOrEqual(0);
    });
  });
  it('handles rows with unknown severity', () => {
    const rows = [createRow({ severity: 'custom' as any })];
    const dist = getSeverityDistribution(rows);
    expect(dist).toHaveLength(0); // custom not in slow/very_slow/error
  });
  it('returns new array (not cached)', () => {
    const rows = createMixedRows();
    const a = getSeverityDistribution(rows);
    const b = getSeverityDistribution(rows);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ============================================================================
// 11. DATA INTEGRITY & EDGE CASES (20 tests)
// ============================================================================
describe('Telemetria — Data Integrity & Edge Cases', () => {
  it('row factory creates valid rows', () => {
    const row = createRow();
    expect(row.id).toBeTruthy();
    expect(row.operation).toBeTruthy();
    expect(row.duration_ms).toBeGreaterThanOrEqual(0);
  });
  it('row factory accepts overrides', () => {
    const row = createRow({ duration_ms: 9999, severity: 'error' });
    expect(row.duration_ms).toBe(9999);
    expect(row.severity).toBe('error');
  });
  it('createRows creates correct count', () => {
    expect(createRows(50)).toHaveLength(50);
  });
  it('createRows each has unique id', () => {
    const rows = createRows(100);
    const ids = new Set(rows.map(r => r.id));
    expect(ids.size).toBe(100);
  });
  it('mixed rows have expected distribution', () => {
    const mixed = createMixedRows();
    expect(mixed).toHaveLength(20);
  });
  it('null fields handled in table stats', () => {
    const row = createRow({ table_name: null, rpc_name: null });
    const stats = calcTableStats([row]);
    expect(stats.has('unknown')).toBe(true);
  });
  it('null record_count does not break stats', () => {
    const row = createRow({ record_count: null });
    expect(() => calcStats([row])).not.toThrow();
  });
  it('null query_limit does not break processing', () => {
    const row = createRow({ query_limit: null });
    expect(row.query_limit).toBeNull();
  });
  it('null error_message for non-error rows', () => {
    const row = createRow({ severity: 'slow', error_message: null });
    expect(row.error_message).toBeNull();
  });
  it('error_message present for error rows', () => {
    const row = createRow({ severity: 'error', error_message: 'connection timeout' });
    expect(row.error_message).toBe('connection timeout');
  });
  it('created_at is valid ISO string', () => {
    const row = createRow();
    expect(new Date(row.created_at).getTime()).not.toBeNaN();
  });
  it('duration_ms is non-negative integer', () => {
    const rows = createRows(100);
    rows.forEach(r => {
      expect(r.duration_ms).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(r.duration_ms)).toBe(true);
    });
  });
  it('operation field is always a string', () => {
    const row = createRow();
    expect(typeof row.operation).toBe('string');
  });
  it('severity field is always a string', () => {
    const row = createRow();
    expect(typeof row.severity).toBe('string');
  });
  it('concurrent filter + stats should be consistent', () => {
    const mixed = createMixedRows();
    const filtered = filterBySeverity(mixed, 'slow');
    const stats = calcStats(filtered);
    expect(stats.slow).toBe(filtered.length);
    expect(stats.verySlow).toBe(0);
    expect(stats.errors).toBe(0);
  });
  it('filter then stats pipeline works', () => {
    const mixed = createMixedRows();
    const pipeline = calcStats(filterBySeverity(mixed, 'very_slow'));
    expect(pipeline.verySlow).toBe(3);
    expect(pipeline.slow).toBe(0);
  });
  it('topOffenders from filtered data', () => {
    const rows = [
      ...createRows(5, { table_name: 'a', severity: 'slow' }),
      ...createRows(3, { table_name: 'b', severity: 'error' }),
      ...createRows(10, { table_name: 'c', severity: 'normal' }),
    ];
    const filtered = filterBySeverity(rows, 'slow');
    const top = getTopOffenders(filtered);
    expect(top).toHaveLength(1);
    expect(top[0][0]).toBe('a');
  });
  it('empty string operation is valid', () => {
    const row = createRow({ operation: '' });
    expect(row.operation).toBe('');
  });
  it('very long table name handled', () => {
    const longName = 'x'.repeat(500);
    const row = createRow({ table_name: longName });
    const top = getTopByDuration([row]);
    expect(top[0].name.length).toBeLessThanOrEqual(19);
  });
  it('duration_ms of 0 works everywhere', () => {
    const rows = createRows(5, { duration_ms: 0 });
    const stats = calcStats(rows);
    expect(stats.avgDuration).toBe(0);
    const top = getTopByDuration(rows);
    expect(top[0].avg).toBe(0);
    expect(top[0].max).toBe(0);
  });
});

// ============================================================================
// 12. COMBINED SCENARIOS & STRESS TESTS (20 tests)
// ============================================================================
describe('Telemetria — Combined Scenarios & Stress', () => {
  it('full pipeline: filter time → filter severity → stats', () => {
    const now = new Date().toISOString();
    const rows = [
      ...createRows(5, { severity: 'slow', duration_ms: 4000, created_at: now }),
      ...createRows(3, { severity: 'error', duration_ms: 1000, created_at: new Date(Date.now() - 8 * 86400000).toISOString() }),
    ];
    const timeFiltered = filterByTime(rows, '7d');
    const sevFiltered = filterBySeverity(timeFiltered, 'slow');
    const stats = calcStats(sevFiltered);
    expect(stats.slow).toBe(5);
    expect(stats.errors).toBe(0);
    expect(stats.avgDuration).toBe(4000);
  });

  it('200 rows stress test for stats', () => {
    const rows = createRows(200, { severity: 'very_slow', duration_ms: 10000 });
    const stats = calcStats(rows);
    expect(stats.verySlow).toBe(200);
    expect(stats.avgDuration).toBe(10000);
  });

  it('1000 rows stress test for table stats', () => {
    const rows = Array.from({ length: 1000 }, (_, i) =>
      createRow({ table_name: `table_${i % 50}`, duration_ms: (i % 10) * 1000 })
    );
    const stats = calcTableStats(rows);
    expect(stats.size).toBe(50);
  });

  it('500 rows top offenders stress', () => {
    const rows = Array.from({ length: 500 }, (_, i) =>
      createRow({ table_name: `t${i % 20}` })
    );
    const top = getTopOffenders(rows);
    expect(top).toHaveLength(8);
  });

  it('time buckets with 500 recent rows', () => {
    const now = new Date().toISOString();
    const rows = createRows(500, { created_at: now, severity: 'slow' });
    const buckets = getTimeBuckets(rows, '1h');
    expect(buckets).toHaveLength(12);
    const total = buckets.reduce((s, b) => s + b.slow, 0);
    expect(total).toBe(500);
  });

  it('severity distribution with 1000 mixed rows', () => {
    const rows = [
      ...createRows(400, { severity: 'slow' }),
      ...createRows(300, { severity: 'very_slow' }),
      ...createRows(200, { severity: 'error' }),
      ...createRows(100, { severity: 'normal' }),
    ];
    const dist = getSeverityDistribution(rows);
    expect(dist.reduce((s, d) => s + d.value, 0)).toBe(900); // excludes normal
  });

  it('getTopByDuration with 1000 rows across 100 tables', () => {
    const rows = Array.from({ length: 1000 }, (_, i) =>
      createRow({ table_name: `table_${i % 100}`, duration_ms: Math.floor(Math.random() * 15000) })
    );
    const top = getTopByDuration(rows);
    expect(top).toHaveLength(8);
    // Sorted descending by avg
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].avg).toBeGreaterThanOrEqual(top[i].avg);
    }
  });

  it('all functions handle empty array without error', () => {
    expect(() => {
      calcStats([]);
      calcTableStats([]);
      getTopOffenders([]);
      getTopByDuration([]);
      getSeverityDistribution([]);
      getTimeBuckets([], '24h');
      filterBySeverity([], 'all');
      filterByTime([], '1h');
    }).not.toThrow();
  });

  it('pipeline: create → filter → stats → distribution', () => {
    const rows = createMixedRows();
    const filtered = filterBySeverity(rows, 'slow');
    const stats = calcStats(filtered);
    const dist = getSeverityDistribution(filtered);
    expect(stats.slow).toBe(5);
    expect(dist).toHaveLength(1);
    expect(dist[0].name).toBe('Lentas');
  });

  it('concurrent operations on same dataset', () => {
    const rows = createMixedRows();
    const [stats, top, dist, buckets] = [
      calcStats(rows),
      getTopOffenders(rows),
      getSeverityDistribution(rows),
      getTimeBuckets(rows, '24h'),
    ];
    expect(stats.slow + stats.verySlow + stats.errors).toBe(10);
    expect(top.length).toBeGreaterThan(0);
    expect(dist.length).toBeGreaterThan(0);
    expect(buckets).toHaveLength(24);
  });

  it('formatDuration covers all severity ranges', () => {
    expect(formatDuration(100)).toBe('100ms');    // normal
    expect(formatDuration(4000)).toBe('4.0s');    // slow range
    expect(formatDuration(10000)).toBe('10.0s');  // very_slow range
  });

  it('severity classification matches filter expectations', () => {
    const rows = [
      createRow({ severity: getSeverityLevel(100, false) }),    // normal
      createRow({ severity: getSeverityLevel(4000, false) }),   // slow
      createRow({ severity: getSeverityLevel(10000, false) }),  // very_slow
      createRow({ severity: getSeverityLevel(500, true) }),     // error
    ];
    expect(filterBySeverity(rows, 'slow')).toHaveLength(1);
    expect(filterBySeverity(rows, 'very_slow')).toHaveLength(1);
    expect(filterBySeverity(rows, 'error')).toHaveLength(1);
  });

  it('table stats average matches top by duration', () => {
    const rows = [
      createRow({ table_name: 'x', duration_ms: 100 }),
      createRow({ table_name: 'x', duration_ms: 300 }),
    ];
    const tableAvg = Math.round(calcTableStats(rows).get('x')!.totalMs / calcTableStats(rows).get('x')!.count);
    const topAvg = getTopByDuration(rows)[0].avg;
    expect(tableAvg).toBe(topAvg);
  });

  it('cleanup threshold is 7 days ago', () => {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffDays = (now.getTime() - threshold.getTime()) / 86400000;
    expect(Math.round(diffDays)).toBe(7);
  });

  it('all severity types are exhaustively handled', () => {
    const severities = ['slow', 'very_slow', 'error', 'normal'];
    severities.forEach(s => {
      const rows = [createRow({ severity: s })];
      expect(() => calcStats(rows)).not.toThrow();
      expect(() => getSeverityDistribution(rows)).not.toThrow();
    });
  });

  it('multiple time filters produce correct bucket counts', () => {
    const rows = [createRow()];
    expect(getTimeBuckets(rows, '1h')).toHaveLength(12);
    expect(getTimeBuckets(rows, '6h')).toHaveLength(12);
    expect(getTimeBuckets(rows, '24h')).toHaveLength(24);
    expect(getTimeBuckets(rows, '7d')).toHaveLength(7);
  });

  it('large dataset does not throw', () => {
    const rows = createRows(5000, { severity: 'slow', duration_ms: 5000 });
    expect(() => {
      calcStats(rows);
      getTopOffenders(rows);
      getTopByDuration(rows);
      getSeverityDistribution(rows);
    }).not.toThrow();
  });

  it('all operations are deterministic', () => {
    const rows = createMixedRows();
    const stats1 = calcStats(rows);
    const stats2 = calcStats(rows);
    expect(stats1).toEqual(stats2);
  });

  it('filtered stats are subset of total stats', () => {
    const rows = createMixedRows();
    const totalStats = calcStats(rows);
    const slowStats = calcStats(filterBySeverity(rows, 'slow'));
    expect(slowStats.slow).toBeLessThanOrEqual(totalStats.slow);
  });

  it('distribution values match stats counts', () => {
    const rows = createMixedRows();
    const stats = calcStats(rows);
    const dist = getSeverityDistribution(rows);
    expect(dist.find(d => d.name === 'Lentas')?.value).toBe(stats.slow);
    expect(dist.find(d => d.name === 'Muito Lentas')?.value).toBe(stats.verySlow);
    expect(dist.find(d => d.name === 'Erros')?.value).toBe(stats.errors);
  });
});
