import { useState, lazy, Suspense, useCallback, memo, useEffect, useRef, useMemo } from "react";
import { 
  ClipboardList, 
  Clock, 
  TrendingUp,
  BarChart3,
  PiggyBank,
  Filter,
  X,
  ChevronDown,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { MainLayout } from "@/components/compras/MainLayout";
import { FilterFavoritesManager } from "@/components/compras/FilterFavoritesManager";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useDashboardLayoutStore } from "@/stores/dashboardLayoutStore";
import { useAccountFilters } from "@/hooks/useAccountFilters";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";


// Lazy load heavy panels that are below the fold
const SLADistributionChart = lazy(() => import("@/components/compras/SLADistributionChart").then(m => ({ default: m.SLADistributionChart })));
const SupplierAlertsPanel = lazy(() => import("@/components/compras/SupplierAlertsPanel").then(m => ({ default: m.SupplierAlertsPanel })));
const SupplierRankingPanel = lazy(() => import("@/components/compras/SupplierRankingPanel").then(m => ({ default: m.SupplierRankingPanel })));
const BuyerPerformancePanel = lazy(() => import("@/components/compras/BuyerPerformancePanel").then(m => ({ default: m.BuyerPerformancePanel })));
const SavingsGoalPanel = lazy(() => import("@/components/compras/SavingsGoalPanel").then(m => ({ default: m.SavingsGoalPanel })));
const DeliveryCalendar = lazy(() => import("@/components/compras/DeliveryCalendar").then(m => ({ default: m.DeliveryCalendar })));
const DemandPredictionPanel = lazy(() => import("@/components/compras/DemandPredictionPanel").then(m => ({ default: m.DemandPredictionPanel })));
const RiskHeatMap = lazy(() => import("@/components/compras/RiskHeatMap").then(m => ({ default: m.RiskHeatMap })));
const DashboardInsights = lazy(() => import("@/components/compras/DashboardInsights").then(m => ({ default: m.DashboardInsights })));
const TrendAnalysisCharts = lazy(() => import("@/components/compras/TrendAnalysisCharts").then(m => ({ default: m.TrendAnalysisCharts })));
const ActiveSourcingWidget = lazy(() => import("@/components/compras/ActiveSourcingWidget").then(m => ({ default: m.ActiveSourcingWidget })));

const LazyPanel = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
    {children}
  </Suspense>
);

const ComprasDashboard = () => {
  const { t } = useTranslation();
  const { loadFromDb, saveToDb, widgets } = useDashboardLayoutStore();
  const { favorites, loading: filtersLoading, saveFavorite, deleteFavorite, setAsDefault, getDefaultFilter } = useDashboardFilters();

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

  const { kpis, pipeline, urgentItems, loading: kpisLoading } = useDashboardKPIs(currentFilters);
  const loading = kpisLoading || accountFiltersLoading;

  const [hasAppliedDefault, setHasAppliedDefault] = useState(false);

  useEffect(() => {
    if (hasAppliedDefault || favorites.length === 0 || accountFiltersLoading) return;
    const defaultFilter = getDefaultFilter();
    if (defaultFilter) {
      patchFilters({
        category: defaultFilter.category_filter || 'all',
        supplier: defaultFilter.supplier_filter || 'all',
        period: defaultFilter.period_filter || '6m',
        showComparison: defaultFilter.show_comparison ?? true,
      });
    }
    setHasAppliedDefault(true);
  }, [favorites.length, getDefaultFilter, hasAppliedDefault, accountFiltersLoading, patchFilters]);

  useEffect(() => {
    loadFromDb('compras');
  }, [loadFromDb]);

  const handleSaveLayout = useCallback(() => {
    saveToDb('compras');
  }, [saveToDb]);

  const { data: categories = [] } = useQuery({
    queryKey: ['dashboard-filter-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['dashboard-filter-suppliers'],
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
    patchFilters({
      category: 'all',
      supplier: 'all',
      period: '6m'
    });
  }, [patchFilters]);

  // Realtime with debounce to avoid excessive re-renders
  useRealtimeSubscription({
    tables: ['solicitacoes', 'pedidos', 'cotacoes', 'pagamentos', 'notifications', 'approval_workflows', 'approval_steps'],
    debounceMs: 2000,
  });

  const getWidgetComponent = useCallback((widgetId: string, index: number = 0) => {
    if (loading && ['kpi-aguardando', 'kpi-volume', 'kpi-economia', 'kpi-sla'].includes(widgetId)) {
      return <Skeleton className="h-32 w-full rounded-xl" />;
    }

    switch (widgetId) {
      case 'kpi-aguardando':
        return (
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
        );
      case 'kpi-volume':
        return (
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
        );
      case 'kpi-economia':
        return (
          <EnhancedKpiCard
            title={t('dashboard.kpis.saving')}
            value={kpis.economiaPercentual}
            previousValue={((kpis.comparisons.economia.previous / kpis.comparisons.volume.previous) * 100) || 0}
            sparklineData={kpis.comparisons.economia.sparkline}
            icon={PiggyBank}
            color="emerald"
            subtitle={`${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.economiaGerada)} economizados`}
            format="percent"
            variant="featured"
          />
        );
      case 'kpi-sla':
        return (
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
        );
      case 'chart-sla':
        return <LazyPanel><SLADistributionChart /></LazyPanel>;
      case 'chart-pipeline':
        return (
          <Card className="p-6 h-full">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Pipeline Visual
            </h2>
            <PipelineChart data={pipeline} previousData={(kpis as any).previousPipeline} />
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
      case 'supplier-alerts':
        return <LazyPanel><SupplierAlertsPanel /></LazyPanel>;
      case 'supplier-ranking':
        return <LazyPanel><SupplierRankingPanel /></LazyPanel>;
      case 'buyer-performance':
        return <LazyPanel><BuyerPerformancePanel /></LazyPanel>;
      case 'savings-goal':
        return <LazyPanel><SavingsGoalPanel /></LazyPanel>;
      case 'delivery-calendar':
        return <LazyPanel><DeliveryCalendar /></LazyPanel>;
      case 'urgent-items':
        return (
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-destructive" />
                Itens Urgentes ({urgentItems.length})
              </h2>
              <Link to="/solicitacoes" className="text-sm text-primary hover:underline">Ver Todos</Link>
            </div>
            {urgentItems.length > 0 ? (
              <UrgentItemsList 
                items={urgentItems.map(item => {
                  const now = new Date();
                  const diff = item.data_necessidade 
                    ? Math.ceil((new Date(item.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
                    : 5;
                  
                  return {
                    id: (item as any).numero || item.id.substring(0, 8),
                    dbId: item.id,
                    produto: (item as any).titulo || "Item sem título",
                    fornecedor: item.status || "Pendente",
                    vencimento: item.data_necessidade ? new Date(item.data_necessidade).toLocaleDateString('pt-BR') : 'TBD',
                    urgencia: diff <= 0 ? 'critico' : diff <= 1 ? 'alto' : 'medio',
                    comprador: (item as any).comprador
                  };
                })} 
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum item urgente detectado.</p>
            )}
          </Card>
        );
      case 'demand-prediction':
        return <LazyPanel><DemandPredictionPanel /></LazyPanel>;
      case 'risk-heatmap':
        return <LazyPanel><RiskHeatMap /></LazyPanel>;
      case 'dashboard-insights':
        return <LazyPanel><DashboardInsights /></LazyPanel>;
      case 'active-sourcing':
        return <LazyPanel><ActiveSourcingWidget /></LazyPanel>;
      default:
        return null;
    }
  }, [loading, kpis, pipeline, urgentItems, t]);

  const getGridClasses = useCallback((size: string) => {
    switch (size) {
      case 'small': return 'col-span-1 lg:col-span-1';
      case 'medium': return 'col-span-1 lg:col-span-1';
      case 'large': return 'col-span-1 lg:col-span-2';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        <CriticalAlertsBar />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">{t('dashboard.title')}</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 animate-pulse">Live</Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
              {t('common.welcome')} - Sistema atualizado em tempo real
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <FilterFavoritesManager
              favorites={favorites}
              currentFilters={currentFilters}
              onSave={saveFavorite}
              onDelete={deleteFavorite}
              onSetDefault={setAsDefault}
              onApply={(filter) => patchFilters({
                category: filter.category_filter || 'all',
                supplier: filter.supplier_filter || 'all',
                period: filter.period_filter || '6m',
                showComparison: filter.show_comparison ?? true,
              })}
              loading={filtersLoading}
            />
            <PurchaseClimateWidget />
          </div>
          </div>
        </div>

        <DraggableDashboard
          renderWidget={getWidgetComponent}
          getGridClasses={getGridClasses}
        />
      </div>
    </MainLayout>
  );
};

export default ComprasDashboard;
