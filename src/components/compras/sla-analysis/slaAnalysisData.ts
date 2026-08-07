// Mock SLA data per supplier

const SUPPLIER_COLORS: Record<string, string> = {
  'XBZ Brindes': 'hsl(var(--primary))',
  'Tech Brindes': 'hsl(142, 76%, 36%)',
  'Stricker / Spot Gifts': 'hsl(221, 83%, 53%)',
  'Premium Gifts': 'hsl(38, 92%, 50%)',
  'Asia Import': 'hsl(262, 83%, 58%)',
  'Eco Brindes': 'hsl(0, 84%, 60%)',
};

export { SUPPLIER_COLORS };

export interface SupplierSLAData {
  name: string;
  slaCompliance: number;
  onTimeDelivery: number;
  avgLeadTime: number;
  totalOrders: number;
  lateOrders: number;
  criticalOrders: number;
  overdueOrders: number;
  avgResponseTime: number;
  qualityScore: number;
  trend: string;
  trendValue: number;
  monthlyTrend: { month: string; compliance: number; onTime: number }[];
  radarData: { metric: string; value: number }[];
}

export const generateSupplierSLAData = (): SupplierSLAData[] => {
  const suppliers = [
    'XBZ Brindes',
    'Tech Brindes',
    'Stricker / Spot Gifts',
    'Premium Gifts',
    'Asia Import',
    'Eco Brindes',
  ];

  return suppliers.map((name) => {
    const baseCompliance = 80 + Math.random() * 18;
    const baseOnTime = 85 + Math.random() * 14;
    const baseLeadTime = 2 + Math.random() * 4;

    return {
      name,
      slaCompliance: Math.round(baseCompliance * 10) / 10,
      onTimeDelivery: Math.round(baseOnTime * 10) / 10,
      avgLeadTime: Math.round(baseLeadTime * 10) / 10,
      totalOrders: Math.floor(20 + Math.random() * 40),
      lateOrders: Math.floor(Math.random() * 8),
      criticalOrders: Math.floor(Math.random() * 5),
      overdueOrders: Math.floor(Math.random() * 3),
      avgResponseTime: Math.round((1 + Math.random() * 3) * 10) / 10,
      qualityScore: Math.round((85 + Math.random() * 14) * 10) / 10,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendValue: Math.round(Math.random() * 5 * 10) / 10,
      monthlyTrend: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(month => ({
        month,
        compliance: Math.round((baseCompliance + (Math.random() - 0.5) * 10) * 10) / 10,
        onTime: Math.round((baseOnTime + (Math.random() - 0.5) * 8) * 10) / 10,
      })),
      radarData: [
        { metric: 'Pontualidade', value: Math.round(baseOnTime) },
        { metric: 'Qualidade', value: Math.round(70 + Math.random() * 28) },
        { metric: 'Comunicação', value: Math.round(65 + Math.random() * 30) },
        { metric: 'Flexibilidade', value: Math.round(60 + Math.random() * 35) },
        { metric: 'Custo-Benefício', value: Math.round(70 + Math.random() * 25) },
        { metric: 'Lead Time', value: Math.round(100 - baseLeadTime * 10) },
      ],
    };
  });
};

export function getSLAColor(value: number): string {
  if (value >= 95) return 'text-success';
  if (value >= 85) return 'text-info';
  if (value >= 75) return 'text-warning';
  return 'text-destructive';
}

export function getSLABgColor(value: number): string {
  if (value >= 95) return 'bg-success';
  if (value >= 85) return 'bg-info';
  if (value >= 75) return 'bg-warning';
  return 'bg-destructive';
}
