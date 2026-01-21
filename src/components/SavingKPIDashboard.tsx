import { useSavingKPI } from '@/hooks/useSavingKPI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, Target, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface SavingKPIDashboardProps {
  className?: string;
  showChart?: boolean;
  showTopSavings?: boolean;
  showByCategory?: boolean;
}

export function SavingKPIDashboard({
  className,
  showChart = true,
  showTopSavings = true,
  showByCategory = true,
}: SavingKPIDashboardProps) {
  const { kpis, loading, error } = useSavingKPI();

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="pt-6">
          <p className="text-destructive">Erro ao carregar KPIs de Saving: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getVariacaoIcon = () => {
    if (kpis.variacao > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (kpis.variacao < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariacaoColor = () => {
    if (kpis.variacao > 0) return 'text-green-500';
    if (kpis.variacao < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saving Percentual */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Saving Rate (Mês)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">
                {formatPercent(kpis.savingAtual.savingPercentual)}
              </span>
              <div className={cn("flex items-center gap-1 text-sm", getVariacaoColor())}>
                {getVariacaoIcon()}
                <span>{formatPercent(Math.abs(kpis.variacao))}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs. {formatPercent(kpis.savingAnterior.savingPercentual)} mês anterior
            </p>
          </CardContent>
        </Card>

        {/* Saving Absoluto */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Economia Total (Mês)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(kpis.savingAtual.savingAbsoluto)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              em {kpis.savingAtual.quantidadeSolicitacoes} solicitações
            </p>
          </CardContent>
        </Card>

        {/* Valor Estimado */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor Estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpis.savingAtual.valorEstimado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Orçado pelo solicitante
            </p>
          </CardContent>
        </Card>

        {/* Valor Aprovado */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor Aprovado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpis.savingAtual.valorAprovado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Negociado por Compras
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      {showChart && kpis.historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução do Saving (12 meses)</CardTitle>
            <CardDescription>
              Taxa de economia mensal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.historico}>
                  <defs>
                    <linearGradient id="savingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="periodo" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value}%`}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Saving']}
                    labelFormatter={(label) => `Período: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="savingPercentual"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#savingGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Savings */}
        {showTopSavings && kpis.topSavings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top 10 Maiores Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpis.topSavings.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-gray-300 text-gray-700" :
                        index === 2 ? "bg-amber-600 text-amber-50" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{item.numero}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.titulo}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(item.saving)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(item.savingPercentual)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saving por Categoria */}
        {showByCategory && kpis.porCategoria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saving por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={kpis.porCategoria.slice(0, 6)} 
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="categoria" 
                      width={100}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Saving']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="savingPercentual" 
                      fill="#22c55e" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Componente compacto para uso em cards menores
export function SavingKPICard({ className }: { className?: string }) {
  const { kpis, loading } = useSavingKPI();

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="pt-6">
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card className={cn("bg-gradient-to-br from-green-500/10 to-green-600/5", className)}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Saving Rate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-green-600">
            {formatPercent(kpis.savingAtual.savingPercentual)}
          </span>
          {kpis.variacao !== 0 && (
            <span className={cn(
              "text-xs",
              kpis.variacao > 0 ? "text-green-500" : "text-red-500"
            )}>
              {kpis.variacao > 0 ? '↑' : '↓'} {formatPercent(Math.abs(kpis.variacao))}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
