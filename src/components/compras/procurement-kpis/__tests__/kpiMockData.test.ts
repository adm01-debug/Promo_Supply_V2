import { describe, it, expect } from 'vitest';
import { kpiData, KPI_COLORS } from '../kpiMockData';

// ─── KPI_COLORS ───────────────────────────────────────────────────────────────

describe('KPI_COLORS', () => {
  it('has 5 color entries', () => {
    expect(KPI_COLORS).toHaveLength(5);
  });

  it('all entries are non-empty strings', () => {
    KPI_COLORS.forEach(c => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    });
  });

  it('first color uses primary CSS variable', () => {
    expect(KPI_COLORS[0]).toContain('primary');
  });

  it('all colors use hsl format', () => {
    KPI_COLORS.forEach(c => {
      expect(c).toContain('hsl');
    });
  });
});

// ─── kpiData.procurementROI ───────────────────────────────────────────────────

describe('kpiData.procurementROI', () => {
  it('has current, previous, target, savings, investment', () => {
    expect(typeof kpiData.procurementROI.current).toBe('number');
    expect(typeof kpiData.procurementROI.previous).toBe('number');
    expect(typeof kpiData.procurementROI.target).toBe('number');
    expect(typeof kpiData.procurementROI.savings).toBe('number');
    expect(typeof kpiData.procurementROI.investment).toBe('number');
  });

  it('current ROI is positive', () => {
    expect(kpiData.procurementROI.current).toBeGreaterThan(0);
  });

  it('current is higher than previous', () => {
    expect(kpiData.procurementROI.current).toBeGreaterThan(kpiData.procurementROI.previous);
  });
});

// ─── kpiData.maverickSpend ────────────────────────────────────────────────────

describe('kpiData.maverickSpend', () => {
  it('has total, maverick, percentage, target, byCategory', () => {
    expect(typeof kpiData.maverickSpend.total).toBe('number');
    expect(typeof kpiData.maverickSpend.maverick).toBe('number');
    expect(typeof kpiData.maverickSpend.percentage).toBe('number');
    expect(typeof kpiData.maverickSpend.target).toBe('number');
  });

  it('maverick spend is less than total', () => {
    expect(kpiData.maverickSpend.maverick).toBeLessThan(kpiData.maverickSpend.total);
  });

  it('percentage is above target (indicating room for improvement)', () => {
    expect(kpiData.maverickSpend.percentage).toBeGreaterThan(kpiData.maverickSpend.target);
  });

  it('byCategory has 4 entries', () => {
    expect(kpiData.maverickSpend.byCategory).toHaveLength(4);
  });

  it('each byCategory entry has name, value, percentage', () => {
    kpiData.maverickSpend.byCategory.forEach(cat => {
      expect(typeof cat.name).toBe('string');
      expect(typeof cat.value).toBe('number');
      expect(typeof cat.percentage).toBe('number');
    });
  });

  it('byCategory percentages sum to 100', () => {
    const total = kpiData.maverickSpend.byCategory.reduce((sum, c) => sum + c.percentage, 0);
    expect(total).toBe(100);
  });
});

// ─── kpiData.contractCompliance ───────────────────────────────────────────────

describe('kpiData.contractCompliance', () => {
  it('has percentage, target, contracts, compliant, expiring, expired', () => {
    const cc = kpiData.contractCompliance;
    expect(typeof cc.percentage).toBe('number');
    expect(typeof cc.target).toBe('number');
    expect(typeof cc.contracts).toBe('number');
    expect(typeof cc.compliant).toBe('number');
    expect(typeof cc.expiring).toBe('number');
    expect(typeof cc.expired).toBe('number');
  });

  it('compliant <= contracts', () => {
    expect(kpiData.contractCompliance.compliant).toBeLessThanOrEqual(kpiData.contractCompliance.contracts);
  });

  it('percentage is below target (gap indicates improvement needed)', () => {
    expect(kpiData.contractCompliance.percentage).toBeLessThan(kpiData.contractCompliance.target);
  });
});

// ─── kpiData.costAvoidance ────────────────────────────────────────────────────

describe('kpiData.costAvoidance', () => {
  it('has total, negotiated, competitive, standardization', () => {
    const ca = kpiData.costAvoidance;
    expect(typeof ca.total).toBe('number');
    expect(typeof ca.negotiated).toBe('number');
    expect(typeof ca.competitive).toBe('number');
    expect(typeof ca.standardization).toBe('number');
  });

  it('negotiated + competitive + standardization equals total', () => {
    const ca = kpiData.costAvoidance;
    expect(ca.negotiated + ca.competitive + ca.standardization).toBe(ca.total);
  });
});

// ─── kpiData.poCycleTime ──────────────────────────────────────────────────────

describe('kpiData.poCycleTime', () => {
  it('has current, target, and trend array', () => {
    expect(typeof kpiData.poCycleTime.current).toBe('number');
    expect(typeof kpiData.poCycleTime.target).toBe('number');
    expect(Array.isArray(kpiData.poCycleTime.trend)).toBe(true);
  });

  it('current is above target (improvement opportunity)', () => {
    expect(kpiData.poCycleTime.current).toBeGreaterThan(kpiData.poCycleTime.target);
  });

  it('trend has 6 entries', () => {
    expect(kpiData.poCycleTime.trend).toHaveLength(6);
  });

  it('trend entries have month and days', () => {
    kpiData.poCycleTime.trend.forEach(t => {
      expect(typeof t.month).toBe('string');
      expect(typeof t.days).toBe('number');
    });
  });

  it('trend is decreasing over time (improving)', () => {
    const days = kpiData.poCycleTime.trend.map(t => t.days);
    expect(days[0]).toBeGreaterThan(days[days.length - 1]);
  });
});

// ─── kpiData.supplierConcentration ───────────────────────────────────────────

describe('kpiData.supplierConcentration', () => {
  it('has top5Percentage, herfindahlIndex, risk, suppliers', () => {
    const sc = kpiData.supplierConcentration;
    expect(typeof sc.top5Percentage).toBe('number');
    expect(typeof sc.herfindahlIndex).toBe('number');
    expect(typeof sc.risk).toBe('string');
    expect(Array.isArray(sc.suppliers)).toBe(true);
  });

  it('risk level is medium', () => {
    expect(kpiData.supplierConcentration.risk).toBe('medium');
  });

  it('has 5 suppliers', () => {
    expect(kpiData.supplierConcentration.suppliers).toHaveLength(5);
  });

  it('each supplier has name and percentage', () => {
    kpiData.supplierConcentration.suppliers.forEach(s => {
      expect(typeof s.name).toBe('string');
      expect(typeof s.percentage).toBe('number');
    });
  });
});

// ─── kpiData.savingsRealization ───────────────────────────────────────────────

describe('kpiData.savingsRealization', () => {
  it('has projected, realized, percentage, byQuarter', () => {
    const sr = kpiData.savingsRealization;
    expect(typeof sr.projected).toBe('number');
    expect(typeof sr.realized).toBe('number');
    expect(typeof sr.percentage).toBe('number');
    expect(Array.isArray(sr.byQuarter)).toBe(true);
  });

  it('realized is less than projected', () => {
    expect(kpiData.savingsRealization.realized).toBeLessThan(kpiData.savingsRealization.projected);
  });

  it('byQuarter has 4 entries (Q1-Q4)', () => {
    expect(kpiData.savingsRealization.byQuarter).toHaveLength(4);
  });

  it('byQuarter quarters are Q1 through Q4', () => {
    const quarters = kpiData.savingsRealization.byQuarter.map(q => q.quarter);
    expect(quarters).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('each byQuarter entry has projected and realized', () => {
    kpiData.savingsRealization.byQuarter.forEach(q => {
      expect(typeof q.projected).toBe('number');
      expect(typeof q.realized).toBe('number');
    });
  });
});

// ─── kpiData.firstTimeMatchRate ───────────────────────────────────────────────

describe('kpiData.firstTimeMatchRate', () => {
  it('has current, target, invoices, matched, exceptions', () => {
    const ftm = kpiData.firstTimeMatchRate;
    expect(typeof ftm.current).toBe('number');
    expect(typeof ftm.target).toBe('number');
    expect(typeof ftm.invoices).toBe('number');
    expect(typeof ftm.matched).toBe('number');
    expect(typeof ftm.exceptions).toBe('number');
  });

  it('matched + exceptions equals invoices', () => {
    const ftm = kpiData.firstTimeMatchRate;
    expect(ftm.matched + ftm.exceptions).toBe(ftm.invoices);
  });

  it('current rate is below target', () => {
    expect(kpiData.firstTimeMatchRate.current).toBeLessThan(kpiData.firstTimeMatchRate.target);
  });
});
