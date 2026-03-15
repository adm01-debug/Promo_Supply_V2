import { useState } from "react";
import { 
  ClipboardList, 
  Clock, 
  TrendingUp,
  BarChart3,
  PiggyBank
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { EnhancedKpiCard } from "@/components/compras/EnhancedKpiCard";
import { PipelineChart } from "@/components/compras/PipelineChart";
import { UrgentItemsList } from "@/components/compras/UrgentItemsList";
import { SLADistributionChart } from "@/components/compras/SLADistributionChart";
import { CriticalAlertsBar } from "@/components/compras/CriticalAlertsBar";
import { SupplierAlertsPanel } from "@/components/compras/SupplierAlertsPanel";
import { SupplierRankingPanel } from "@/components/compras/SupplierRankingPanel";
import { BuyerPerformancePanel } from "@/components/compras/BuyerPerformancePanel";
import { SavingsGoalPanel } from "@/components/compras/SavingsGoalPanel";
import { PurchaseClimateWidget } from "@/components/compras/PurchaseClimateWidget";
import { DeliveryCalendar } from "@/components/compras/DeliveryCalendar";
import { DraggableDashboard } from "@/components/compras/DraggableDashboard";
import { DemandPredictionPanel } from "@/components/compras/DemandPredictionPanel";
import { RiskHeatMap } from "@/components/compras/RiskHeatMap";
import { PageTransition } from "@/components/animations/MotionComponents";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { MainLayout } from "@/components/compras/MainLayout";
import { cn } from "@/lib/utils";
import { FilterFavoritesManager } from "@/components/compras/FilterFavoritesManager";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

const ComprasDashboard = () => {
  const { kpis, pipeline, urgentItems, loading } = useDashboardKPIs();
  const { favorites, loading: filtersLoading, saveFavorite, deleteFavorite, setAsDefault } = useDashboardFilters();
  const [currentFilters, setCurrentFilters] = useState({ category: 'all', supplier: 'all', period: '6m', showComparison: true });

  // Realtime: auto-refresh dashboard when data changes
  useRealtimeSubscription({
    tables: ['solicitacoes', 'pedidos', 'cotacoes', 'pagamentos', 'notifications'],
  });

  const getWidgetComponent = (widgetId: string, index: number = 0) => {
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
        return <SLADistributionChart />;
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
        return <SupplierAlertsPanel />;
      case 'supplier-ranking':
        return <SupplierRankingPanel />;
      case 'buyer-performance':
        return <BuyerPerformancePanel />;
      case 'savings-goal':
        return <SavingsGoalPanel />;
      case 'delivery-calendar':
        return <DeliveryCalendar />;
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
              <div className="space-y-2">
                {urgentItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-foreground truncate">{item.status}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.data_necessidade ? new Date(item.data_necessidade).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item urgente</p>
            )}
          </Card>
        );
      case 'demand-prediction':
        return <DemandPredictionPanel />;
      case 'risk-heatmap':
        return <RiskHeatMap />;
      default:
        return null;
    }
  };

  const getGridClasses = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 lg:col-span-1';
      case 'large': return 'col-span-1 lg:col-span-2';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  };

  return (
    <MainLayout>
      <PageTransition className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CriticalAlertsBar />
        </motion.div>
        
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div>
            <motion.h1 
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              Dashboard
            </motion.h1>
            <motion.p 
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Visão geral do sistema de compras
            </motion.p>
          </div>
          <motion.div
            className="w-full sm:w-auto sm:min-w-[320px] lg:min-w-[360px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <PurchaseClimateWidget />
          </motion.div>
        </motion.div>

        <DraggableDashboard
          renderWidget={getWidgetComponent}
          getGridClasses={getGridClasses}
        />
      </PageTransition>
    </MainLayout>
  );
};

export default ComprasDashboard;
