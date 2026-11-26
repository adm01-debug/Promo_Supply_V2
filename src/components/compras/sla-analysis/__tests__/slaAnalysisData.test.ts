import { describe, it, expect } from 'vitest';
import {
  SUPPLIER_COLORS,
  SUPPLIER_PALETTE,
  averageCompliance,
  buildSupplierSLAData,
  getSLAColor,
  getSLABgColor,
  type SlaOrderInput,
  type SlaSupplierInput,
} from '../slaAnalysisData';

// ─── SUPPLIER_COLORS ─────────────────────────────────────────────────────────

describe('SUPPLIER_COLORS', () => {
  it('has 6 supplier entries', () => {
    expect(Object.keys(SUPPLIER_COLORS)).toHaveLength(6);
  });

  it('all values are non-empty strings', () => {
    Object.values(SUPPLIER_COLORS).forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });
});

describe('SUPPLIER_PALETTE', () => {
  it('has at least 6 colors to cycle through dynamic suppliers', () => {
    expect(SUPPLIER_PALETTE.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── getSLAColor ─────────────────────────────────────────────────────────────

describe('getSLAColor', () => {
  it('returns text-success for value >= 95', () => {
    expect(getSLAColor(95)).toBe('text-success');
  });

  it('returns text-info for value >= 85', () => {
    expect(getSLAColor(88)).toBe('text-info');
  });

  it('returns text-warning for value >= 75', () => {
    expect(getSLAColor(80)).toBe('text-warning');
  });

  it('returns text-destructive for value < 75', () => {
    expect(getSLAColor(60)).toBe('text-destructive');
  });
});

describe('getSLABgColor', () => {
  it('returns a string', () => {
    expect(typeof getSLABgColor(50)).toBe('string');
  });
});

// ─── buildSupplierSLAData ────────────────────────────────────────────────────

const suppliers: SlaSupplierInput[] = [
  { id: 's1', name: 'Fornecedor Pontual', prazo_medio_entrega: 10, avaliacao: 4.5 },
  { id: 's2', name: 'Fornecedor Atrasado', prazo_medio_entrega: 20, avaliacao: '3.00' },
  { id: 's3', name: 'Fornecedor Sem Pedido', prazo_medio_entrega: null, avaliacao: null },
];

const today = new Date('2026-11-22T12:00:00Z');
const daysAgo = (n: number) => {
  const d = new Date(today.getTime() - n * 86400000);
  return d.toISOString().slice(0, 10);
};

const orders: SlaOrderInput[] = [
  // s1: 3 entregas, todas no prazo
  { fornecedor_id: 's1', status: 'entregue', data_emissao: daysAgo(60), data_previsao: daysAgo(50), data_entrega: daysAgo(52) },
  { fornecedor_id: 's1', status: 'entregue', data_emissao: daysAgo(40), data_previsao: daysAgo(30), data_entrega: daysAgo(30) },
  { fornecedor_id: 's1', status: 'entregue', data_emissao: daysAgo(20), data_previsao: daysAgo(10), data_entrega: daysAgo(12) },
  // s2: 2 entregas, 1 atrasada + 1 pedido em aberto vencido
  { fornecedor_id: 's2', status: 'entregue', data_emissao: daysAgo(55), data_previsao: daysAgo(45), data_entrega: daysAgo(40) },
  { fornecedor_id: 's2', status: 'entregue', data_emissao: daysAgo(35), data_previsao: daysAgo(25), data_entrega: daysAgo(30) },
  { fornecedor_id: 's2', status: 'pendente', data_emissao: daysAgo(15), data_previsao: daysAgo(5), data_entrega: null },
];

describe('buildSupplierSLAData', () => {
  const rows = buildSupplierSLAData(suppliers, orders, 180, today);

  it('returns one row per supplier and never invents extra suppliers', () => {
    expect(rows.map(r => r.name)).toEqual([
      'Fornecedor Pontual',
      'Fornecedor Atrasado',
      'Fornecedor Sem Pedido',
    ]);
  });

  it('computes compliance from real delivery dates', () => {
    const pontual = rows[0];
    expect(pontual.slaCompliance).toBe(100);
    expect(pontual.lateOrders).toBe(0);
    expect(pontual.totalOrders).toBe(3);

    const atrasado = rows[1];
    expect(atrasado.totalOrders).toBe(3);
    expect(atrasado.lateOrders).toBe(1);
    expect(atrasado.slaCompliance).toBe(50);
  });

  it('counts open orders past the promised date as critical', () => {
    expect(rows[0].criticalOrders).toBe(0);
    expect(rows[1].criticalOrders).toBe(1);
    expect(rows[2].criticalOrders).toBe(0);
  });

  it('keeps null instead of fabricating metrics when there is no sample', () => {
    const semPedido = rows[2];
    expect(semPedido.totalOrders).toBe(0);
    expect(semPedido.slaCompliance).toBeNull();
    expect(semPedido.onTimeDelivery).toBeNull();
    expect(semPedido.qualityScore).toBeNull();
    expect(semPedido.avgLeadTime).toBeNull();
    expect(semPedido.trend).toBe('stable');
    expect(semPedido.trendValue).toBeNull();
  });

  it('derives lead time from emission to delivery and averages it', () => {
    // s1: 8, 10, 8 dias => 8.7
    expect(rows[0].avgLeadTime).toBeCloseTo(8.7, 1);
    // s2: 15, 5 dias => 10
    expect(rows[1].avgLeadTime).toBeCloseTo(10, 1);
  });

  it('falls back to the registered average lead time when nothing was delivered', () => {
    const [row] = buildSupplierSLAData([{ id: 'x', name: 'X', prazo_medio_entrega: 12 }], [], 180, today);
    expect(row.avgLeadTime).toBe(12);
    expect(row.slaCompliance).toBeNull();
  });

  it('converts the supplier rating to a 0-100 quality score', () => {
    expect(rows[0].qualityScore).toBe(90);
    expect(rows[1].qualityScore).toBe(60);
  });

  it('produces 6 monthly points ending on the current month', () => {
    expect(rows[0].monthlyTrend).toHaveLength(6);
    expect(rows[0].monthlyTrend[5].month).toBe('Nov');
  });

  it('respects the requested period window', () => {
    const shortWindow = buildSupplierSLAData(suppliers, orders, 30, today);
    const pontual = shortWindow[0];
    // apenas o pedido emitido 20 dias atrás entra na janela de 30 dias
    expect(pontual.totalOrders).toBe(1);
  });

  it('is deterministic across calls (no random values)', () => {
    const a = buildSupplierSLAData(suppliers, orders, 180, today);
    const b = buildSupplierSLAData(suppliers, orders, 180, today);
    expect(a).toEqual(b);
  });
});

describe('averageCompliance', () => {
  it('ignores suppliers without sample', () => {
    const rows = buildSupplierSLAData(suppliers, orders, 180, today);
    // (100 + 50) / 2 — o fornecedor sem pedido não entra na média
    expect(averageCompliance(rows)).toBe(75);
  });

  it('returns null when no supplier has sample', () => {
    const rows = buildSupplierSLAData([{ id: 'x', name: 'X' }], [], 180, today);
    expect(averageCompliance(rows)).toBeNull();
  });
});
