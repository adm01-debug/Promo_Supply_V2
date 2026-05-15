import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Download,
  PiggyBank,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { MainLayout } from "@/features/layout/components/MainLayout";
import { BuyerDrilldownModal } from "@/components/compras/BuyerDrilldownModal";
import { SavingsGoalPanel } from "@/components/compras/SavingsGoalPanel";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import {
  historicoMensal,
  comparativoCompradores,
  economiaPorCategoria,
  economiaPorFornecedor,
  COLORS,
  type CompradorType,
} from './relatorio-negociacoes/relatorioNegociacoesData';

const RelatorioNegociacoes = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [selectedBuyer, setSelectedBuyer] = useState<CompradorType | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  const handleBuyerClick = (comprador: typeof comparativoCompradores[0]) => {
    setSelectedBuyer(comprador);
    setDrilldownOpen(true);
  };

  const totalEconomia = historicoMensal.reduce((acc, curr) => acc + curr.economia, 0);
  const mediaPercentual = historicoMensal.reduce((acc, curr) => acc + curr.percentual, 0) / historicoMensal.length;
  const totalCotacoes = historicoMensal.reduce((acc, curr) => acc + curr.cotacoes, 0);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {String(entry.name).includes('R$') || entry.dataKey === 'economia' 
                ? `R$ ${Number(entry.value).toLocaleString('pt-BR')}` 
                : entry.dataKey === 'percentual' 
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatório de Negociações</h1>
            <p className="text-sm text-muted-foreground">Análise detalhada de performance e economia nas negociações</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
                <SelectItem value="ytd">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-emerald-500/20">
            <div className="flex items-center gap-2 text-success mb-1">
              <PiggyBank className="w-4 h-4" />
              <span className="text-xs font-medium">Economia Total</span>
            </div>
            <p className="text-2xl font-bold text-success">
              R$ {totalEconomia.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-success" />
              +18% vs período anterior
            </p>
          </Card>

          <Card className="p-4 border-blue-500/20">
            <div className="flex items-center gap-2 text-info mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">Desconto Médio</span>
            </div>
            <p className="text-2xl font-bold text-info">
              {mediaPercentual.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-success" />
              +2.1pp vs período anterior
            </p>
          </Card>

          <Card className="p-4 border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">Cotações Negociadas</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {totalCotacoes}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-success" />
              +12 vs período anterior
            </p>
          </Card>

          <Card className="p-4 border-amber-500/20">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Compradores Ativos</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              {comparativoCompradores.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              com negociações no período
            </p>
          </Card>
        </div>

        {/* Savings Goal Panel */}
        <SavingsGoalPanel />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Savings Trend */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução da Economia Mensal
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={historicoMensal}>
                <defs>
                  <linearGradient id="colorEconomia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="economia" 
                  stroke="hsl(142, 76%, 36%)" 
                  fill="url(#colorEconomia)"
                  strokeWidth={2}
                  name="Economia (R$)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Savings Rate Trend */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-info" />
              Taxa de Desconto por Mês
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={historicoMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="percentual" 
                  stroke="hsl(221, 83%, 53%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2 }}
                  name="Taxa de Desconto"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Buyer Comparison */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Comparativo entre Compradores
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparativoCompradores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}K`} />
                <YAxis type="category" dataKey="nome" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="economia" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Economia (R$)" />
              </BarChart>
            </ResponsiveContainer>

            {/* Ranking Table */}
            <div className="space-y-3">
              {comparativoCompradores.map((comprador, index) => (
                <div 
                  key={index} 
                  onClick={() => handleBuyerClick(comprador)}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {comprador.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{comprador.nome}</span>
                      {comprador.tendencia === 'up' ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-destructive" />
                      )}
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>{comprador.cotacoes} cotações</span>
                      <span>{comprador.melhorPreco}% melhor preço</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">R$ {comprador.economia.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">{comprador.percentual}% desconto</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Clique em um comprador para ver detalhes
              </p>
            </div>
          </div>
        </Card>

        {/* Category and Supplier Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Pie Chart */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-warning" />
              Economia por Categoria
            </h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={economiaPorCategoria}
                    dataKey="economia"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {economiaPorCategoria.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {economiaPorCategoria.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-foreground">{item.categoria}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-foreground">
                        R$ {item.economia.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.percentual}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Supplier Savings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-success" />
              Economia por Fornecedor
            </h2>
            <div className="space-y-4">
              {economiaPorFornecedor.map((item, index) => {
                const maxEconomia = Math.max(...economiaPorFornecedor.map(f => f.economia));
                const progressValue = (item.economia / maxEconomia) * 100;
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{item.fornecedor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.negociacoes} negociações</span>
                        <span className="text-sm font-bold text-success">
                          R$ {item.economia.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Buyer Drilldown Modal */}
      <BuyerDrilldownModal 
        open={drilldownOpen} 
        onOpenChange={setDrilldownOpen} 
        comprador={selectedBuyer} 
      />
    </MainLayout>
  );
};

export default RelatorioNegociacoes;
