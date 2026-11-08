import { describe, it, expect } from 'vitest';
import {
  SUPPLIER_COLORS,
  generateSupplierSLAData,
  getSLAColor,
  getSLABgColor,
} from '../slaAnalysisData';

// ─── SUPPLIER_COLORS ──────────────────────────────────────────────────────────

describe('SUPPLIER_COLORS', () => {
  it('has 6 supplier entries', () => {
    expect(Object.keys(SUPPLIER_COLORS)).toHaveLength(6);
  });

  it('includes XBZ Brindes', () => {
    expect(SUPPLIER_COLORS).toHaveProperty('XBZ Brindes');
  });

  it('includes Stricker / Spot Gifts', () => {
    expect(SUPPLIER_COLORS).toHaveProperty('Stricker / Spot Gifts');
  });

  it('all values are non-empty strings', () => {
    Object.values(SUPPLIER_COLORS).forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('XBZ Brindes uses primary CSS variable', () => {
    expect(SUPPLIER_COLORS['XBZ Brindes']).toContain('primary');
  });
});

// ─── getSLAColor ──────────────────────────────────────────────────────────────

describe('getSLAColor', () => {
  it('returns text-success for value >= 95', () => {
    expect(getSLAColor(95)).toBe('text-success');
    expect(getSLAColor(100)).toBe('text-success');
  });

  it('returns text-info for value >= 85 and < 95', () => {
    expect(getSLAColor(85)).toBe('text-info');
    expect(getSLAColor(90)).toBe('text-info');
    expect(getSLAColor(94.9)).toBe('text-info');
  });

  it('returns text-warning for value >= 75 and < 85', () => {
    expect(getSLAColor(75)).toBe('text-warning');
    expect(getSLAColor(80)).toBe('text-warning');
    expect(getSLAColor(84.9)).toBe('text-warning');
  });

  it('returns text-destructive for value < 75', () => {
    expect(getSLAColor(74.9)).toBe('text-destructive');
    expect(getSLAColor(50)).toBe('text-destructive');
    expect(getSLAColor(0)).toBe('text-destructive');
  });

  it('boundary at exactly 95', () => {
    expect(getSLAColor(95)).toBe('text-success');
    expect(getSLAColor(94)).toBe('text-info');
  });

  it('boundary at exactly 85', () => {
    expect(getSLAColor(85)).toBe('text-info');
    expect(getSLAColor(84)).toBe('text-warning');
  });

  it('boundary at exactly 75', () => {
    expect(getSLAColor(75)).toBe('text-warning');
    expect(getSLAColor(74)).toBe('text-destructive');
  });

  it('returns a string', () => {
    expect(typeof getSLAColor(80)).toBe('string');
  });
});

// ─── getSLABgColor ────────────────────────────────────────────────────────────

describe('getSLABgColor', () => {
  it('returns bg-success for value >= 95', () => {
    expect(getSLABgColor(95)).toBe('bg-success');
    expect(getSLABgColor(100)).toBe('bg-success');
  });

  it('returns bg-info for value >= 85 and < 95', () => {
    expect(getSLABgColor(85)).toBe('bg-info');
    expect(getSLABgColor(90)).toBe('bg-info');
  });

  it('returns bg-warning for value >= 75 and < 85', () => {
    expect(getSLABgColor(75)).toBe('bg-warning');
    expect(getSLABgColor(80)).toBe('bg-warning');
  });

  it('returns bg-destructive for value < 75', () => {
    expect(getSLABgColor(74)).toBe('bg-destructive');
    expect(getSLABgColor(0)).toBe('bg-destructive');
  });

  it('mirrors getSLAColor thresholds (text- vs bg-)', () => {
    const textResult = getSLAColor(90).replace('text-', '');
    const bgResult = getSLABgColor(90).replace('bg-', '');
    expect(textResult).toBe(bgResult);
  });

  it('returns a string', () => {
    expect(typeof getSLABgColor(50)).toBe('string');
  });
});

// ─── generateSupplierSLAData ─────────────────────────────────────────────────

describe('generateSupplierSLAData', () => {
  it('returns an array of 6 suppliers', () => {
    const data = generateSupplierSLAData();
    expect(data).toHaveLength(6);
  });

  it('each supplier has a name string', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => expect(typeof s.name).toBe('string'));
  });

  it('includes XBZ Brindes', () => {
    const data = generateSupplierSLAData();
    expect(data.some(s => s.name === 'XBZ Brindes')).toBe(true);
  });

  it('slaCompliance is between 80 and 100', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.slaCompliance).toBeGreaterThanOrEqual(80);
      expect(s.slaCompliance).toBeLessThanOrEqual(100);
    });
  });

  it('onTimeDelivery is between 85 and 100', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.onTimeDelivery).toBeGreaterThanOrEqual(85);
      expect(s.onTimeDelivery).toBeLessThanOrEqual(100);
    });
  });

  it('totalOrders is between 20 and 60', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.totalOrders).toBeGreaterThanOrEqual(20);
      expect(s.totalOrders).toBeLessThanOrEqual(60);
    });
  });

  it('trend is either up or down', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(['up', 'down']).toContain(s.trend);
    });
  });

  it('each supplier has 6 monthlyTrend entries', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.monthlyTrend).toHaveLength(6);
    });
  });

  it('monthlyTrend months are Jul through Dez', () => {
    const data = generateSupplierSLAData();
    const months = data[0].monthlyTrend.map(t => t.month);
    expect(months).toEqual(['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
  });

  it('each supplier has 6 radarData entries', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.radarData).toHaveLength(6);
    });
  });

  it('radarData includes Pontualidade metric', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      const metrics = s.radarData.map(r => r.metric);
      expect(metrics).toContain('Pontualidade');
    });
  });

  it('qualityScore is between 85 and 100', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.qualityScore).toBeGreaterThanOrEqual(85);
      expect(s.qualityScore).toBeLessThanOrEqual(100);
    });
  });

  it('lateOrders is non-negative integer', () => {
    const data = generateSupplierSLAData();
    data.forEach(s => {
      expect(s.lateOrders).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.lateOrders)).toBe(true);
    });
  });
});
