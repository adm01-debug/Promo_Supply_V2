import { useState } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  Download,
  PiggyBank,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { SavingsGoalPanel } from "@/components/compras/SavingsGoalPanel";
import { BuyerDrilldownModal } from "@/components/compras/BuyerDrilldownModal";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { useRelatorioNegociacoes, type Comprador } from "./useRelatorioNegociacoes";
import { exportToCSV } from "@/lib/exportData";
import { toast } from "@/lib/feedbackToast";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(340, 75%, 55%)",
  "hsl(180, 70%, 40%)",
  "hsl(50, 95%, 50%)",
];

const RelatorioNegociacoes = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [selectedBuyer, setSelectedBuyer] = useState<Comprador | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  const { data, isLoading } = useRelatorioNegociacoes(periodo);

  const historicoMensal = data?.historicoMensal ?? [];
  const comparativoCompradores = data?.comparativoCompradores ?? [];
  const economiaPorCategoria = data?.economiaPorCategoria ?? [];
  const economiaPorFornecedor = data?.economiaPorFornecedor ?? [];

  const totalEconomia = historicoMensal.reduce((acc, curr) => acc + curr.economia, 0);
  const mediaPercentual =
    historicoMensal.length > 0
      ? historicoMensal.reduce((acc, curr) => acc + curr.percentual, 0) / historicoMensal.length
      : 0;
  const totalCotacoes = historicoMensal.reduce((acc, curr) => acc + curr.cotacoes, 0);

  const handleBuyerClick = (comprador: Comprador) => {
    setSelectedBuyer(comprador);
    setDrilldownOpen(true);
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index: number) => (
            <p
              key={`${entry.dataKey ?? entry.name ?? index}`}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}:{" "}
              {String(entry.name ?? "").includes("R$") || entry.dataKey === "economia"
                ? `R$ ${Number(entry.value).toLocaleString("pt-BR")}`
                : entry.dataKey === "percentual"
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
    <ElitePageWrapper>
      <div className="space-y-6">
        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Período:</span>
            </div>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Último mês</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-2"
              disabled={isLoading}
              onClick={() => {
                if (comparativoCompradores.length === 0) {
                  toast.info("Nenhuma negociação no período para exportar.");
                  return;
                }
                exportToCSV(comparativoCompradores, [
                  { key: "nome", label: "Comprador" },
                  { key: "economia", label: "Economia (R$)" },
                  { key: "percentual", label: "Economia (%)" },
                  { key: "cotacoes", label: "Cotações" },
                  { key: "melhorPreco", label: "Melhor preço" },
                ], `relatorio-negociacoes-${periodo}`);
              }}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Economia Total</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {totalEconomia.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{mediaPercentual.toFixed(1)}% vs período anterior</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Economia Média</p>
                <p className="text-2xl font-bold mt-1">{mediaPercentual.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                  <Target className="h-3 w-3" />
                  <span>Meta: 12%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cotações</p>
                <p className="text-2xl font-bold mt-1">{totalCotacoes}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                  <Award className="h-3 w-3" />
                  <span>{data?.totalCotacoes ?? 0} no período</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compradores Ativos</p>
                <p className="text-2xl font-bold mt-1">{comparativoCompradores.length}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>Equipes envolvidas</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Savings Goal Panel */}
        <SavingsGoalPanel />

        {/* Histórico Mensal */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Histórico Mensal de Negociações</h3>
              <p className="text-sm text-muted-foreground">
                Evolução da economia obtida por mês
              </p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : historicoMensal.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhuma cotação encontrada no período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicoMensal}>
                <defs>
                  <linearGradient id="ecoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="economia"
                  name="Economia (R$)"
                  stroke="hsl(var(--primary))"
                  fill="url(#ecoGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Comparativo de Compradores + Categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Performance por Comprador</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Economia gerada e taxa de conversão
            </p>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : comparativoCompradores.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Sem dados de compradores.
              </div>
            ) : (
              <div className="space-y-4">
                {comparativoCompradores.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => handleBuyerClick(c)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      >
                        {c.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.cotacoes} cotações · melhor preço {c.melhorPreco}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          R$ {c.economia.toLocaleString("pt-BR")}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-xs">
                          {c.tendencia === "up" ? (
                            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                          )}
                          <span
                            className={
                              c.tendencia === "up" ? "text-emerald-600" : "text-red-500"
                            }
                          >
                            {c.percentual}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <Progress value={Math.min(100, c.percentual * 5)} className="h-1.5" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Economia por Categoria</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Distribuição por categoria de produto
            </p>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : economiaPorCategoria.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Sem dados por categoria.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={economiaPorCategoria}
                    dataKey="economia"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {economiaPorCategoria.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Fornecedor Bar Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">Top Fornecedores por Economia</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Fornecedores com maior volume de savings no período
          </p>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : economiaPorFornecedor.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados por fornecedor.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={economiaPorFornecedor} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="fornecedor"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={150}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="economia"
                  name="Economia (R$)"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <BuyerDrilldownModal
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        comprador={selectedBuyer as any}
      />
    </ElitePageWrapper>
  );
};

export default RelatorioNegociacoes;
