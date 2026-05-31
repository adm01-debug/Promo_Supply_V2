import { useState, lazy, Suspense, useCallback, memo, useEffect, useMemo } from "react";
import { 
  ClipboardList, 
  Clock, 
  TrendingUp,
  BarChart3,
  PiggyBank,
  Filter,
  X,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { InteractiveCard } from "@/components/ui/interactive-card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnhancedKpiCard } from "@/components/compras/EnhancedKpiCard";
import { PipelineChart } from "@/components/compras/PipelineChart";
import { UrgentItemsList } from "@/components/compras/UrgentItemsList";
import { CriticalAlertsBar } from "@/components/compras/CriticalAlertsBar";
import { PurchaseClimateWidget } from "@/components/compras/PurchaseClimateWidget";
import { DraggableDashboard } from "@/components/compras/DraggableDashboard";
import { useDashboardKPIs, type DashboardKPIsExtended } from "@/hooks/useDashboardKPIs";
import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary";
import { FilterFavoritesManager } from "@/components/compras/FilterFavoritesManager";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useDashboardLayoutStore } from "@/stores/dashboardLayoutStore";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { performanceMonitor } from "@/lib/performance";
import { EliteButton } from "@/components/atoms/EliteButton";
import { EliteCardGrid } from "@/components/organisms/EliteCardGrid";
import { formatCurrency } from "@/lib/utils";

// Lazy load heavy panels
const SLADistributionChart = lazy(() => import("@/components/compras/SLADistributionChart").then(m => ({ default: m.SLADistributionChart })));
const TrendAnalysisCharts = lazy(() => import("@/components/compras/TrendAnalysisCharts").then(m => ({ default: m.TrendAnalysisCharts })));
const SupplierAlertsPanel = lazy(() => import("@/components/compras/SupplierAlertsPanel").then(m => ({ default: m.SupplierAlertsPanel })));
const SupplierRankingPanel = lazy(() => import("@/components/compras/SupplierRankingPanel").then(m => ({ default: m.SupplierRankingPanel })));
const BuyerPerformancePanel = lazy(() => import("@/components/compras/BuyerPerformancePanel").then(m => ({ default: m.BuyerPerformancePanel })));
const SavingsGoalPanel = lazy(() => import("@/components/compras/SavingsGoalPanel").then(m => ({ default: m.SavingsGoalPanel })));
const DeliveryCalendar = lazy(() => import("@/components/compras/DeliveryCalendar").then(m => ({ default: m.DeliveryCalendar })));
const DemandPredictionPanel = lazy(() => import("@/components/compras/DemandPredictionPanel").then(m => ({ default: m.DemandPredictionPanel })));
const RiskHeatMap = lazy(() => import("@/components/compras/RiskHeatMap").then(m => ({ default: m.RiskHeatMap })));
const DashboardInsights = lazy(() => import("@/components/compras/DashboardInsights").then(m => ({ default: m.DashboardInsights })));
const ActiveSourcingWidget = lazy(() => import("@/components/compras/ActiveSourcingWidget").then(m => ({ default: m.ActiveSourcingWidget })));
const SourcingIntelligenceWidget = lazy(() => import("@/components/compras/SourcingIntelligenceWidget").then(m => ({ default: m.SourcingIntelligenceWidget })));

const LazyPanel = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Skeleton variant="card" />}>
    {children}
  </Suspense>
);

const ComprasDashboard = () => {
  const { t } = useTranslation();
  const { loadFromDb, saveToDb } = useDashboardLayoutStore();
  const filterDefaults = useMemo(() => ({
    category: 'all',
    supplier: 'all',
    period: '6m',
    showComparison: true
  }), []);

  const {
    filters: currentFilters,
    patchFilters,
    loading: accountFiltersLoading
  } = useAccountFilters('compras-dashboard', filterDefaults);

  const { kpis, pipeline, urgentItems, loading: kpisLoading } = useDashboardKPIs(currentFilters) as { kpis: DashboardKPIsExtended; pipeline: any; urgentItems: any[]; loading: boolean };
  const loading = kpisLoading || accountFiltersLoading;

  useEffect(() => {
    loadFromDb('compras');
  }, [loadFromDb]);

  const { data: categories = [] } = useQuery({
    queryKey: ['dashboard-filter-categories', currentFilters.category],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['dashboard-filter-suppliers', currentFilters.supplier],
    queryFn: async () => {
      const { data, error } = await supabase.from('fornecedores').select('id, razao_social').eq('status', 'ativo').order('razao_social');
      if (error) throw error;
      return data;
    }
  });

  const hasActiveFilters = currentFilters.category !== 'all' || 
                          currentFilters.supplier !== 'all' || 
                          currentFilters.period !== '6m';

  const clearFilters = useCallback(() => {
    patchFilters({ category: 'all', supplier: 'all', period: '6m' });
  }, [patchFilters]);

  useRealtimeSubscription({
    tables: ['solicitacoes', 'pedidos', 'cotacoes', 'pagamentos'],
    debounceMs: 2000,
  });

  const getWidgetComponent = useCallback((widgetId: string) => {
    if (loading) return <Skeleton variant="card" />;

    switch (widgetId) {
      case 'kpi-aguardando':
        return (
          <InteractiveCard>
            <EnhancedKpiCard
              title={t('dashboard.kpis.pending_approval')}
              value={kpis.comparisons.aguardando.current}
              previousValue={kpis.comparisons.aguardando.previous}
              sparklineData={kpis.comparisons.aguardando.sparkline}
              icon={ClipboardList}
              color="orange"
              format="number"
              variant="default"
              subtitle={t('dashboard.kpis.subtitles.pending')}
            />
          </InteractiveCard>
        );
      case 'kpi-volume':
        return (
          <InteractiveCard>
            <EnhancedKpiCard
              title={t('dashboard.kpis.total_spend')}
              value={kpis.comparisons.volume.current}
              previousValue={kpis.comparisons.volume.previous}
              sparklineData={kpis.comparisons.volume.sparkline}
              icon={TrendingUp}
              color="blue"
              subtitle={t('dashboard.kpis.subtitles.volume')}
              format="currency"
              variant="default"
            />
          </InteractiveCard>
        );
      case 'kpi-economia':
        return (
          <InteractiveCard>
            <EnhancedKpiCard
              title={t('dashboard.kpis.saving')}
              value={kpis.economiaPercentual}
              previousValue={((kpis.comparisons.economia.previous / kpis.comparisons.volume.previous) * 100) || 0}
              sparklineData={kpis.comparisons.economia.sparkline}
              icon={PiggyBank}
              color="emerald"
              subtitle={`${formatCurrency(kpis.economiaGerada)} economizados`}
              format="percent"
              variant="featured"
            />
          </InteractiveCard>
        );
      case 'kpi-sla':
        return (
          <InteractiveCard>
            <EnhancedKpiCard
              title="Nível de Serviço (SLA)"
              value={kpis.comparisons.sla.current}
              previousValue={kpis.comparisons.sla.previous}
              sparklineData={kpis.comparisons.sla.sparkline}
              icon={BarChart3}
              color="indigo"
              subtitle={`${kpis.avgSla} dias (média) | ${kpis.comparisons.sla.current}% no prazo`}
              format="number"
              variant="default"
            />
          </InteractiveCard>
        );
      case 'chart-pipeline':
        return (
          <Card className="p-6 h-full border-border/40 bg-card/50 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 uppercase tracking-tight">
              <BarChart3 className="w-5 h-5 text-primary" />
              Fluxo Visual de Pedidos
            </h2>
            <PipelineChart data={pipeline} previousData={(kpis as any).previousPipeline} />
          </Card>
        );
      case 'urgent-items':
        return (
          <Card className="p-6 h-full border-border/40 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                <Clock className="w-5 h-5 text-destructive" />
                Urgências Detectadas ({urgentItems.length})
              </h2>
              <EliteButton variant="ghost" size="sm" onClick={() => {}}>
                VER TUDO
              </EliteButton>
            </div>
            {urgentItems.length > 0 ? (
              <UrgentItemsList items={urgentItems.map((item: any) => ({
                id: item.numero || item.id.substring(0, 8),
                dbId: item.id,
                produto: item.titulo || "Item sem título",
                fornecedor: item.status || "Análise Pendente",
                vencimento: item.data_necessidade ? new Date(item.data_necessidade).toLocaleDateString('pt-BR') : 'TBD',
                urgencia: item.urgencia || 'alto',
                comprador: item.comprador
              }))} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum item urgente detectado.</p>
            )}
          </Card>
        );
      case 'trend-charts':
        return (
          <LazyPanel>
            <TrendAnalysisCharts 
              monthlyTrends={kpis.charts.monthlyTrends}
              cotacaoStatus={kpis.charts.cotacaoStatus}
              topCategories={kpis.charts.topCategories}
            />
          </LazyPanel>
        );
      case 'supplier-alerts': return <LazyPanel><SupplierAlertsPanel /></LazyPanel>;
      case 'supplier-ranking': return <LazyPanel><SupplierRankingPanel /></LazyPanel>;
      case 'buyer-performance': return <LazyPanel><BuyerPerformancePanel /></LazyPanel>;
      case 'savings-goal': return <LazyPanel><SavingsGoalPanel /></LazyPanel>;
      case 'delivery-calendar': return <LazyPanel><DeliveryCalendar /></LazyPanel>;
      case 'demand-prediction': return <LazyPanel><DemandPredictionPanel /></LazyPanel>;
      case 'risk-heatmap': return <LazyPanel><RiskHeatMap /></LazyPanel>;
      case 'dashboard-insights': return <LazyPanel><DashboardInsights /></LazyPanel>;
      case 'active-sourcing': return <LazyPanel><ActiveSourcingWidget /></LazyPanel>;
      case 'sourcing-intelligence': return <LazyPanel><SourcingIntelligenceWidget /></LazyPanel>;
      default: return null;
    }
  }, [loading, kpis, pipeline, urgentItems, t]);

  return (
    <ModuleErrorBoundary module="dashboard">
      <div className="space-y-8 pb-10">
        <CriticalAlertsBar />
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6 bg-card/40 p-8 rounded-[2rem] border border-border/40 backdrop-blur-xl shadow-2xl shadow-primary/5"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">{t('dashboard.title')}</h1>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-2 opacity-80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Centro de Inteligência de Suprimentos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <PurchaseClimateWidget />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Período</Label>
              <Select value={currentFilters.period} onValueChange={(v) => patchFilters({ period: v })}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl hover:bg-background/60 transition-all">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="1m">Último Mês</SelectItem>
                  <SelectItem value="3m">Últimos 3 Meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 Meses</SelectItem>
                  <SelectItem value="1y">Último Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Categoria</Label>
              <Select value={currentFilters.category} onValueChange={(v) => patchFilters({ category: v })}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl hover:bg-background/60 transition-all">
                  <Filter className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Fornecedor</Label>
              <Select value={currentFilters.supplier} onValueChange={(v) => patchFilters({ supplier: v })}>
                <SelectTrigger className="bg-background/40 h-12 border-border/50 rounded-xl hover:bg-background/60 transition-all">
                  <Filter className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="all">Todos os Fornecedores</SelectItem>
                  {suppliers.map((sup: any) => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <AnimatePresence>
                {hasActiveFilters && (
                  <EliteButton 
                    variant="ghost" 
                    onClick={clearFilters}
                    className="w-full text-xs font-bold text-muted-foreground hover:text-destructive h-12"
                  >
                    <X className="w-4 h-4 mr-2" />
                    LIMPAR FILTROS
                  </EliteButton>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <EliteCardGrid columns={4} className="mb-8">
          {['kpi-aguardando', 'kpi-volume', 'kpi-economia', 'kpi-sla'].map(id => (
            <div key={id}>{getWidgetComponent(id)}</div>
          ))}
        </EliteCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {getWidgetComponent('chart-pipeline')}
            {getWidgetComponent('trend-charts')}
            {getWidgetComponent('sourcing-intelligence')}
            {getWidgetComponent('dashboard-insights')}
          </div>
          <div className="space-y-8">
            {getWidgetComponent('urgent-items')}
          </div>
        </div>
      </div>
    </ModuleErrorBoundary>
  );
};

export default memo(ComprasDashboard);
