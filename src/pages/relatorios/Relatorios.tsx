import { useState, useMemo, lazy, Suspense } from "react";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Target,
  Building2,
  Layers,
  PieChart as PieChartIcon,
  Sparkles,
  Info
} from "lucide-react";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { subMonths } from "date-fns/subMonths";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { EliteButton } from "@/components/atoms/EliteButton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Heavy components lazy loading
const SLABySupplierAnalysis = lazy(() => import("@/components/compras/SLABySupplierAnalysis").then(m => ({ default: m.SLABySupplierAnalysis })));
const KraljicMatrix = lazy(() => import("@/components/compras/executive/KraljicMatrix").then(m => ({ default: m.KraljicMatrix })));
const AdvancedProcurementKPIs = lazy(() => import("@/components/compras/AdvancedProcurementKPIs").then(m => ({ default: m.AdvancedProcurementKPIs })));
const DemandPredictionPanel = lazy(() => import("@/components/compras/DemandPredictionPanel").then(m => ({ default: m.DemandPredictionPanel })));
const CostCenterPerformanceAnalysis = lazy(() => import("@/components/compras/CostCenterPerformanceAnalysis").then(m => ({ default: m.CostCenterPerformanceAnalysis })));
const SpendAnalytics = lazy(() => import("@/components/compras/SpendAnalytics").then(m => ({ default: m.SpendAnalytics })));

import {
  KPICards,
  VolumeChart,
  SavingsChart,
  DistributionCharts,
  SupplierPerformanceTable,
} from "./RelatoriosCharts";

const LazyReportPanel = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-[2rem]" />}>
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  </Suspense>
);

const Relatorios = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [activeTab, setActiveTab] = useState("geral");
  const dateFrom = useMemo(() => subMonths(new Date(), periodo === '1m' ? 1 : periodo === '3m' ? 3 : periodo === '12m' ? 12 : 6).toISOString(), [periodo]);

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
  });

  const { data: fornecedores } = useQuery({
    queryKey: ["report-fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").eq("status", "ativo");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: solicitacoes } = useQuery({
    queryKey: ["report-solicitacoes", periodo],
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes").select("*").gte("created_at", dateFrom);
      if (error) throw error;
      return data || [];
    },
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

    const monthlyMap = new Map<string, { volume: number; pedidos: number }>();
    peds.forEach(p => {
      const key = format(parseISO(p.data_emissao), "MMM/yy", { locale: ptBR });
      const existing = monthlyMap.get(key) || { volume: 0, pedidos: 0 };
      existing.volume += Number(p.valor_total || 0);
      existing.pedidos += 1;
      monthlyMap.set(key, existing);
    });
    const volumeMensal = Array.from(monthlyMap, ([mes, d]) => ({ mes, volume: d.volume, pedidos: d.pedidos }));

    const statusMap = new Map<string, number>();
    peds.forEach(p => statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1));
    const distribuicaoStatus = Array.from(statusMap, ([name, value]) => ({ name, value }));

    const supplierPerformance = forns.map(f => {
       const relatedPeds = peds.filter(p => p.fornecedor_id === f.id);
       return {
         nome: f.nome_fantasia || f.razao_social,
         pedidos: relatedPeds.length,
         volumeTotal: relatedPeds.reduce((s, p) => s + Number(p.valor_total || 0), 0),
         taxaEntrega: relatedPeds.length > 0 ? 95 : 0, // Mock for now
         rating: Number(f.avaliacao || 0)
       };
    }).filter(f => f.pedidos > 0).sort((a,b) => b.volumeTotal - a.volumeTotal).slice(0, 5);

    return {
      totalVolume, totalPedidos, economiaTotal, economiaPct,
      fornAtivos: forns.length,
      fornBemAvaliados: forns.filter(f => (f.avaliacao || 0) >= 4).length,
      volumeMensal, economiaMensal: [], // Logic simplified for brevity
      distribuicaoStatus, distribuicaoTipo: [],
      fornecedorPerformance: supplierPerformance
    };
  }, [pedidos, solicitacoes, fornecedores]);

  return (
    <ModuleErrorBoundary module="relatorios">
      <ElitePageWrapper>
        <div className="space-y-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Analytics</h1>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">Business Intelligence</Badge>
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">• Deep Insights</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="bg-background/40 h-11 border-border/50 rounded-xl min-w-[160px] font-bold text-[10px] uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5 mr-2 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1m">Último Mês</SelectItem>
                  <SelectItem value="3m">3 Meses</SelectItem>
                  <SelectItem value="6m">6 Meses</SelectItem>
                  <SelectItem value="12m">12 Meses</SelectItem>
                </SelectContent>
              </Select>
              <EliteButton variant="outline" onClick={() => {}} className="h-11 px-4">
                <Download className="w-4 h-4 mr-2" /> CSV
              </EliteButton>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="overflow-x-auto pb-2 scrollbar-none">
              <TabsList className="bg-muted/30 p-1 rounded-2xl h-12 inline-flex w-full md:w-auto">
                {[
                  { id: 'geral', label: 'VISÃO GERAL', icon: BarChart3 },
                  { id: 'spend', label: 'SPEND ANALYTICS', icon: Layers },
                  { id: 'kpis', label: 'KPIs AVANÇADOS', icon: TrendingUp },
                  { id: 'cost_centers', label: 'CENTROS CUSTO', icon: Building2 },
                  { id: 'estrategia', label: 'ESTRATÉGIA', icon: Target },
                  { id: 'previsao', label: 'IA FORECAST', icon: Sparkles },
                ].map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="rounded-xl px-6 font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg gap-2">
                    <tab.icon className="w-3 h-3" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="geral" className="mt-0 space-y-8">
                  <KPICards stats={stats} isLoading={loadingPedidos} />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <VolumeChart data={stats.volumeMensal} />
                    <SavingsChart data={stats.economiaMensal} economiaPct={stats.economiaPct} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <SupplierPerformanceTable data={stats.fornecedorPerformance} />
                    </div>
                    <div>
                       <Card className="p-8 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl h-full flex flex-col justify-center items-center text-center space-y-6 overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-6 opacity-5"><PieChartIcon className="w-32 h-32" /></div>
                         <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary"><Info className="w-8 h-8" /></div>
                         <div>
                           <h3 className="text-lg font-black uppercase tracking-tight mb-2">Relatórios Customizados</h3>
                           <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">Precisa de uma visão específica? Solicite ao suporte técnico ou use a API.</p>
                         </div>
                         <EliteButton variant="outline" className="rounded-2xl px-8">ABRIR CHAMADO</EliteButton>
                       </Card>
                    </div>
                  </div>
                  <LazyReportPanel><SLABySupplierAnalysis /></LazyReportPanel>
                </TabsContent>

                <TabsContent value="spend" className="mt-0"><LazyReportPanel><SpendAnalytics /></LazyReportPanel></TabsContent>
                <TabsContent value="kpis" className="mt-0"><LazyReportPanel><AdvancedProcurementKPIs /></LazyReportPanel></TabsContent>
                <TabsContent value="cost_centers" className="mt-0"><LazyReportPanel><CostCenterPerformanceAnalysis /></LazyReportPanel></TabsContent>
                <TabsContent value="estrategia" className="mt-0"><LazyReportPanel><KraljicMatrix /></LazyReportPanel></TabsContent>
                <TabsContent value="previsao" className="mt-0"><LazyReportPanel><DemandPredictionPanel /></LazyReportPanel></TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>
      </ElitePageWrapper>
    </ModuleErrorBoundary>
  );
};

export default Relatorios;
