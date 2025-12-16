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
  Bell,
  Settings,
  User,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/compras/KpiCard";
import { PipelineChart } from "@/components/compras/PipelineChart";
import { UrgentItemsList } from "@/components/compras/UrgentItemsList";
import { kpisMock, pipelineMock, itensUrgentesMock } from "@/data/mockData";

const ComprasDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Sistema de Compras</h1>
              <p className="text-xs text-muted-foreground">Promo Brindes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                3
              </span>
            </button>
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Comprador</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
            <button className="text-sm text-primary hover:underline">Ver Todos</button>
          </div>
          <UrgentItemsList items={itensUrgentesMock} />
        </Card>
      </main>
    </div>
  );
};

export default ComprasDashboard;
