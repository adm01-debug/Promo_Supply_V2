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
import { kpisMock, pipelineMock, itensUrgentesMock, buyerPerformanceMock } from "@/data/mockData";
import { MainLayout } from "@/components/compras/MainLayout";

const ComprasDashboard = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Critical Alerts */}
        <CriticalAlertsBar />
        
        {/* Page Title + Climate Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do sistema de compras</p>
          </div>
          <PurchaseClimateWidget />
        </div>

        {/* KPIs Grid - Primeira linha */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Aguard. Cotação"
            value={kpisMock.aguardandoCotacao}
            icon={ClipboardList}
            color="emerald"
          />
          <KpiCard
            title="Aguard. Pagto"
            value={kpisMock.aguardandoPagamento}
            icon={DollarSign}
            color="orange"
          />
          <KpiCard
            title="Em Trânsito"
            value={kpisMock.emTransito}
            icon={Clock}
            color="blue"
          />
          <KpiCard
            title="Em Coleta"
            value={kpisMock.emColeta}
            icon={Truck}
            color="purple"
          />
          <KpiCard
            title="Finalizados"
            value={kpisMock.finalizados}
            icon={CheckCircle2}
            color="green"
          />
        </div>

        {/* KPIs Grid - Segunda linha (Operacionais) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Volume Mês"
            value={`R$ ${(kpisMock.volumeMes / 1000).toFixed(0)}K`}
            icon={TrendingUp}
            color="cyan"
            subtitle="Total em compras"
          />
          <KpiCard
            title="Atrasados"
            value={kpisMock.atrasados}
            icon={AlertTriangle}
            color="red"
            highlight={kpisMock.atrasados > 0}
          />
          <KpiCard
            title="Lead Time"
            value={`${kpisMock.leadTime}d`}
            icon={Timer}
            color="indigo"
            subtitle="Média"
          />
          <KpiCard
            title="Taxa Entrega"
            value={`${kpisMock.taxaEntrega}%`}
            icon={BarChart3}
            color="teal"
            subtitle="No prazo"
          />
        </div>

        {/* KPIs Grid - Terceira linha (Performance do Comprador) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Economia Gerada"
            value={`R$ ${(buyerPerformanceMock.economiaGerada / 1000).toFixed(1)}K`}
            icon={PiggyBank}
            color="emerald"
            subtitle={`${buyerPerformanceMock.economiaPercentual}% do volume`}
          />
          <KpiCard
            title="Desconto Médio"
            value={`${buyerPerformanceMock.descontoMedio}%`}
            icon={Percent}
            color="blue"
            subtitle={`${buyerPerformanceMock.cotacoesNegociadas} cotações`}
          />
          <KpiCard
            title="Melhor Preço"
            value={`${buyerPerformanceMock.melhorPrecoRate}%`}
            icon={Target}
            color="purple"
            subtitle="Taxa de acerto"
          />
          <KpiCard
            title="Valor Negociado"
            value={`R$ ${(buyerPerformanceMock.valorNegociado / 1000).toFixed(0)}K`}
            icon={Award}
            color="orange"
            subtitle="Total do mês"
          />
        </div>

        {/* SLA Distribution + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SLADistributionChart />
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Pipeline Visual
            </h2>
            <PipelineChart data={pipelineMock} />
          </Card>
        </div>

        {/* SLA Performance + Supplier Alerts + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SLAPerformanceDashboard />
          </div>
          <SupplierAlertsPanel />
          <SupplierRankingPanel />
        </div>

        {/* Delivery Calendar */}
        <div className="grid grid-cols-1 gap-6">
          <DeliveryCalendar />
        </div>

        {/* Buyer Performance + Savings Goal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BuyerPerformancePanel />
          <SavingsGoalPanel />
        </div>

        {/* Itens Urgentes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-destructive" />
              Itens Urgentes
            </h2>
            <Link to="/solicitacoes" className="text-sm text-primary hover:underline">Ver Todos</Link>
          </div>
          <UrgentItemsList items={itensUrgentesMock} />
        </Card>
      </div>
    </MainLayout>
  );
};

export default ComprasDashboard;
