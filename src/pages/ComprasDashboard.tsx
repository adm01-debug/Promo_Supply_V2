import { 
  ClipboardList, 
  DollarSign, 
  Clock, 
  Truck, 
  CheckCircle2, 
  TrendingUp,
  AlertTriangle,
  Timer,
  BarChart3,
  PiggyBank,
  Percent,
  Target,
  Award
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/compras/KpiCard";
import { PipelineChart } from "@/components/compras/PipelineChart";
import { UrgentItemsList } from "@/components/compras/UrgentItemsList";
import { SLADistributionChart } from "@/components/compras/SLADistributionChart";
import { SLAPerformanceDashboard } from "@/components/compras/SLAPerformanceDashboard";
import { CriticalAlertsBar } from "@/components/compras/CriticalAlertsBar";
import { SupplierAlertsPanel } from "@/components/compras/SupplierAlertsPanel";
import { SupplierRankingPanel } from "@/components/compras/SupplierRankingPanel";
import { BuyerPerformancePanel } from "@/components/compras/BuyerPerformancePanel";
import { SavingsGoalPanel } from "@/components/compras/SavingsGoalPanel";
import { PurchaseClimateWidget } from "@/components/compras/PurchaseClimateWidget";
import { DeliveryCalendar } from "@/components/compras/DeliveryCalendar";
import { DashboardCustomizer } from "@/components/compras/DashboardCustomizer";
import { kpisMock, pipelineMock, itensUrgentesMock, buyerPerformanceMock } from "@/data/mockData";
import { MainLayout } from "@/components/compras/MainLayout";
import { useDashboardLayoutStore } from "@/stores/dashboardLayoutStore";
import { cn } from "@/lib/utils";

const ComprasDashboard = () => {
  const { widgets } = useDashboardLayoutStore();
  
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const visibleWidgets = sortedWidgets.filter(w => w.visible);

  const getWidgetComponent = (widgetId: string) => {
    switch (widgetId) {
      case 'kpi-aguardando':
        return (
          <KpiCard
            title="Aguard. Cotação"
            value={kpisMock.aguardandoCotacao}
            icon={ClipboardList}
            color="emerald"
          />
        );
      case 'kpi-volume':
        return (
          <KpiCard
            title="Volume Mês"
            value={`R$ ${(kpisMock.volumeMes / 1000).toFixed(0)}K`}
            icon={TrendingUp}
            color="cyan"
            subtitle="Total em compras"
          />
        );
      case 'kpi-economia':
        return (
          <KpiCard
            title="Economia Gerada"
            value={`R$ ${(buyerPerformanceMock.economiaGerada / 1000).toFixed(1)}K`}
            icon={PiggyBank}
            color="emerald"
            subtitle={`${buyerPerformanceMock.economiaPercentual}% do volume`}
          />
        );
      case 'kpi-sla':
        return (
          <KpiCard
            title="Taxa Entrega"
            value={`${kpisMock.taxaEntrega}%`}
            icon={BarChart3}
            color="teal"
            subtitle="No prazo"
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
            <PipelineChart data={pipelineMock} />
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
                Itens Urgentes
              </h2>
              <Link to="/solicitacoes" className="text-sm text-primary hover:underline">Ver Todos</Link>
            </div>
            <UrgentItemsList items={itensUrgentesMock} />
          </Card>
        );
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

  // Separate KPIs and other widgets
  const kpiWidgets = visibleWidgets.filter(w => w.type === 'kpi');
  const otherWidgets = visibleWidgets.filter(w => w.type !== 'kpi');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Critical Alerts */}
        <CriticalAlertsBar />
        
        {/* Page Title + Climate Widget + Customizer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Visão geral do sistema de compras</p>
            </div>
            <DashboardCustomizer />
          </div>
          <PurchaseClimateWidget />
        </div>

        {/* KPIs Grid */}
        {kpiWidgets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiWidgets.map(widget => (
              <div key={widget.id}>
                {getWidgetComponent(widget.id)}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {otherWidgets.map(widget => (
            <div 
              key={widget.id} 
              className={cn(getGridClasses(widget.size))}
            >
              {getWidgetComponent(widget.id)}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ComprasDashboard;
