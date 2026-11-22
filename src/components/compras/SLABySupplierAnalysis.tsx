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
  TooltipProps,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  CheckCircle2,
  Star,
  Calendar,
  RefreshCw,
} from 'lucide-react';

import {
  SUPPLIER_PALETTE,
  averageCompliance,
  type SupplierSLAData,
} from './sla-analysis/slaAnalysisData';
import {
  SLA_PERIOD_LABEL,
  useSupplierSlaData,
  type SlaPeriod,
} from './sla-analysis/useSupplierSlaData';

const EMPTY = '—';
const NO_SUPPLIERS: SupplierSLAData[] = [];

function pct(value: number | null): string {
  return value === null ? EMPTY : `${value}%`;
}

function days(value: number | null): string {
  return value === null ? EMPTY : `${value}d`;
}

interface PayloadEntry {
  color: string;
  name: string;
  value: number | null;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-sm mb-2">{label}</p>
      {(payload as PayloadEntry[]).map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value === null || entry.value === undefined ? EMPTY : `${entry.value}%`}</span>
        </div>
      ))}
    </div>
  );
};

const SupplierSLACard = ({ supplier, color }: { supplier: SupplierSLAData; color: string }) => {
  const TrendIcon = supplier.trend === 'up' ? TrendingUp : supplier.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    supplier.trend === 'up' ? 'text-success' : supplier.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h4 className="font-semibold text-foreground text-sm">{supplier.name}</h4>
          </div>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {supplier.trendValue === null ? EMPTY : `${supplier.trendValue}pp`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Conformidade SLA</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{pct(supplier.slaCompliance)}</span>
              <Progress value={supplier.slaCompliance ?? 0} className="h-1.5 flex-1" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entregas no Prazo</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{pct(supplier.onTimeDelivery)}</span>
              <Progress value={supplier.onTimeDelivery ?? 0} className="h-1.5 flex-1" />
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
            <p className="font-semibold">{days(supplier.avgLeadTime)}</p>
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
  const [period, setPeriod] = useState<SlaPeriod>('6m');
  const { data, isLoading, isError, error, refetch, isFetching } = useSupplierSlaData(period);

  const suppliers = data?.suppliers ?? NO_SUPPLIERS;
  const ordersInWindow = data?.ordersInWindow ?? 0;
  const comparableOrders = data?.comparableOrders ?? 0;

  const sortedSuppliers = useMemo(
    () =>
      [...suppliers].sort((a, b) => {
        if (a.slaCompliance === null && b.slaCompliance === null) return b.totalOrders - a.totalOrders;
        if (a.slaCompliance === null) return 1;
        if (b.slaCompliance === null) return -1;
        return b.slaCompliance - a.slaCompliance;
      }),
    [suppliers],
  );

  const colorOf = (name: string, index: number) =>
    SUPPLIER_PALETTE[index % SUPPLIER_PALETTE.length];

  const ranked = sortedSuppliers.filter((s) => s.slaCompliance !== null);
  const topPerformer = ranked[0];
  const worstPerformer = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const avgCompliance = averageCompliance(suppliers);

  const trendSeries = useMemo(() => {
    const tracked = ranked.slice(0, 6);
    if (tracked.length === 0) return [];
    return tracked[0].monthlyTrend.map((point, monthIndex) => {
      const row: Record<string, string | number | null> = { month: point.month };
      tracked.forEach((supplier) => {
        row[supplier.name] = supplier.monthlyTrend[monthIndex]?.compliance ?? null;
      });
      return row;
    });
  }, [ranked]);

  const header = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Análise de SLA por Fornecedor
        </h3>
        <p className="text-sm text-muted-foreground">
          Calculado a partir dos pedidos reais: {comparableOrders} entrega(s) com previsão em {ordersInWindow} pedido(s) no período
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as SlaPeriod)}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SLA_PERIOD_LABEL) as SlaPeriod[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SLA_PERIOD_LABEL[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar dados">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="p-6 border-destructive/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Não foi possível carregar o SLA dos fornecedores</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Erro desconhecido ao consultar os pedidos.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="p-6 border-dashed">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Nenhum fornecedor ativo</p>
              <p className="text-sm text-muted-foreground">
                Cadastre fornecedores para acompanhar conformidade de prazo. Nenhum número é estimado nesta tela.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Melhor Performance</p>
              <p className="font-semibold text-foreground">{topPerformer ? topPerformer.name : EMPTY}</p>
              <p className="text-sm text-success">
                {topPerformer ? `${pct(topPerformer.slaCompliance)} conformidade` : 'Sem entregas com previsão'}
              </p>
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
              <p className="font-semibold text-foreground">{pct(avgCompliance)}</p>
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
              <p className="font-semibold text-foreground">{worstPerformer ? worstPerformer.name : EMPTY}</p>
              <p className="text-sm text-warning">
                {worstPerformer ? `${pct(worstPerformer.slaCompliance)} conformidade` : 'Sem base comparativa'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSuppliers.map((supplier, index) => (
          <SupplierSLACard key={supplier.id} supplier={supplier} color={colorOf(supplier.name, index)} />
        ))}
      </div>

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
                <BarChart data={sortedSuppliers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="slaCompliance" name="SLA" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="onTimeDelivery" name="No Prazo" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="qualityScore" name="Qualidade" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Evolução da Conformidade SLA</h4>
            {trendSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem entregas com data prevista no período para traçar a evolução.
              </p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {ranked.slice(0, 6).map((supplier, index) => (
                      <Line
                        key={supplier.id}
                        type="monotone"
                        dataKey={supplier.name}
                        name={supplier.name}
                        stroke={colorOf(supplier.name, index)}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Ranking de Performance SLA</h4>
            <div className="space-y-3">
              {sortedSuppliers.map((supplier, index) => (
                <div key={supplier.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-warning text-primary-foreground'
                        : index === 1
                          ? 'bg-gray-400 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorOf(supplier.name, index) }} />
                  <div className="flex-1">
                    <p className="font-medium">{supplier.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{supplier.totalOrders} pedidos</span>
                      <span>{days(supplier.avgLeadTime)} lead time</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{pct(supplier.slaCompliance)}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            supplier.slaCompliance !== null && i < Math.round(supplier.slaCompliance / 20)
                              ? 'fill-yellow-400 text-warning'
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

export default SLABySupplierAnalysis;
