export interface MaverickCategoryRow {
  name: string;
  value: number;
  percentage: number;
}

export interface CycleTrendRow {
  month: string;
  days: number;
}

export interface ConcentrationRow {
  name: string;
  percentage: number;
}

export interface QuarterRow {
  quarter: string;
  projected: number;
  realized: number;
}

export interface KpiSnapshotInput {
  totalSpend: number;
  maverickSpend: number;
  maverickPercentage: number;
  offContractByCategory?: Array<{ name: string; value: number }>;
  contractCompliancePct: number;
  activeContractCount: number;
  totalContractCount: number;
  expiringContractCount: number;
  expiredContractCount: number;
  avgCycleDays: number;
  cycleTrend?: CycleTrendRow[];
  savings: number;
  savingsPercent: number;
  top5Concentration: number;
  topSuppliersBySpend?: Array<{ name: string; value: number }>;
  invoicesTotal?: number;
  invoicesReconciled?: number;
  savingsBaseline?: number;
  savingsActual?: number;
  savingsByQuarter?: QuarterRow[];
}

export interface KpiSnapshot {
  procurementROI: { current: number; previous: number; target: number; savings: number; investment: number };
  maverickSpend: { total: number; maverick: number; percentage: number; target: number; byCategory: MaverickCategoryRow[] };
  contractCompliance: { percentage: number; target: number; contracts: number; compliant: number; expiring: number; expired: number };
  costAvoidance: { total: number; negotiated: number; competitive: number; standardization: number };
  poCycleTime: { current: number; target: number; trend: CycleTrendRow[] };
  supplierConcentration: { top5Percentage: number; herfindahlIndex: number; risk: 'low' | 'medium' | 'high'; suppliers: ConcentrationRow[] };
  firstTimeMatchRate: { current: number; target: number; invoices: number; matched: number; exceptions: number };
  savingsRealization: { projected: number; realized: number; percentage: number; byQuarter: QuarterRow[] };
}

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

export const KPI_TARGETS = {
  procurementROI: 5.0,
  maverickSpend: 10,
  contractCompliance: 90,
  poCycleTime: 2.0,
  firstTimeMatchRate: 95,
  savingsRealization: 80,
} as const;

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export function deriveHerfindahl(shares: number[]): number {
  return round(shares.reduce((sum, s) => sum + (s / 100) ** 2, 0), 3);
}

export function deriveConcentrationRisk(top5Percentage: number): 'low' | 'medium' | 'high' {
  if (top5Percentage >= 70) return 'high';
  if (top5Percentage >= 50) return 'medium';
  return 'low';
}

export function deriveKpiSnapshot(input: KpiSnapshotInput): KpiSnapshot {
  const totalSpend = Number.isFinite(input.totalSpend) ? Math.max(0, input.totalSpend) : 0;
  const maverickSpend = Number.isFinite(input.maverickSpend) ? Math.max(0, input.maverickSpend) : 0;
  const savings = Number.isFinite(input.savings) ? Math.max(0, input.savings) : 0;

  // ROI procurement = economia gerada / investimento em compras.
  // O investimento equivale ao spend sem contrato (custo de compras fora de acordo).
  const investment = maverickSpend > 0 ? maverickSpend : 0;
  const roiCurrent = investment > 0 ? round(savings / investment, 1) : 0;

  const offContract = (input.offContractByCategory || [])
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const offContractTotal = offContract.reduce((sum, c) => sum + c.value, 0);
  const byCategory: MaverickCategoryRow[] = offContract.map((c) => ({
    name: c.name,
    value: Math.round(c.value),
    percentage: offContractTotal > 0 ? Math.round((c.value / offContractTotal) * 1000) / 10 : 0,
  }));

  const invoices = Math.max(0, input.invoicesTotal || 0);
  const reconciled = Math.min(invoices, Math.max(0, input.invoicesReconciled || 0));
  const firstTimeRate = invoices > 0 ? round((reconciled / invoices) * 100, 1) : 0;

  const baseline = Math.max(0, input.savingsBaseline || 0);
  const realized = Math.max(0, input.savingsActual || 0);
  const byQuarter: QuarterRow[] = (input.savingsByQuarter || QUARTER_LABELS.map((q) => ({ quarter: q, projected: 0, realized: 0 }))).slice(0, 4);
  const projected = byQuarter.reduce((sum, q) => sum + q.projected, 0);

  const suppliers: ConcentrationRow[] = (input.topSuppliersBySpend || []).slice(0, 5).map((s) => ({
    name: s.name,
    percentage: totalSpend > 0 ? Math.round((s.value / totalSpend) * 1000) / 10 : 0,
  }));

  return {
    procurementROI: {
      current: roiCurrent,
      previous: 0,
      target: KPI_TARGETS.procurementROI,
      savings: Math.round(savings),
      investment: Math.round(investment),
    },
    maverickSpend: {
      total: Math.round(totalSpend),
      maverick: Math.round(maverickSpend),
      percentage: round(input.maverickPercentage, 1),
      target: KPI_TARGETS.maverickSpend,
      byCategory,
    },
    contractCompliance: {
      percentage: Math.round(input.contractCompliancePct),
      target: KPI_TARGETS.contractCompliance,
      contracts: Math.max(0, input.totalContractCount),
      compliant: Math.max(0, input.activeContractCount),
      expiring: Math.max(0, input.expiringContractCount),
      expired: Math.max(0, input.expiredContractCount),
    },
    costAvoidance: {
      total: Math.round(savings + realized),
      negotiated: Math.round(savings),
      competitive: Math.round(realized),
      standardization: 0,
    },
    poCycleTime: {
      current: round(input.avgCycleDays, 1),
      target: KPI_TARGETS.poCycleTime,
      trend: (input.cycleTrend || []).slice(-6),
    },
    supplierConcentration: {
      top5Percentage: round(input.top5Concentration, 1),
      herfindahlIndex: deriveHerfindahl(suppliers.map((s) => s.percentage)),
      risk: deriveConcentrationRisk(input.top5Concentration),
      suppliers,
    },
    firstTimeMatchRate: {
      current: firstTimeRate,
      target: KPI_TARGETS.firstTimeMatchRate,
      invoices,
      matched: reconciled,
      exceptions: invoices - reconciled,
    },
    savingsRealization: {
      projected: Math.round(projected > 0 ? projected : baseline),
      realized: Math.round(realized),
      percentage: projected > 0 ? round((realized / projected) * 100, 1) : 0,
      byQuarter,
    },
  };
}
