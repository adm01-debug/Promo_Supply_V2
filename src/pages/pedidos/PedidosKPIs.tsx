import { ExecutiveMetricCard } from "@/components/compras/executive/ExecutiveMetricCard";
import { FileText, Clock, Truck, CheckCircle2, DollarSign } from "lucide-react";

interface KPIs {
  total: number;
  pendentes: number;
  emTransito: number;
  entregues: number;
  valorTotal: number;
}

export const PedidosKPIs = ({ kpis }: { kpis: KPIs }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" data-tour="pedidos-kpis">
    <ExecutiveMetricCard
      title="Global Orders"
      value={kpis.total}
      icon={FileText}
      delay={0}
      subtitle="Network Volume"
    />
    <ExecutiveMetricCard
      title="Pending Approval"
      value={kpis.pendentes}
      icon={Clock}
      delay={1}
      urgent={kpis.pendentes > 0 ? kpis.pendentes : 0}
      subtitle="Critical Actions"
    />
    <ExecutiveMetricCard
      title="Neural Transit"
      value={kpis.emTransito}
      icon={Truck}
      delay={2}
      subtitle="Real-time Tracking"
    />
    <ExecutiveMetricCard
      title="Fulfillment"
      value={kpis.entregues}
      icon={CheckCircle2}
      delay={3}
      subtitle="Successfully Completed"
    />
    <ExecutiveMetricCard
      title="Network Volume"
      value={kpis.valorTotal}
      icon={DollarSign}
      format="currency"
      delay={4}
      subtitle="Financial Liquidity"
    />
  </div>
);