import { describe, it, expect } from 'vitest';
import {
  calculateChange,
  formatNumber,
  currentPeriodMetrics,
  previousPeriodMetrics,
  executiveMetrics,
  monthlyTrend,
  comparisonTrend,
  trendDataSets,
  categorySpend,
  topSuppliers,
  buyerPerformance,
  pendingItems,
  allCategories,
  allSuppliers,
  COLORS,
} from '../executiveDashboardData';

// ─── calculateChange ──────────────────────────────────────────────────────────

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

  it('50% increase', () => {
    expect(calculateChange(150, 100)).toBeCloseTo(50);
  });

  it('100% increase (double)', () => {
    expect(calculateChange(200, 100)).toBeCloseTo(100);
  });
});

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats integer with pt-BR locale', () => {
    const result = formatNumber(1000);
    expect(result).toContain('1');
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

// ─── currentPeriodMetrics ─────────────────────────────────────────────────────

describe('currentPeriodMetrics', () => {
  it('has totalSpend with value and target', () => {
    expect(typeof currentPeriodMetrics.totalSpend.value).toBe('number');
    expect(typeof currentPeriodMetrics.totalSpend.target).toBe('number');
  });

  it('has savings exceeding target', () => {
    expect(currentPeriodMetrics.savings.value).toBeGreaterThan(currentPeriodMetrics.savings.target);
  });

  it('has ordersThisMonth above target', () => {
    expect(currentPeriodMetrics.ordersThisMonth.value).toBeGreaterThan(currentPeriodMetrics.ordersThisMonth.target);
  });

  it('avgCycleTime is below target (good performance)', () => {
    expect(currentPeriodMetrics.avgCycleTime.value).toBeLessThan(currentPeriodMetrics.avgCycleTime.target);
  });

  it('has pendingApprovals with urgent count', () => {
    expect(typeof currentPeriodMetrics.pendingApprovals.value).toBe('number');
    expect(typeof currentPeriodMetrics.pendingApprovals.urgent).toBe('number');
  });

  it('contractCompliance is above target', () => {
    expect(currentPeriodMetrics.contractCompliance.value).toBeGreaterThan(currentPeriodMetrics.contractCompliance.target);
  });
});

// ─── executiveMetrics ─────────────────────────────────────────────────────────

describe('executiveMetrics', () => {
  it('totalSpend change is positive (spend increased)', () => {
    expect(executiveMetrics.totalSpend.change).toBeGreaterThan(0);
  });

  it('savings change is positive (savings improved)', () => {
    expect(executiveMetrics.savings.change).toBeGreaterThan(0);
  });

  it('avgCycleTime change is negative (improved - fewer days)', () => {
    expect(executiveMetrics.avgCycleTime.change).toBeLessThan(0);
  });

  it('overdueOrders change is negative (improved - fewer overdue)', () => {
    expect(executiveMetrics.overdueOrders.change).toBeLessThan(0);
  });

  it('has maverickSpend with value and percentage', () => {
    expect(typeof executiveMetrics.maverickSpend.value).toBe('number');
    expect(typeof executiveMetrics.maverickSpend.percentage).toBe('number');
  });

  it('has savingsPercent', () => {
    expect(typeof executiveMetrics.savingsPercent).toBe('number');
  });

  it('change is calculated correctly for savings', () => {
    const expected = calculateChange(
      currentPeriodMetrics.savings.value,
      previousPeriodMetrics.savings.value
    );
    expect(executiveMetrics.savings.change).toBeCloseTo(expected);
  });
});

// ─── monthlyTrend ─────────────────────────────────────────────────────────────

describe('monthlyTrend', () => {
  it('has 6 months of data', () => {
    expect(monthlyTrend).toHaveLength(6);
  });

  it('months are Jul through Dez', () => {
    const months = monthlyTrend.map(m => m.month);
    expect(months).toEqual(['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
  });

  it('each entry has spend, savings, orders', () => {
    monthlyTrend.forEach(m => {
      expect(typeof m.spend).toBe('number');
      expect(typeof m.savings).toBe('number');
      expect(typeof m.orders).toBe('number');
    });
  });

  it('savings is always less than spend', () => {
    monthlyTrend.forEach(m => {
      expect(m.savings).toBeLessThan(m.spend);
    });
  });
});

// ─── comparisonTrend ──────────────────────────────────────────────────────────

describe('comparisonTrend', () => {
  it('has 6 entries', () => {
    expect(comparisonTrend).toHaveLength(6);
  });

  it('each entry has current and previous spend', () => {
    comparisonTrend.forEach(c => {
      expect(typeof c.currentSpend).toBe('number');
      expect(typeof c.previousSpend).toBe('number');
    });
  });

  it('months match monthlyTrend months', () => {
    const current = comparisonTrend.map(c => c.month);
    const trend = monthlyTrend.map(m => m.month);
    expect(current).toEqual(trend);
  });

  it('currentSpend matches monthlyTrend spend', () => {
    comparisonTrend.forEach((c, i) => {
      expect(c.currentSpend).toBe(monthlyTrend[i].spend);
    });
  });
});

// ─── trendDataSets ────────────────────────────────────────────────────────────

describe('trendDataSets', () => {
  it('spend array has 6 entries', () => {
    expect(trendDataSets.spend).toHaveLength(6);
  });

  it('savings array has 6 entries', () => {
    expect(trendDataSets.savings).toHaveLength(6);
  });

  it('cycleTime values are all positive', () => {
    trendDataSets.cycleTime.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it('compliance array has 6 entries', () => {
    expect(trendDataSets.compliance).toHaveLength(6);
  });

  it('overdueOrders trend is generally decreasing', () => {
    const arr = trendDataSets.overdueOrders;
    expect(arr[0]).toBeGreaterThan(arr[arr.length - 1]);
  });
});

// ─── categorySpend ────────────────────────────────────────────────────────────

describe('categorySpend', () => {
  it('has 7 categories', () => {
    expect(categorySpend).toHaveLength(7);
  });

  it('each category has name, value, previousValue, percentage, orders, supplier, risk', () => {
    categorySpend.forEach(c => {
      expect(typeof c.name).toBe('string');
      expect(typeof c.value).toBe('number');
      expect(typeof c.previousValue).toBe('number');
      expect(typeof c.percentage).toBe('number');
      expect(typeof c.orders).toBe('number');
      expect(typeof c.supplier).toBe('string');
      expect(typeof c.risk).toBe('string');
    });
  });

  it('risk levels are valid', () => {
    const validRisks = ['low', 'medium', 'high', 'critical'];
    categorySpend.forEach(c => {
      expect(validRisks).toContain(c.risk);
    });
  });

  it('all values are greater than previous values (spend increasing)', () => {
    categorySpend.forEach(c => {
      expect(c.value).toBeGreaterThan(c.previousValue);
    });
  });
});

// ─── topSuppliers ─────────────────────────────────────────────────────────────

describe('topSuppliers', () => {
  it('has 5 suppliers', () => {
    expect(topSuppliers).toHaveLength(5);
  });

  it('first supplier is XBZ Brindes', () => {
    expect(topSuppliers[0].name).toBe('XBZ Brindes');
  });

  it('each supplier has compliance percentage', () => {
    topSuppliers.forEach(s => {
      expect(typeof s.compliance).toBe('number');
      expect(s.compliance).toBeGreaterThan(0);
      expect(s.compliance).toBeLessThanOrEqual(100);
    });
  });

  it('each supplier has categories array', () => {
    topSuppliers.forEach(s => {
      expect(Array.isArray(s.categories)).toBe(true);
      expect(s.categories.length).toBeGreaterThan(0);
    });
  });
});

// ─── buyerPerformance ─────────────────────────────────────────────────────────

describe('buyerPerformance', () => {
  it('has 4 buyers', () => {
    expect(buyerPerformance).toHaveLength(4);
  });

  it('each buyer has name, orders, savings, avgCycle, compliance', () => {
    buyerPerformance.forEach(b => {
      expect(typeof b.name).toBe('string');
      expect(typeof b.orders).toBe('number');
      expect(typeof b.savings).toBe('number');
      expect(typeof b.avgCycle).toBe('number');
      expect(typeof b.compliance).toBe('number');
    });
  });

  it('Ana Silva has highest compliance', () => {
    const ana = buyerPerformance.find(b => b.name === 'Ana Silva');
    const maxCompliance = Math.max(...buyerPerformance.map(b => b.compliance));
    expect(ana?.compliance).toBe(maxCompliance);
  });
});

// ─── pendingItems ─────────────────────────────────────────────────────────────

describe('pendingItems', () => {
  it('has 5 pending items', () => {
    expect(pendingItems).toHaveLength(5);
  });

  it('each item has id, type, item, value, days, priority, category, supplier', () => {
    pendingItems.forEach(p => {
      expect(typeof p.id).toBe('string');
      expect(typeof p.type).toBe('string');
      expect(typeof p.item).toBe('string');
      expect(typeof p.value).toBe('number');
      expect(typeof p.days).toBe('number');
      expect(typeof p.priority).toBe('string');
    });
  });

  it('priority levels are valid', () => {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    pendingItems.forEach(p => {
      expect(validPriorities).toContain(p.priority);
    });
  });

  it('has at least one critical item', () => {
    expect(pendingItems.some(p => p.priority === 'critical')).toBe(true);
  });
});

// ─── allCategories & allSuppliers ─────────────────────────────────────────────

describe('allCategories', () => {
  it('is sorted alphabetically', () => {
    const sorted = [...allCategories].sort();
    expect(allCategories).toEqual(sorted);
  });

  it('has unique values', () => {
    expect(new Set(allCategories).size).toBe(allCategories.length);
  });

  it('has at least one category', () => {
    expect(allCategories.length).toBeGreaterThan(0);
  });
});

describe('allSuppliers', () => {
  it('is sorted alphabetically', () => {
    const sorted = [...allSuppliers].sort();
    expect(allSuppliers).toEqual(sorted);
  });

  it('has unique values', () => {
    expect(new Set(allSuppliers).size).toBe(allSuppliers.length);
  });

  it('includes XBZ Brindes', () => {
    expect(allSuppliers).toContain('XBZ Brindes');
  });
});

// ─── COLORS ───────────────────────────────────────────────────────────────────

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
