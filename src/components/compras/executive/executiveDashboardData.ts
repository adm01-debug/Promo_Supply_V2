// Pure utilities for the Executive Dashboard (no fictional data).
// All derived data now comes from useExecutiveDashboardData.

export const calculateChange = (current: number, previous: number) => {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
};

export const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

export interface DrillDownPayload {
  name?: string;
  id?: string;
  value?: number;
  previousValue?: number;
  percentage?: number;
  orders?: number;
  previousOrders?: number;
  supplier?: string;
  spend?: number;
  previousSpend?: number;
  savings?: number;
  previousSavings?: number;
  compliance?: number;
  categories?: string[];
  suppliers?: string[];
  avgCycle?: number;
  risk?: string;
  item?: string;
  days?: number;
  priority?: string;
  category?: string;
  type?: string;
}

export interface DrillDownData {
  type: 'category' | 'supplier' | 'buyer' | 'pending';
  data: DrillDownPayload;
}

export const formatNumber = (value: number) => {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
};