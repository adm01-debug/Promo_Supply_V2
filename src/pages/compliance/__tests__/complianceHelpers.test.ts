import { describe, it, expect } from 'vitest';
import {
  getComplianceStatus,
  computeComplianceKPIs,
  sortComplianceData,
  actionTypeLabels,
} from '../complianceHelpers';
import type { ComplianceData } from '../complianceHelpers';

const makeItem = (overrides: Partial<ComplianceData> = {}): ComplianceData => ({
  fornecedor_id: 'f1',
  razao_social: 'Fornecedor A Ltda',
  avaliacao: 4.0,
  supplier_status: 'ativo',
  penalty_count: 0,
  total_penalty_value: 0,
  total_deliveries: 20,
  on_time_deliveries: 20,
  late_deliveries: 0,
  on_time_rate: 100,
  avg_quality_score: 9.0,
  total_inspections: 10,
  rejected_count: 0,
  active_bonifications: 0,
  ...overrides,
});

// ─── actionTypeLabels ─────────────────────────────────────────────────────────

describe('actionTypeLabels', () => {
  it('has entries for warning, standard_fine, double_fine, temp_block, permanent_block', () => {
    const expected = ['warning', 'standard_fine', 'double_fine', 'temp_block', 'permanent_block'];
    expected.forEach(key => {
      expect(actionTypeLabels).toHaveProperty(key);
    });
  });

  it('each entry has label, color, and icon', () => {
    Object.values(actionTypeLabels).forEach(entry => {
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.color).toBe('string');
      expect(entry.icon).toBeTruthy();
    });
  });

  it('warning label is "Advertência"', () => {
    expect(actionTypeLabels.warning.label).toBe('Advertência');
  });

  it('permanent_block label is "Bloq. Permanente"', () => {
    expect(actionTypeLabels.permanent_block.label).toBe('Bloq. Permanente');
  });
});

// ─── getComplianceStatus ──────────────────────────────────────────────────────

describe('getComplianceStatus', () => {
  it('returns Bloqueado when supplier_status is bloqueado', () => {
    const result = getComplianceStatus(makeItem({ supplier_status: 'bloqueado' }));
    expect(result.label).toBe('Bloqueado');
  });

  it('returns Crítico when penalty_count >= 3', () => {
    const result = getComplianceStatus(makeItem({ penalty_count: 3 }));
    expect(result.label).toBe('Crítico');
  });

  it('returns Crítico when penalty_count exceeds 3', () => {
    const result = getComplianceStatus(makeItem({ penalty_count: 5 }));
    expect(result.label).toBe('Crítico');
  });

  it('returns Em Risco when penalty_count >= 1', () => {
    const result = getComplianceStatus(makeItem({ penalty_count: 1 }));
    expect(result.label).toBe('Em Risco');
  });

  it('returns Em Risco when late_deliveries > 0', () => {
    const result = getComplianceStatus(makeItem({ penalty_count: 0, late_deliveries: 2 }));
    expect(result.label).toBe('Em Risco');
  });

  it('returns Excelente when on_time_rate >= 95 and no penalties or late deliveries', () => {
    const result = getComplianceStatus(makeItem({ on_time_rate: 95, penalty_count: 0, late_deliveries: 0 }));
    expect(result.label).toBe('Excelente');
  });

  it('returns Excelente when on_time_rate is 100', () => {
    const result = getComplianceStatus(makeItem({ on_time_rate: 100 }));
    expect(result.label).toBe('Excelente');
  });

  it('returns Regular when on_time_rate < 95 and no penalties', () => {
    const result = getComplianceStatus(makeItem({ on_time_rate: 90, penalty_count: 0, late_deliveries: 0 }));
    expect(result.label).toBe('Regular');
  });

  it('bloqueado takes priority over penalty_count', () => {
    const result = getComplianceStatus(makeItem({ supplier_status: 'bloqueado', penalty_count: 5 }));
    expect(result.label).toBe('Bloqueado');
  });

  it('each status has color and icon', () => {
    const statuses = [
      makeItem({ supplier_status: 'bloqueado' }),
      makeItem({ penalty_count: 3 }),
      makeItem({ penalty_count: 1 }),
      makeItem({ on_time_rate: 100 }),
      makeItem({ on_time_rate: 80 }),
    ];
    statuses.forEach(item => {
      const result = getComplianceStatus(item);
      expect(typeof result.color).toBe('string');
      expect(result.icon).toBeTruthy();
    });
  });
});

// ─── computeComplianceKPIs ───────────────────────────────────────────────────

describe('computeComplianceKPIs', () => {
  it('returns zeros and empty arrays for empty input', () => {
    const result = computeComplianceKPIs([]);
    expect(result.infractors).toEqual([]);
    expect(result.compliant).toEqual([]);
    expect(result.totalPenaltyValue).toBe(0);
    expect(result.avgOnTimeRate).toBe(0);
  });

  it('counts infractors: items with penalty_count > 0', () => {
    const data = [
      makeItem({ penalty_count: 1 }),
      makeItem({ penalty_count: 0 }),
      makeItem({ penalty_count: 2 }),
    ];
    const { infractors } = computeComplianceKPIs(data);
    expect(infractors).toHaveLength(2);
  });

  it('counts infractors: items with late_deliveries > 0', () => {
    const data = [
      makeItem({ late_deliveries: 3 }),
      makeItem({ late_deliveries: 0 }),
    ];
    const { infractors } = computeComplianceKPIs(data);
    expect(infractors).toHaveLength(1);
  });

  it('counts infractors: items with rejected_count > 0', () => {
    const data = [
      makeItem({ rejected_count: 1 }),
      makeItem({ rejected_count: 0 }),
    ];
    const { infractors } = computeComplianceKPIs(data);
    expect(infractors).toHaveLength(1);
  });

  it('counts compliant: on_time_rate >= 95 and no penalties', () => {
    const data = [
      makeItem({ on_time_rate: 98, penalty_count: 0 }),
      makeItem({ on_time_rate: 80, penalty_count: 0 }),
      makeItem({ on_time_rate: 100, penalty_count: 1 }),
    ];
    const { compliant } = computeComplianceKPIs(data);
    expect(compliant).toHaveLength(1);
  });

  it('sums totalPenaltyValue', () => {
    const data = [
      makeItem({ total_penalty_value: 500 }),
      makeItem({ total_penalty_value: 300 }),
    ];
    const { totalPenaltyValue } = computeComplianceKPIs(data);
    expect(totalPenaltyValue).toBe(800);
  });

  it('computes avgOnTimeRate correctly', () => {
    const data = [
      makeItem({ on_time_rate: 80 }),
      makeItem({ on_time_rate: 100 }),
    ];
    const { avgOnTimeRate } = computeComplianceKPIs(data);
    expect(avgOnTimeRate).toBe(90);
  });

  it('handles single item avgOnTimeRate', () => {
    const { avgOnTimeRate } = computeComplianceKPIs([makeItem({ on_time_rate: 75 })]);
    expect(avgOnTimeRate).toBe(75);
  });
});

// ─── sortComplianceData ───────────────────────────────────────────────────────

describe('sortComplianceData', () => {
  const data = [
    makeItem({ fornecedor_id: 'a', penalty_count: 1, late_deliveries: 3, avg_quality_score: 8, on_time_rate: 80 }),
    makeItem({ fornecedor_id: 'b', penalty_count: 3, late_deliveries: 1, avg_quality_score: 5, on_time_rate: 95 }),
    makeItem({ fornecedor_id: 'c', penalty_count: 0, late_deliveries: 0, avg_quality_score: 9, on_time_rate: 100 }),
  ];

  it('sorts by penalties descending', () => {
    const sorted = sortComplianceData(data, 'penalties');
    expect(sorted[0].penalty_count).toBe(3);
    expect(sorted[2].penalty_count).toBe(0);
  });

  it('sorts by late deliveries descending', () => {
    const sorted = sortComplianceData(data, 'late');
    expect(sorted[0].late_deliveries).toBe(3);
    expect(sorted[2].late_deliveries).toBe(0);
  });

  it('sorts by quality ascending (lowest quality first)', () => {
    const sorted = sortComplianceData(data, 'quality');
    expect(sorted[0].avg_quality_score).toBe(5);
    expect(sorted[2].avg_quality_score).toBe(9);
  });

  it('sorts by on_time_rate ascending (worst first)', () => {
    const sorted = sortComplianceData(data, 'ontime');
    expect(sorted[0].on_time_rate).toBe(80);
    expect(sorted[2].on_time_rate).toBe(100);
  });

  it('returns original order for unknown sort key', () => {
    const sorted = sortComplianceData(data, 'unknown');
    expect(sorted.map(d => d.fornecedor_id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the original array', () => {
    const original = [...data];
    sortComplianceData(data, 'penalties');
    expect(data[0].fornecedor_id).toBe(original[0].fornecedor_id);
  });

  it('returns a new array', () => {
    const sorted = sortComplianceData(data, 'penalties');
    expect(sorted).not.toBe(data);
  });
});
