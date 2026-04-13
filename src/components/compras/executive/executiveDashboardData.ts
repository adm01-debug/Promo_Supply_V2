// Mock data constants for the Executive Dashboard

export const currentPeriodMetrics = {
  totalSpend: { value: 2450000, target: 2500000 },
  savings: { value: 245000, target: 200000 },
  ordersThisMonth: { value: 156, target: 170 },
  avgCycleTime: { value: 4.2, target: 5.0 },
  supplierCount: { value: 48, target: 50 },
  pendingApprovals: { value: 12, urgent: 3 },
  overdueOrders: { value: 5, critical: 2 },
  contractCompliance: { value: 87, target: 90 }
};

export const previousPeriodMetrics = {
  totalSpend: { value: 2178000 },
  savings: { value: 207000 },
  ordersThisMonth: { value: 165 },
  avgCycleTime: { value: 4.95 },
  supplierCount: { value: 44 },
  pendingApprovals: { value: 15 },
  overdueOrders: { value: 8 },
  contractCompliance: { value: 82.8 }
};

export const calculateChange = (current: number, previous: number) => {
  return ((current - previous) / previous) * 100;
};

export const executiveMetrics = {
  totalSpend: { 
    value: currentPeriodMetrics.totalSpend.value, 
    previousValue: previousPeriodMetrics.totalSpend.value,
    change: calculateChange(currentPeriodMetrics.totalSpend.value, previousPeriodMetrics.totalSpend.value), 
    target: currentPeriodMetrics.totalSpend.target 
  },
  savings: { 
    value: currentPeriodMetrics.savings.value, 
    previousValue: previousPeriodMetrics.savings.value,
    change: calculateChange(currentPeriodMetrics.savings.value, previousPeriodMetrics.savings.value), 
    target: currentPeriodMetrics.savings.target 
  },
  ordersThisMonth: { 
    value: currentPeriodMetrics.ordersThisMonth.value, 
    previousValue: previousPeriodMetrics.ordersThisMonth.value,
    change: calculateChange(currentPeriodMetrics.ordersThisMonth.value, previousPeriodMetrics.ordersThisMonth.value), 
    target: currentPeriodMetrics.ordersThisMonth.target 
  },
  avgCycleTime: { 
    value: currentPeriodMetrics.avgCycleTime.value, 
    previousValue: previousPeriodMetrics.avgCycleTime.value,
    change: calculateChange(currentPeriodMetrics.avgCycleTime.value, previousPeriodMetrics.avgCycleTime.value), 
    target: currentPeriodMetrics.avgCycleTime.target 
  },
  supplierCount: { 
    value: currentPeriodMetrics.supplierCount.value, 
    previousValue: previousPeriodMetrics.supplierCount.value,
    change: calculateChange(currentPeriodMetrics.supplierCount.value, previousPeriodMetrics.supplierCount.value), 
    target: currentPeriodMetrics.supplierCount.target 
  },
  pendingApprovals: { 
    value: currentPeriodMetrics.pendingApprovals.value, 
    previousValue: previousPeriodMetrics.pendingApprovals.value,
    change: calculateChange(currentPeriodMetrics.pendingApprovals.value, previousPeriodMetrics.pendingApprovals.value), 
    urgent: currentPeriodMetrics.pendingApprovals.urgent 
  },
  overdueOrders: { 
    value: currentPeriodMetrics.overdueOrders.value, 
    previousValue: previousPeriodMetrics.overdueOrders.value,
    change: calculateChange(currentPeriodMetrics.overdueOrders.value, previousPeriodMetrics.overdueOrders.value), 
    critical: currentPeriodMetrics.overdueOrders.critical 
  },
  contractCompliance: { 
    value: currentPeriodMetrics.contractCompliance.value, 
    previousValue: previousPeriodMetrics.contractCompliance.value,
    change: calculateChange(currentPeriodMetrics.contractCompliance.value, previousPeriodMetrics.contractCompliance.value), 
    target: currentPeriodMetrics.contractCompliance.target 
  }
};

export const monthlyTrend = [
  { month: 'Jul', spend: 180000, savings: 18000, orders: 120 },
  { month: 'Ago', spend: 220000, savings: 24000, orders: 145 },
  { month: 'Set', spend: 195000, savings: 21000, orders: 132 },
  { month: 'Out', spend: 245000, savings: 28000, orders: 158 },
  { month: 'Nov', spend: 210000, savings: 25000, orders: 148 },
  { month: 'Dez', spend: 235000, savings: 30000, orders: 156 }
];

const previousMonthlyTrend = [
  { month: 'Jan', spend: 165000, savings: 14000, orders: 108 },
  { month: 'Fev', spend: 185000, savings: 17000, orders: 125 },
  { month: 'Mar', spend: 175000, savings: 16000, orders: 118 },
  { month: 'Abr', spend: 210000, savings: 20000, orders: 142 },
  { month: 'Mai', spend: 195000, savings: 19000, orders: 135 },
  { month: 'Jun', spend: 205000, savings: 21000, orders: 140 }
];

export const comparisonTrend = monthlyTrend.map((current, index) => ({
  month: current.month,
  currentSpend: current.spend,
  previousSpend: previousMonthlyTrend[index]?.spend || 0,
  currentSavings: current.savings,
  previousSavings: previousMonthlyTrend[index]?.savings || 0,
  currentOrders: current.orders,
  previousOrders: previousMonthlyTrend[index]?.orders || 0
}));

export const trendDataSets = {
  spend: monthlyTrend.map(m => m.spend),
  savings: monthlyTrend.map(m => m.savings),
  orders: monthlyTrend.map(m => m.orders),
  cycleTime: [5.2, 4.9, 4.8, 4.5, 4.3, 4.2],
  suppliers: [42, 44, 45, 46, 47, 48],
  pendingApprovals: [18, 15, 14, 16, 13, 12],
  overdueOrders: [10, 8, 7, 6, 5, 5],
  compliance: [82, 84, 85, 86, 86, 87]
};

export const categorySpend = [
  { name: 'Mochilas', value: 450000, previousValue: 380000, percentage: 18.4, orders: 45, supplier: 'XBZ Brindes' },
  { name: 'Canetas', value: 380000, previousValue: 350000, percentage: 15.5, orders: 120, supplier: 'Stricker' },
  { name: 'Camisetas', value: 320000, previousValue: 290000, percentage: 13.1, orders: 38, supplier: 'Asia Import' },
  { name: 'Bonés', value: 280000, previousValue: 260000, percentage: 11.4, orders: 52, supplier: 'Só Marcas' },
  { name: 'Cadernos', value: 250000, previousValue: 230000, percentage: 10.2, orders: 65, supplier: 'Spot Gifts' },
  { name: 'Outros', value: 770000, previousValue: 668000, percentage: 31.4, orders: 180, supplier: 'XBZ Brindes' }
];

export const topSuppliers = [
  { name: 'XBZ Brindes', spend: 420000, previousSpend: 360000, orders: 45, savings: 42000, compliance: 94, categories: ['Mochilas', 'Outros'] },
  { name: 'Stricker', spend: 380000, previousSpend: 340000, orders: 38, savings: 35000, compliance: 91, categories: ['Canetas'] },
  { name: 'Asia Import', spend: 320000, previousSpend: 295000, orders: 52, savings: 28000, compliance: 88, categories: ['Camisetas'] },
  { name: 'Só Marcas', spend: 280000, previousSpend: 250000, orders: 41, savings: 25000, compliance: 85, categories: ['Bonés'] },
  { name: 'Spot Gifts', spend: 250000, previousSpend: 220000, orders: 35, savings: 22000, compliance: 82, categories: ['Cadernos'] }
];

export const buyerPerformance = [
  { name: 'Ana Silva', orders: 45, previousOrders: 38, savings: 52000, previousSavings: 42000, avgCycle: 3.8, compliance: 96, categories: ['Mochilas', 'Canetas'], suppliers: ['XBZ Brindes', 'Stricker'] },
  { name: 'Carlos Santos', orders: 38, previousOrders: 35, savings: 41000, previousSavings: 35000, avgCycle: 4.2, compliance: 92, categories: ['Camisetas', 'Bonés'], suppliers: ['Asia Import', 'Só Marcas'] },
  { name: 'Maria Costa', orders: 42, previousOrders: 40, savings: 38000, previousSavings: 34000, avgCycle: 4.5, compliance: 89, categories: ['Cadernos', 'Outros'], suppliers: ['Spot Gifts', 'XBZ Brindes'] },
  { name: 'João Pereira', orders: 31, previousOrders: 28, savings: 28000, previousSavings: 24000, avgCycle: 5.1, compliance: 85, categories: ['Mochilas', 'Camisetas'], suppliers: ['XBZ Brindes', 'Asia Import'] }
];

export const pendingItems = [
  { id: 'APR-001', type: 'Aprovação', item: 'PO #2638 - Mochilas', value: 45000, days: 2, priority: 'high', category: 'Mochilas', supplier: 'XBZ Brindes' },
  { id: 'APR-002', type: 'Aprovação', item: 'PO #2641 - Camisetas', value: 32000, days: 1, priority: 'critical', category: 'Camisetas', supplier: 'Asia Import' },
  { id: 'PAY-001', type: 'Pagamento', item: 'NF 12345 - XBZ Brindes', value: 28000, days: 3, priority: 'medium', category: 'Outros', supplier: 'XBZ Brindes' },
  { id: 'ORD-001', type: 'Pedido Atrasado', item: 'PO #2612 - Canetas', value: 15000, days: 5, priority: 'critical', category: 'Canetas', supplier: 'Stricker' },
  { id: 'APR-003', type: 'Aprovação', item: 'PO #2645 - Bonés', value: 18000, days: 0, priority: 'high', category: 'Bonés', supplier: 'Só Marcas' }
];

export const allCategories = categorySpend.map(c => c.name);
export const allSuppliers = topSuppliers.map(s => s.name);

export const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

export interface DrillDownData {
  type: 'category' | 'supplier' | 'buyer' | 'pending';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};
