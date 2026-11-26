import { describe, it, expect } from 'vitest';
import {
  deriveKpiSnapshot,
  deriveHerfindahl,
  deriveConcentrationRisk,
  KPI_TARGETS,
  type KpiSnapshotInput,
} from '../deriveKpiSnapshot';

const base: KpiSnapshotInput = {
  totalSpend: 0,
  maverickSpend: 0,
  maverickPercentage: 0,
  contractCompliancePct: 0,
  activeContractCount: 0,
  totalContractCount: 0,
  expiringContractCount: 0,
  expiredContractCount: 0,
  avgCycleDays: 0,
  savings: 0,
  savingsPercent: 0,
  top5Concentration: 0,
};

describe('deriveKpiSnapshot - sem dados', () => {
  it('nao inventa valores quando o banco esta vazio', () => {
    const snap = deriveKpiSnapshot(base);
    expect(snap.procurementROI.current).toBe(0);
    expect(snap.procurementROI.savings).toBe(0);
    expect(snap.procurementROI.investment).toBe(0);
    expect(snap.maverickSpend.total).toBe(0);
    expect(snap.maverickSpend.byCategory).toEqual([]);
    expect(snap.contractCompliance.contracts).toBe(0);
    expect(snap.costAvoidance.total).toBe(0);
    expect(snap.poCycleTime.trend).toEqual([]);
    expect(snap.supplierConcentration.suppliers).toEqual([]);
    expect(snap.firstTimeMatchRate.current).toBe(0);
    expect(snap.firstTimeMatchRate.invoices).toBe(0);
    expect(snap.savingsRealization.realized).toBe(0);
  });

  it('usa as metas do modulo, nao numeros fixos de tela', () => {
    const snap = deriveKpiSnapshot(base);
    expect(snap.procurementROI.target).toBe(KPI_TARGETS.procurementROI);
    expect(snap.maverickSpend.target).toBe(KPI_TARGETS.maverickSpend);
    expect(snap.contractCompliance.target).toBe(KPI_TARGETS.contractCompliance);
    expect(snap.poCycleTime.target).toBe(KPI_TARGETS.poCycleTime);
    expect(snap.firstTimeMatchRate.target).toBe(KPI_TARGETS.firstTimeMatchRate);
  });
});

describe('deriveKpiSnapshot - ROI', () => {
  it('divide economia pelo spend fora de contrato', () => {
    const snap = deriveKpiSnapshot({ ...base, savings: 50_000, maverickSpend: 10_000, totalSpend: 100_000 });
    expect(snap.procurementROI.current).toBe(5);
    expect(snap.procurementROI.investment).toBe(10_000);
  });

  it('zera o ROI quando nao ha maverick spend (evita divisao por zero)', () => {
    const snap = deriveKpiSnapshot({ ...base, savings: 50_000, maverickSpend: 0 });
    expect(snap.procurementROI.current).toBe(0);
  });
});

describe('deriveKpiSnapshot - maverick', () => {
  it('ordena categorias por valor, limita a 6 e calcula porcentagem sobre o total fora de contrato', () => {
    const snap = deriveKpiSnapshot({
      ...base,
      totalSpend: 1_000,
      maverickSpend: 700,
      maverickPercentage: 70,
      offContractByCategory: [
        { name: 'A', value: 100 },
        { name: 'B', value: 400 },
        { name: 'C', value: 0 },
        { name: 'D', value: 200 },
      ],
    });
    expect(snap.maverickSpend.byCategory.map((c) => c.name)).toEqual(['B', 'D', 'A']);
    expect(snap.maverickSpend.byCategory[0].percentage).toBe(57.1);
    expect(snap.maverickSpend.percentage).toBe(70);
  });

  it('descarta categorias com valor zero', () => {
    const snap = deriveKpiSnapshot({
      ...base,
      offContractByCategory: [{ name: 'Zerada', value: 0 }],
    });
    expect(snap.maverickSpend.byCategory).toEqual([]);
  });
});

describe('deriveKpiSnapshot - contratos', () => {
  it('repassa ativos, expirando e expirados do banco', () => {
    const snap = deriveKpiSnapshot({
      ...base,
      contractCompliancePct: 88.4,
      activeContractCount: 4,
      totalContractCount: 5,
      expiringContractCount: 1,
      expiredContractCount: 2,
    });
    expect(snap.contractCompliance).toEqual({
      percentage: 88,
      target: KPI_TARGETS.contractCompliance,
      contracts: 5,
      compliant: 4,
      expiring: 1,
      expired: 2,
    });
  });
});

describe('deriveKpiSnapshot - first time match rate', () => {
  it('calcula aderencia a partir das notas fiscais conciliadas', () => {
    const snap = deriveKpiSnapshot({ ...base, invoicesTotal: 20, invoicesReconciled: 6 });
    expect(snap.firstTimeMatchRate.current).toBe(30);
    expect(snap.firstTimeMatchRate.matched).toBe(6);
    expect(snap.firstTimeMatchRate.exceptions).toBe(14);
  });

  it('nao passa de 100% nem de o total de notas', () => {
    const snap = deriveKpiSnapshot({ ...base, invoicesTotal: 3, invoicesReconciled: 9 });
    expect(snap.firstTimeMatchRate.current).toBe(100);
    expect(snap.firstTimeMatchRate.matched).toBe(3);
    expect(snap.firstTimeMatchRate.exceptions).toBe(0);
  });
});

describe('deriveKpiSnapshot - savings realization', () => {
  it('soma o projetado dos trimestres e calcula o percentual realizado', () => {
    const snap = deriveKpiSnapshot({
      ...base,
      savingsActual: 150,
      savingsByQuarter: [
        { quarter: 'Q1', projected: 100, realized: 100 },
        { quarter: 'Q2', projected: 100, realized: 50 },
      ],
    });
    expect(snap.savingsRealization.projected).toBe(200);
    expect(snap.savingsRealization.realized).toBe(150);
    expect(snap.savingsRealization.percentage).toBe(75);
  });
});

describe('deriveKpiSnapshot - concentracao de fornecedores', () => {
  it('calcula participacao sobre o spend total', () => {
    const snap = deriveKpiSnapshot({
      ...base,
      totalSpend: 1_000,
      top5Concentration: 70,
      topSuppliersBySpend: [
        { name: 'A', value: 400 },
        { name: 'B', value: 300 },
      ],
    });
    expect(snap.supplierConcentration.suppliers).toEqual([
      { name: 'A', percentage: 40 },
      { name: 'B', percentage: 30 },
    ]);
    expect(snap.supplierConcentration.risk).toBe('high');
  });
});

describe('deriveHerfindahl / deriveConcentrationRisk', () => {
  it('HHI de mercado concentrado e pulverizado', () => {
    expect(deriveHerfindahl([100])).toBe(1);
    expect(deriveHerfindahl([50, 50])).toBe(0.5);
    expect(deriveHerfindahl([20, 20, 20, 20, 20])).toBe(0.2);
  });

  it('faixas de risco', () => {
    expect(deriveConcentrationRisk(80)).toBe('high');
    expect(deriveConcentrationRisk(70)).toBe('high');
    expect(deriveConcentrationRisk(60)).toBe('medium');
    expect(deriveConcentrationRisk(49)).toBe('low');
  });
});
