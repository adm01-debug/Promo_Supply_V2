import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SLABySupplierAnalysis } from "@/components/compras/SLABySupplierAnalysis";
import { AdvancedProcurementKPIs } from "@/components/compras/AdvancedProcurementKPIs";
import { DemandPredictionPanel } from "@/components/compras/DemandPredictionPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/exportData";
import { toast } from "sonner";
import { subMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  KPICards,
  VolumeChart,
  SavingsChart,
  DistributionCharts,
  SupplierPerformanceTable,
} from "./relatorios/RelatoriosCharts";

const PERIOD_MAP: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };

const getDateRange = (periodo: string) => {
  const months = PERIOD_MAP[periodo] || 6;
  return subMonths(new Date(), months).toISOString();
};

const Relatorios = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [activeTab, setActiveTab] = useState("geral");
  const dateFrom = useMemo(() => getDateRange(periodo), [periodo]);

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

  const stats = useMemo(() => {
    const peds = pedidos || [];
    const sols = solicitacoes || [];
    const forns = fornecedores || [];

    const totalVolume = peds.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    const totalPedidos = peds.length;

    const totalEstimado = sols.reduce((s, sol) => s + (Number(sol.valor_estimado) || 0), 0);
    const totalAprovado = sols.reduce((s, sol) => s + (Number(sol.valor_aprovado) || 0), 0);
    const economiaTotal = totalEstimado > totalAprovado ? totalEstimado - totalAprovado : 0;
    const economiaPct = totalEstimado > 0 ? (economiaTotal / totalEstimado) * 100 : 0;

    const fornAtivos = forns.length;
    const fornBemAvaliados = forns.filter(f => (f.avaliacao || 0) >= 4).length;

    const monthlyMap = new Map<string, { volume: number; pedidos: number }>();
    peds.forEach(p => {
      const key = format(parseISO(p.data_emissao), "MMM/yy", { locale: ptBR });
      const existing = monthlyMap.get(key) || { volume: 0, pedidos: 0 };
      existing.volume += Number(p.valor_total || 0);
      existing.pedidos += 1;
      monthlyMap.set(key, existing);
    });
    const volumeMensal = Array.from(monthlyMap, ([mes, d]) => ({ mes, volume: d.volume, pedidos: d.pedidos }));

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

    const statusMap = new Map<string, number>();
    peds.forEach(p => statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1));
    const STATUS_LABELS: Record<string, string> = {
      pendente: "Pendente", aprovado: "Aprovado", enviado: "Enviado",
      em_transito: "Em Trânsito", entregue: "Entregue", cancelado: "Cancelado", parcial: "Parcial",
    };
    const distribuicaoStatus = Array.from(statusMap, ([name, value]) => ({
      name: STATUS_LABELS[name] || name, value,
    }));

    const tipoMap = new Map<string, number>();
    sols.forEach(s => tipoMap.set(s.tipo || "outro", (tipoMap.get(s.tipo || "outro") || 0) + 1));
    const TIPO_LABELS: Record<string, string> = {
      material: "Material", servico: "Serviço", emergencia: "Emergência",
    };
    const distribuicaoTipo = Array.from(tipoMap, ([name, value]) => ({
      name: TIPO_LABELS[name] || name, value,
    }));

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
  }, [pedidos, solicitacoes, fornecedores]);

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

  return (
    <MainLayout>
      <div className="space-y-6">
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
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={loadingPedidos}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

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
            <KPICards stats={stats} isLoading={loadingPedidos} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VolumeChart data={stats.volumeMensal} />
              <SavingsChart data={stats.economiaMensal} economiaPct={stats.economiaPct} />
            </div>

            <DistributionCharts
              distribuicaoTipo={stats.distribuicaoTipo}
              distribuicaoStatus={stats.distribuicaoStatus}
            />

            <SLABySupplierAnalysis />
            <SupplierPerformanceTable data={stats.fornecedorPerformance} />
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
