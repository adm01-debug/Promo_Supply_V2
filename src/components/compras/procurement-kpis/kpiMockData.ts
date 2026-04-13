// Mock data and helper types for AdvancedProcurementKPIs
export const kpiData = {
  procurementROI: {
    current: 4.2,
    previous: 3.8,
    target: 5.0,
    savings: 284500,
    investment: 67738
  },
  maverickSpend: {
    total: 1250000,
    maverick: 187500,
    percentage: 15,
    target: 10,
    byCategory: [
      { name: "TI", value: 45000, percentage: 24 },
      { name: "Marketing", value: 38000, percentage: 20 },
      { name: "Facilities", value: 52500, percentage: 28 },
      { name: "Outros", value: 52000, percentage: 28 }
    ]
  },
  contractCompliance: {
    percentage: 78,
    target: 90,
    contracts: 45,
    compliant: 35,
    expiring: 8,
    expired: 2
  },
  costAvoidance: {
    total: 156800,
    negotiated: 89400,
    competitive: 45200,
    standardization: 22200
  },
  poCycleTime: {
    current: 3.2,
    target: 2.0,
    trend: [
      { month: "Jul", days: 4.5 },
      { month: "Ago", days: 4.2 },
      { month: "Set", days: 3.8 },
      { month: "Out", days: 3.5 },
      { month: "Nov", days: 3.4 },
      { month: "Dez", days: 3.2 }
    ]
  },
  supplierConcentration: {
    top5Percentage: 68,
    herfindahlIndex: 0.12,
    risk: "medium",
    suppliers: [
      { name: "XBZ Brindes", percentage: 32 },
      { name: "Stricker", percentage: 15 },
      { name: "Asia Import", percentage: 10 },
      { name: "Só Marcas", percentage: 6 },
      { name: "Tech Solutions", percentage: 5 }
    ]
  },
  firstTimeMatchRate: {
    current: 87,
    target: 95,
    invoices: 234,
    matched: 204,
    exceptions: 30
  },
  savingsRealization: {
    projected: 450000,
    realized: 312000,
    percentage: 69,
    byQuarter: [
      { quarter: "Q1", projected: 100000, realized: 78000 },
      { quarter: "Q2", projected: 120000, realized: 95000 },
      { quarter: "Q3", projected: 115000, realized: 82000 },
      { quarter: "Q4", projected: 115000, realized: 57000 }
    ]
  }
};

export const KPI_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
