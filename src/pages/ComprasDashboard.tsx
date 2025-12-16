import { 
  ClipboardList, 
  DollarSign, 
  Clock, 
  Truck, 
  CheckCircle2, 
  TrendingUp,
  AlertTriangle,
  Timer,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/compras/KpiCard";
import { PipelineChart } from "@/components/compras/PipelineChart";
import { UrgentItemsList } from "@/components/compras/UrgentItemsList";
import { kpisMock, pipelineMock, itensUrgentesMock } from "@/data/mockData";
import { MainLayout } from "@/components/compras/MainLayout";

const ComprasDashboard = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do sistema de compras</p>
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

        {/* KPIs Grid - Segunda linha */}
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

        {/* Pipeline Visual */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Pipeline Visual
          </h2>
          <PipelineChart data={pipelineMock} />
        </Card>

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
