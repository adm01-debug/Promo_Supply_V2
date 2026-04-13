import { BuyerComparisonView } from "./buyer/BuyerComparisonView";
import { useState, useMemo } from "react";
import {
  User,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  Download,
  PiggyBank,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Percent,
  ShoppingCart,
  Zap,
  Users,
  GitCompare,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MainLayout } from "@/components/compras/MainLayout";
import { BuyerPerformanceAlerts } from "@/components/compras/BuyerPerformanceAlerts";
import { useBuyerAlertsStore } from "@/stores/buyerAlertsStore";
import { useBuyerPerformanceData } from "@/hooks/useBuyerPerformanceData";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";
import {
  COLORS, PERIOD_MAP, getMetricStatus, MetricStatusIcon,
  DashboardSkeleton, EmptyState, exportBuyerCSV,
} from "./buyer/buyerDashboardHelpers";

const BuyerPerformanceDashboard = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [compareMode, setCompareMode] = useState(false);
  const { targets } = useBuyerAlertsStore();

  const periodMonths = PERIOD_MAP[periodo] || 6;
  const { buyers, loading } = useBuyerPerformanceData(periodMonths);

  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [compareBuyerId, setCompareBuyerId] = useState<string>('');

  // Auto-select first buyer when data loads
  const buyer = useMemo(() => {
    if (buyers.length === 0) return null;
    const found = buyers.find(b => b.id === selectedBuyerId);
    if (found) return found;
    // Auto-select first
    return buyers[0];
  }, [buyers, selectedBuyerId]);

  const compareBuyer = useMemo(() => {
    if (buyers.length < 2) return null;
    const found = buyers.find(b => b.id === compareBuyerId);
    if (found) return found;
    return buyers[1] || buyers[0];
  }, [buyers, compareBuyerId]);

  // Ensure selected IDs are synced
  const effectiveBuyerId = buyer?.id || '';
  const effectiveCompareBuyerId = compareBuyer?.id || '';

  if (loading) {
    return (
      <MainLayout>
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  if (!buyer || buyers.length === 0) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Desempenho</h1>
          <EmptyState />
        </div>
      </MainLayout>
    );
  }

  const defaultMeta = { economiaMensal: 10000, descontoMedio: 10, cotacoesMinimas: 30 };
  const buyerTarget = targets.find(t => t.buyerId === buyer.id);
  const meta = {
    economiaMensal: buyerTarget?.economiaMensal || defaultMeta.economiaMensal,
    descontoMedio: buyerTarget?.descontoMedio || defaultMeta.descontoMedio,
    cotacoesMinimas: buyerTarget?.cotacoesMinimas || defaultMeta.cotacoesMinimas,
  };

  const economiaVsMeta = meta.economiaMensal > 0 ? (buyer.performance.economiaMes / meta.economiaMensal) * 100 : 100;
  const descontoVsMeta = meta.descontoMedio > 0 ? (buyer.performance.descontoMedio / meta.descontoMedio) * 100 : 100;
  const cotacoesVsMeta = meta.cotacoesMinimas > 0 ? (buyer.performance.cotacoesRealizadas / meta.cotacoesMinimas) * 100 : 100;

  const economiaStatus = getMetricStatus(economiaVsMeta);
  const descontoStatus = getMetricStatus(descontoVsMeta);
  const cotacoesStatus = getMetricStatus(cotacoesVsMeta);

  const currentBuyerAlerts = [economiaStatus, descontoStatus, cotacoesStatus].filter(s => s.status !== 'success').length;

  // Merge radar data for comparison
  const comparisonRadarData = compareBuyer ? buyer.radar.map((item, index) => ({
    subject: item.subject,
    [buyer.nome]: item.value,
    [compareBuyer.nome]: compareBuyer.radar[index]?.value || 0,
    fullMark: 100
  })) : [];

  const comparisonHistorico = compareBuyer ? buyer.historico.map((item, index) => ({
    mes: item.mes,
    [`${buyer.nome} Economia`]: item.economia,
    [`${compareBuyer.nome} Economia`]: compareBuyer.historico[index]?.economia || 0,
  })) : [];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name?.includes('Economia') 
                ? `R$ ${(entry.value || 0).toLocaleString('pt-BR')}` 
                : entry.name?.includes('Desconto') 
                  ? `${entry.value}%`
                  : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Desempenho</h1>
            <p className="text-sm text-muted-foreground">
              {compareMode ? "Comparativo entre compradores" : "Análise detalhada de performance individual"}
              {' • '}{buyers.length} comprador{buyers.length !== 1 ? 'es' : ''} • Dados reais
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {buyers.length >= 2 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <GitCompare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Comparar</span>
                <Switch checked={compareMode} onCheckedChange={setCompareMode} />
              </div>
            )}
            
            <Select value={effectiveBuyerId} onValueChange={setSelectedBuyerId}>
              <SelectTrigger className="w-[180px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Comprador" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map(b => (
                  <SelectItem key={b.id} value={b.id} disabled={compareMode && b.id === effectiveCompareBuyerId}>
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {compareMode && compareBuyer && (
              <Select value={effectiveCompareBuyerId} onValueChange={setCompareBuyerId}>
                <SelectTrigger className="w-[180px]">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Comprador 2" />
                </SelectTrigger>
                <SelectContent>
                  {buyers.map(b => (
                    <SelectItem key={b.id} value={b.id} disabled={b.id === effectiveBuyerId}>
                      {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportBuyerCSV(buyer)}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <BuyerPerformanceAlerts />
          </div>
        </div>

        {/* Alert Banner */}
        {!compareMode && currentBuyerAlerts > 0 && (
          <Card className="p-4 border-yellow-500/50 bg-warning/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {buyer.nome} tem {currentBuyerAlerts} métrica{currentBuyerAlerts > 1 ? 's' : ''} abaixo da meta
                </p>
              </div>
            </div>
          </Card>
        )}

        {compareMode && compareBuyer ? (
          <BuyerComparisonView buyer={buyer} compareBuyer={compareBuyer} CustomTooltip={CustomTooltip} />
        ) : (
          // ============ INDIVIDUAL VIEW ============
          <>
            {/* Buyer Profile Card */}
            <Card className="p-6">
              <div className="flex items-start gap-6 flex-wrap">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                  {buyer.avatar}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-foreground">{buyer.nome}</h2>
                    <Badge variant="secondary">{buyer.cargo}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {buyer.departamento} • Desde {new Date(buyer.dataAdmissao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-6 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{buyer.performance.fornecedoresAtivos} fornecedores ativos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-muted-foreground">{buyer.performance.taxaSucesso}% taxa de sucesso</span>
                    </div>
                    {buyer.performance.tempoMedioNegociacao > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{buyer.performance.tempoMedioNegociacao} dias tempo médio</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={`p-4 ${economiaStatus.status === 'critical' ? 'border-destructive/50' : economiaStatus.status === 'warning' ? 'border-yellow-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-success">
                    <PiggyBank className="w-4 h-4" />
                    <span className="text-xs font-medium">Economia do Mês</span>
                  </div>
                  <MetricStatusIcon percentage={economiaVsMeta} />
                </div>
                <p className="text-2xl font-bold text-success">
                  R$ {buyer.performance.economiaMes.toLocaleString('pt-BR')}
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta: R$ {meta.economiaMensal.toLocaleString('pt-BR')}</span>
                    <span className={economiaStatus.color}>{economiaVsMeta.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(economiaVsMeta, 100)} className="h-1.5" />
                </div>
              </Card>

              <Card className={`p-4 ${descontoStatus.status === 'critical' ? 'border-destructive/50' : descontoStatus.status === 'warning' ? 'border-yellow-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-info">
                    <Percent className="w-4 h-4" />
                    <span className="text-xs font-medium">Desconto Médio</span>
                  </div>
                  <MetricStatusIcon percentage={descontoVsMeta} />
                </div>
                <p className="text-2xl font-bold text-info">{buyer.performance.descontoMedio}%</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta: {meta.descontoMedio}%</span>
                    <span className={descontoStatus.color}>{descontoVsMeta.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(descontoVsMeta, 100)} className="h-1.5" />
                </div>
              </Card>

              <Card className={`p-4 ${cotacoesStatus.status === 'critical' ? 'border-destructive/50' : cotacoesStatus.status === 'warning' ? 'border-yellow-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-purple-600">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-medium">Cotações Realizadas</span>
                  </div>
                  <MetricStatusIcon percentage={cotacoesVsMeta} />
                </div>
                <p className="text-2xl font-bold text-purple-600">{buyer.performance.cotacoesRealizadas}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Meta: {meta.cotacoesMinimas}</span>
                    <span className={cotacoesStatus.color}>{cotacoesVsMeta.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(cotacoesVsMeta, 100)} className="h-1.5" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-warning mb-2">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-medium">Taxa Melhor Preço</span>
                </div>
                <p className="text-2xl font-bold text-warning">{buyer.performance.melhorPrecoRate}%</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Frequência de escolha do melhor preço disponível
                </p>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Evolução Mensal
                </h3>
                {buyer.historico.some(h => h.economia > 0 || h.cotacoes > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={buyer.historico}>
                      <defs>
                        <linearGradient id="colorEconomiaBuyer" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}K`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="economia" stroke="hsl(142, 76%, 36%)" fill="url(#colorEconomiaBuyer)" strokeWidth={2} name="Economia (R$)" />
                      <Line yAxisId="right" type="monotone" dataKey="desconto" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2 }} name="Desconto (%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                    Sem dados de economia no período selecionado
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-warning" />
                  Perfil de Competências
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={buyer.radar}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name={buyer.nome} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Categories + Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Economia por Categoria
                </h3>
                {buyer.categorias.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={buyer.categorias} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="nome" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="economia" name="Economia (R$)" radius={[0, 4, 4, 0]}>
                        {buyer.categorias.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de categorias</p>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-success" />
                  Performance por Fornecedor
                </h3>
                {buyer.fornecedores.length > 0 ? (
                  <div className="space-y-4">
                    {buyer.fornecedores.map((item, index) => {
                      const maxPedidos = Math.max(...buyer.fornecedores.map(f => f.pedidos));
                      const progressValue = maxPedidos > 0 ? (item.pedidos / maxPedidos) * 100 : 0;
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{item.nome}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{item.pedidos} pedidos</span>
                              {item.desconto > 0 && <Badge variant="outline" className="text-xs">{item.desconto}%</Badge>}
                            </div>
                          </div>
                          <Progress value={progressValue} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de fornecedores</p>
                )}
              </Card>
            </div>

            {/* Últimas Negociações */}
            {buyer.ultimasNegociacoes.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-info" />
                  Últimas Negociações de Destaque
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Produto</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Desconto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Economia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyer.ultimasNegociacoes.map((neg, index) => (
                        <tr key={index} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-foreground truncate max-w-[200px]">{neg.produto}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(neg.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="outline" className="text-info border-info/20">
                              <ArrowDownRight className="w-3 h-3 mr-1" />
                              {neg.percentual}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-success flex items-center justify-end gap-1">
                              <ArrowUpRight className="w-4 h-4" />
                              R$ {neg.economia.toLocaleString('pt-BR')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Annual Summary */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Economia Total no Ano</h3>
                  <p className="text-sm text-muted-foreground">Resultados acumulados de {buyer.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    R$ {buyer.performance.economiaAno.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default BuyerPerformanceDashboard;
