import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Star,
  Calendar,
} from 'lucide-react';
import { fornecedoresMock } from '@/data/mockData';

// Mock SLA data per supplier
const generateSupplierSLAData = () => {
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
      criticalOrders: Math.floor(Math.random() * 5),
      overdueOrders: Math.floor(Math.random() * 3),
      avgResponseTime: Math.round((0.5 + Math.random() * 2) * 10) / 10,
      qualityScore: Math.round((85 + Math.random() * 14) * 10) / 10,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendValue: Math.round(Math.random() * 5 * 10) / 10,
    };
  });
};

const generateHistoricalSLAData = () => {
  const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months.map((month) => ({
    month,
    'XBZ Brindes': Math.round((85 + Math.random() * 12) * 10) / 10,
    'Tech Brindes': Math.round((82 + Math.random() * 14) * 10) / 10,
    'Stricker': Math.round((88 + Math.random() * 10) * 10) / 10,
    'Premium Gifts': Math.round((90 + Math.random() * 8) * 10) / 10,
    'Asia Import': Math.round((78 + Math.random() * 15) * 10) / 10,
    'Eco Brindes': Math.round((84 + Math.random() * 12) * 10) / 10,
  }));
};

const supplierSLAData = generateSupplierSLAData();
const historicalSLAData = generateHistoricalSLAData();

const SUPPLIER_COLORS: Record<string, string> = {
  'XBZ Brindes': '#3b82f6',
  'Tech Brindes': '#f59e0b',
  'Stricker / Spot Gifts': '#8b5cf6',
  'Stricker': '#8b5cf6',
  'Premium Gifts': '#10b981',
  'Asia Import': '#ec4899',
  'Eco Brindes': '#06b6d4',
};

const SupplierSLACard = ({ supplier }: { supplier: typeof supplierSLAData[0] }) => {
  const TrendIcon = supplier.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = supplier.trend === 'up' ? 'text-success' : 'text-destructive';

  const radarData = [
    { metric: 'SLA', value: supplier.slaCompliance, fullMark: 100 },
    { metric: 'Prazo', value: supplier.onTimeDelivery, fullMark: 100 },
    { metric: 'Qualidade', value: supplier.qualityScore, fullMark: 100 },
    { metric: 'Resposta', value: Math.max(0, 100 - supplier.avgResponseTime * 20), fullMark: 100 },
  ];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: SUPPLIER_COLORS[supplier.name] || '#888' }}
            />
            <h4 className="font-semibold text-foreground text-sm">{supplier.name}</h4>
          </div>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {supplier.trendValue}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Conformidade SLA</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{supplier.slaCompliance}%</span>
              <Progress value={supplier.slaCompliance} className="h-1.5 flex-1" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entregas no Prazo</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{supplier.onTimeDelivery}%</span>
              <Progress value={supplier.onTimeDelivery} className="h-1.5 flex-1" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="font-semibold">{supplier.totalOrders}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lead Time</p>
            <p className="font-semibold">{supplier.avgLeadTime}d</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Críticos</p>
            <p className={`font-semibold ${supplier.criticalOrders > 0 ? 'text-warning' : 'text-success'}`}>
              {supplier.criticalOrders}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Atrasados</p>
            <p className={`font-semibold ${supplier.overdueOrders > 0 ? 'text-destructive' : 'text-success'}`}>
              {supplier.overdueOrders}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SLABySupplierAnalysis = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('6m');

  const sortedSuppliers = useMemo(() => {
    return [...supplierSLAData].sort((a, b) => b.slaCompliance - a.slaCompliance);
  }, []);

  const topPerformer = sortedSuppliers[0];
  const worstPerformer = sortedSuppliers[sortedSuppliers.length - 1];
  const avgCompliance = Math.round(
    (supplierSLAData.reduce((acc, s) => acc + s.slaCompliance, 0) / supplierSLAData.length) * 10
  ) / 10;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Análise de SLA por Fornecedor
          </h3>
          <p className="text-sm text-muted-foreground">
            Performance detalhada e histórico de conformidade
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Melhor Performance</p>
              <p className="font-semibold text-foreground">{topPerformer.name}</p>
              <p className="text-sm text-success">{topPerformer.slaCompliance}% conformidade</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Média Geral</p>
              <p className="font-semibold text-foreground">{avgCompliance}%</p>
              <p className="text-sm text-muted-foreground">Conformidade SLA</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requer Atenção</p>
              <p className="font-semibold text-foreground">{worstPerformer.name}</p>
              <p className="text-sm text-warning">{worstPerformer.slaCompliance}% conformidade</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSuppliers.map((supplier) => (
          <SupplierSLACard key={supplier.name} supplier={supplier} />
        ))}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          <TabsTrigger value="trend">Tendência</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Comparativo de Métricas por Fornecedor</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierSLAData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="slaCompliance"
                    name="SLA"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="onTimeDelivery"
                    name="No Prazo"
                    fill="hsl(var(--success))"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="qualityScore"
                    name="Qualidade"
                    fill="hsl(var(--warning))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Evolução da Conformidade SLA</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalSLAData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(SUPPLIER_COLORS).slice(0, 6).map((supplier) => {
                    const key = supplier === 'Stricker / Spot Gifts' ? 'Stricker' : supplier;
                    return (
                      <Line
                        key={supplier}
                        type="monotone"
                        dataKey={key}
                        name={supplier}
                        stroke={SUPPLIER_COLORS[supplier]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Ranking de Performance SLA</h4>
            <div className="space-y-3">
              {sortedSuppliers.map((supplier, index) => (
                <div
                  key={supplier.name}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-gray-400 text-white'
                        : index === 2
                        ? 'bg-amber-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SUPPLIER_COLORS[supplier.name] }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{supplier.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{supplier.totalOrders} pedidos</span>
                      <span>{supplier.avgLeadTime}d lead time</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{supplier.slaCompliance}%</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.round(supplier.slaCompliance / 20)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
