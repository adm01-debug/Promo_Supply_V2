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
import { KpiCard } from "@/components/compras/KpiCard";
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
import { PageTransition } from "@/components/animations/MotionComponents";
import { kpisMock, pipelineMock, itensUrgentesMock, buyerPerformanceMock, kpiSparklineData } from "@/data/mockData";
import { MainLayout } from "@/components/compras/MainLayout";
import { cn } from "@/lib/utils";

const ComprasDashboard = () => {
  const getWidgetComponent = (widgetId: string, index: number = 0) => {
    switch (widgetId) {
      case 'kpi-aguardando':
        return (
          <KpiCard
            title="Aguard. Cotação"
            value={kpisMock.aguardandoCotacao}
            icon={ClipboardList}
            color="emerald"
            index={index}
            sparklineData={kpiSparklineData.aguardandoCotacao}
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
            index={index}
            sparklineData={kpiSparklineData.volumeMes}
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
            index={index}
            sparklineData={kpiSparklineData.economia}
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
            index={index}
            sparklineData={kpiSparklineData.taxaEntrega}
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

  return (
    <MainLayout>
      <PageTransition className="space-y-6">
        {/* Critical Alerts */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CriticalAlertsBar />
        </motion.div>
        
        {/* Page Title + Climate Widget */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="lg:col-span-2 flex items-start justify-between">
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
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <PurchaseClimateWidget />
          </motion.div>
        </motion.div>

        {/* Draggable Dashboard with Widgets */}
        <DraggableDashboard
          renderWidget={getWidgetComponent}
          getGridClasses={getGridClasses}
        />
      </PageTransition>
    </MainLayout>
  );
};

export default ComprasDashboard;
