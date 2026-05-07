import { useState, lazy, Suspense, useCallback, memo } from "react";
import { 
  ClipboardList, 
  Clock, 
  TrendingUp,
  BarChart3,
  PiggyBank
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
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

// Lazy load heavy panels that are below the fold
const SLADistributionChart = lazy(() => import("@/components/compras/SLADistributionChart").then(m => ({ default: m.SLADistributionChart })));
const SupplierAlertsPanel = lazy(() => import("@/components/compras/SupplierAlertsPanel").then(m => ({ default: m.SupplierAlertsPanel })));
const SupplierRankingPanel = lazy(() => import("@/components/compras/SupplierRankingPanel").then(m => ({ default: m.SupplierRankingPanel })));
const BuyerPerformancePanel = lazy(() => import("@/components/compras/BuyerPerformancePanel").then(m => ({ default: m.BuyerPerformancePanel })));
const SavingsGoalPanel = lazy(() => import("@/components/compras/SavingsGoalPanel").then(m => ({ default: m.SavingsGoalPanel })));
const DeliveryCalendar = lazy(() => import("@/components/compras/DeliveryCalendar").then(m => ({ default: m.DeliveryCalendar })));
const DemandPredictionPanel = lazy(() => import("@/components/compras/DemandPredictionPanel").then(m => ({ default: m.DemandPredictionPanel })));
const RiskHeatMap = lazy(() => import("@/components/compras/RiskHeatMap").then(m => ({ default: m.RiskHeatMap })));

const LazyPanel = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
    {children}
  </Suspense>
);

const ComprasDashboard = () => {
  const { kpis, pipeline, urgentItems, loading } = useDashboardKPIs();
  const { favorites, loading: filtersLoading, saveFavorite, deleteFavorite, setAsDefault } = useDashboardFilters();
  const [currentFilters, setCurrentFilters] = useState({ category: 'all', supplier: 'all', period: '6m', showComparison: true });

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
            title="Aguard. Cotação"
            value={kpis.aguardandoCotacao}
            icon={ClipboardList}
            color="emerald"
            format="number"
            variant="default"
          />
        );
      case 'kpi-volume':
        return (
          <EnhancedKpiCard
            title="Volume Mês"
            value={kpis.volumeMes}
            icon={TrendingUp}
            color="cyan"
            subtitle="Total em compras"
            format="currency"
            variant="default"
          />
        );
      case 'kpi-economia':
        return (
          <EnhancedKpiCard
            title="Economia Gerada"
            value={kpis.economiaGerada}
            icon={PiggyBank}
            color="emerald"
            subtitle={`${kpis.economiaPercentual}% do volume`}
            format="currency"
            variant="default"
          />
        );
      case 'kpi-sla':
        return (
          <EnhancedKpiCard
            title="Taxa Entrega"
            value={kpis.taxaEntrega}
            icon={BarChart3}
            color="teal"
            subtitle="No prazo"
            format="percent"
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
            <PipelineChart data={pipeline} />
          </Card>
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
                    produto: (item as any).titulo || "Item sem título",
                    fornecedor: item.status || "Pendente",
                    vencimento: item.data_necessidade ? new Date(item.data_necessidade).toLocaleDateString('pt-BR') : 'TBD',
                    urgencia: diff <= 1 ? 'critico' : diff <= 3 ? 'alto' : 'medio'
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
      default:
        return null;
    }
  }, [loading, kpis, pipeline, urgentItems]);

  const getGridClasses = useCallback((size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 lg:col-span-1';
      case 'large': return 'col-span-1 lg:col-span-2';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  }, []);

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <CriticalAlertsBar />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral do sistema de compras
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <FilterFavoritesManager
              favorites={favorites}
              currentFilters={currentFilters}
              onSave={saveFavorite}
              onDelete={deleteFavorite}
              onSetDefault={setAsDefault}
              onApply={(filter) => setCurrentFilters({
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

        <DraggableDashboard
          renderWidget={getWidgetComponent}
          getGridClasses={getGridClasses}
        />
      </div>
    </MainLayout>
  );
};

export default ComprasDashboard;
