import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Building2,
  Calendar,
  Download,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Star,
} from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SLABySupplierAnalysis } from "@/components/compras/SLABySupplierAnalysis";
import { AdvancedProcurementKPIs } from "@/components/compras/AdvancedProcurementKPIs";
import { DemandPredictionPanel } from "@/components/compras/DemandPredictionPanel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  TooltipProps,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/exportData";
import { toast } from "sonner";
import { subMonths, format, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIOD_MAP: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };
const PIE_COLORS = ["hsl(var(--primary))", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

// ── Helpers ──
const getDateRange = (periodo: string) => {
  const months = PERIOD_MAP[periodo] || 6;
  return subMonths(new Date(), months).toISOString();
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-foreground text-sm">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number"
            ? entry.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : entry.value}
        </p>
      ))}
    </div>
  );
};

// ── Component ──
const Relatorios = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [activeTab, setActiveTab] = useState("geral");
  const dateFrom = useMemo(() => getDateRange(periodo), [periodo]);

  // ── Pedidos ──
  const { data: pedidos, isLoading: loadingPedidos } = useQuery({
    queryKey: ["report-pedidos", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, status, valor_total, data_emissao, fornecedor_id, data_previsao, data_entrega")
        .gte("created_at", dateFrom)
        .order("data_emissao", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 120000,
  });

  // ── Fornecedores ──
  const { data: fornecedores } = useQuery({
    queryKey: ["report-fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, razao_social, nome_fantasia, avaliacao, status")
        .eq("status", "ativo");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  // ── Cotações (economia) ──
  const { data: cotacoes } = useQuery({
    queryKey: ["report-cotacoes", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("id, valor_total, selecionada, desconto_percentual, solicitacao_id, created_at")
        .gte("created_at", dateFrom);
      if (error) throw error;
      return data || [];
    },
    staleTime: 120000,
  });

  // ── Solicitações (valor_estimado vs valor_aprovado) ──
  const { data: solicitacoes } = useQuery({
    queryKey: ["report-solicitacoes", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("id, valor_estimado, valor_aprovado, status, created_at, tipo")
        .gte("created_at", dateFrom);
      if (error) throw error;
      return data || [];
    },
    staleTime: 120000,
  });

  // ── Computed Data ──
  const stats = useMemo(() => {
    const peds = pedidos || [];
    const cots = cotacoes || [];
    const sols = solicitacoes || [];
    const forns = fornecedores || [];

    const totalVolume = peds.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    const totalPedidos = peds.length;

    // Economia from estimado vs aprovado
    const totalEstimado = sols.reduce((s, sol) => s + (Number(sol.valor_estimado) || 0), 0);
    const totalAprovado = sols.reduce((s, sol) => s + (Number(sol.valor_aprovado) || 0), 0);
    const economiaTotal = totalEstimado > totalAprovado ? totalEstimado - totalAprovado : 0;
    const economiaPct = totalEstimado > 0 ? (economiaTotal / totalEstimado) * 100 : 0;

    const fornAtivos = forns.length;
    const fornBemAvaliados = forns.filter(f => (f.avaliacao || 0) >= 4).length;

    // Monthly volume chart
    const monthlyMap = new Map<string, { volume: number; pedidos: number }>();
    peds.forEach(p => {
      const key = format(parseISO(p.data_emissao), "MMM/yy", { locale: ptBR });
      const existing = monthlyMap.get(key) || { volume: 0, pedidos: 0 };
      existing.volume += Number(p.valor_total || 0);
      existing.pedidos += 1;
      monthlyMap.set(key, existing);
    });
    const volumeMensal = Array.from(monthlyMap, ([mes, d]) => ({ mes, volume: d.volume, pedidos: d.pedidos }));

    // Monthly savings
    const savingsMap = new Map<string, { economia: number; count: number }>();
    sols.forEach(s => {
      if (!s.valor_estimado || !s.valor_aprovado) return;
      const est = Number(s.valor_estimado);
      const apr = Number(s.valor_aprovado);
      if (est <= apr) return;
      const key = format(parseISO(s.created_at), "MMM/yy", { locale: ptBR });
      const existing = savingsMap.get(key) || { economia: 0, count: 0 };
      existing.economia += est - apr;
      existing.count += 1;
      savingsMap.set(key, existing);
    });
    const economiaMensal = Array.from(savingsMap, ([mes, d]) => ({ mes, economia: d.economia }));

    // Status distribution (pedidos)
    const statusMap = new Map<string, number>();
    peds.forEach(p => statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1));
    const STATUS_LABELS: Record<string, string> = {
      pendente: "Pendente", aprovado: "Aprovado", enviado: "Enviado",
      em_transito: "Em Trânsito", entregue: "Entregue", cancelado: "Cancelado", parcial: "Parcial",
    };
    const distribuicaoStatus = Array.from(statusMap, ([name, value]) => ({
      name: STATUS_LABELS[name] || name, value,
    }));

    // Tipo distribution (solicitações)
    const tipoMap = new Map<string, number>();
    sols.forEach(s => tipoMap.set(s.tipo || "outro", (tipoMap.get(s.tipo || "outro") || 0) + 1));
    const TIPO_LABELS: Record<string, string> = {
      material: "Material", servico: "Serviço", emergencia: "Emergência",
    };
    const distribuicaoTipo = Array.from(tipoMap, ([name, value]) => ({
      name: TIPO_LABELS[name] || name, value,
    }));

    // Supplier performance
    const supplierPedidos = new Map<string, { pedidos: number; volumeTotal: number; onTime: number; total: number }>();
    peds.forEach(p => {
      const existing = supplierPedidos.get(p.fornecedor_id) || { pedidos: 0, volumeTotal: 0, onTime: 0, total: 0 };
      existing.pedidos += 1;
      existing.volumeTotal += Number(p.valor_total || 0);
      if (p.status === "entregue") {
        existing.total += 1;
        if (p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao) {
          existing.onTime += 1;
        }
      }
      supplierPedidos.set(p.fornecedor_id, existing);
    });

    const fornecedorPerformance = forns
      .map(f => {
        const sp = supplierPedidos.get(f.id) || { pedidos: 0, volumeTotal: 0, onTime: 0, total: 0 };
        return {
          nome: f.nome_fantasia || f.razao_social,
          pedidos: sp.pedidos,
          volumeTotal: sp.volumeTotal,
          taxaEntrega: sp.total > 0 ? Math.round((sp.onTime / sp.total) * 100) : 0,
          rating: Number(f.avaliacao || 0),
        };
      })
      .filter(f => f.pedidos > 0)
      .sort((a, b) => b.volumeTotal - a.volumeTotal)
      .slice(0, 10);

    return {
      totalVolume, totalPedidos, economiaTotal, economiaPct,
      fornAtivos, fornBemAvaliados,
      volumeMensal, economiaMensal, distribuicaoStatus, distribuicaoTipo,
      fornecedorPerformance,
    };
  }, [pedidos, cotacoes, solicitacoes, fornecedores]);

  // ── Export Handler ──
  const handleExport = () => {
    if (!pedidos?.length) {
      toast.error("Sem dados para exportar");
      return;
    }
    const fornMap = new Map(fornecedores?.map(f => [f.id, f.nome_fantasia || f.razao_social]) || []);
    const exportData = pedidos.map(p => ({
      numero: p.numero,
      status: p.status,
      fornecedor: fornMap.get(p.fornecedor_id) || p.fornecedor_id,
      valor_total: p.valor_total,
      data_emissao: p.data_emissao,
      data_previsao: p.data_previsao || "",
      data_entrega: p.data_entrega || "",
    }));
    exportToCSV(exportData, [
      { key: "numero", label: "Número" },
      { key: "status", label: "Status" },
      { key: "fornecedor", label: "Fornecedor" },
      { key: "valor_total", label: "Valor Total", formatter: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
      { key: "data_emissao", label: "Data Emissão" },
      { key: "data_previsao", label: "Previsão" },
      { key: "data_entrega", label: "Entrega" },
    ], `relatorio_pedidos_${periodo}`);
    toast.success("Relatório exportado com sucesso!");
  };

  const isLoading = loadingPedidos;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Relatórios e Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise de performance, volume de compras e economia gerada
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Último mês</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isLoading}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto p-1">
            <TabsTrigger value="geral" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Visão</span> Geral
            </TabsTrigger>
            <TabsTrigger value="kpis" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              KPIs
            </TabsTrigger>
            <TabsTrigger value="previsao" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Previsão</span> IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="mt-6">
            <AdvancedProcurementKPIs />
          </TabsContent>

          <TabsContent value="geral" className="mt-6 space-y-6">
            {/* KPI Cards */}
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Card className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Volume Total</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                        R$ {(stats.totalVolume / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{stats.totalPedidos} pedidos</p>
                    </div>
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                    </div>
                  </div>
                </Card>

                <Card className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Pedidos</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{stats.totalPedidos}</p>
                      <p className="text-xs text-muted-foreground mt-1">no período</p>
                    </div>
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 sm:w-6 sm:h-6 text-info" />
                    </div>
                  </div>
                </Card>

                <Card className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Economia</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                        R$ {(stats.economiaTotal / 1000).toFixed(0)}K
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-success text-xs">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{stats.economiaPct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
                    </div>
                  </div>
                </Card>

                <Card className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Fornecedores</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">{stats.fornAtivos}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.fornBemAvaliados} ★≥4
                      </p>
                    </div>
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volume de Compras */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Volume de Compras</h3>
                    <p className="text-sm text-muted-foreground">Evolução mensal do volume</p>
                  </div>
                  <Badge variant="outline">Mensal</Badge>
                </div>
                <div className="h-72">
                  {stats.volumeMensal.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.volumeMensal}>
                        <defs>
                          <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorVolume)" name="Volume (R$)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Sem dados de pedidos no período
                    </div>
                  )}
                </div>
              </Card>

              {/* Economia Mensal */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Economia Gerada</h3>
                    <p className="text-sm text-muted-foreground">Economia por cotações competitivas</p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-emerald-500/20">
                    {stats.economiaPct.toFixed(1)}%
                  </Badge>
                </div>
                <div className="h-72">
                  {stats.economiaMensal.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.economiaMensal}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="economia" fill="#10b981" radius={[4, 4, 0, 0]} name="Economia (R$)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Sem dados de economia no período
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Distributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Distribuição por Tipo</h3>
                    <p className="text-sm text-muted-foreground">Solicitações por tipo de compra</p>
                  </div>
                  <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="h-64">
                  {stats.distribuicaoTipo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.distribuicaoTipo} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {stats.distribuicaoTipo.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Distribuição por Status</h3>
                    <p className="text-sm text-muted-foreground">Pedidos por estágio do pipeline</p>
                  </div>
                  <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="h-64">
                  {stats.distribuicaoStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.distribuicaoStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {stats.distribuicaoStatus.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados</div>
                  )}
                </div>
              </Card>
            </div>

            {/* SLA Analysis */}
            <SLABySupplierAnalysis />

            {/* Supplier Performance Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Performance de Fornecedores</h3>
                  <p className="text-sm text-muted-foreground">Ranking por volume e entrega no período</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fornecedor</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Pedidos</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Volume Total</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Taxa Entrega</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.fornecedorPerformance.length > 0 ? (
                      stats.fornecedorPerformance.map((f, idx) => (
                        <tr key={f.nome} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground ${
                                idx === 0 ? "bg-warning" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-warning" : "bg-muted-foreground/30"
                              }`}>
                                {idx + 1}
                              </div>
                              <span className="font-medium text-foreground">{f.nome}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge variant="secondary">{f.pedidos}</Badge>
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-foreground">
                            R$ {f.volumeTotal.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Progress value={f.taxaEntrega} className="h-2 flex-1" />
                              <span className="text-sm font-medium text-foreground w-12 text-right">{f.taxaEntrega}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {Array.from({ length: Math.round(f.rating) }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                          Sem dados de fornecedores no período
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="previsao" className="mt-6">
            <DemandPredictionPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Relatorios;
