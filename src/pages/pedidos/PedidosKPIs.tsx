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
      title="Pedidos Globais"
      value={kpis.total}
      icon={FileText}
      delay={0}
      subtitle="Volume da Rede"
    />
    <ExecutiveMetricCard
      title="Aguardando Aprovação"
      value={kpis.pendentes}
      icon={Clock}
      delay={1}
      urgent={kpis.pendentes > 0 ? kpis.pendentes : 0}
      subtitle="Ações Críticas"
    />
    <ExecutiveMetricCard
      title="Trânsito Neural"
      value={kpis.emTransito}
      icon={Truck}
      delay={2}
      subtitle="Rastreio em Tempo Real"
    />
    <ExecutiveMetricCard
      title="Fulfillment"
      value={kpis.entregues}
      icon={CheckCircle2}
      delay={3}
      subtitle="Concluídos com Sucesso"
    />
    <ExecutiveMetricCard
      title="Volume Financeiro"
      value={kpis.valorTotal}
      icon={DollarSign}
      format="currency"
      delay={4}
      subtitle="Liquidez da Rede"
    />
  </div>
);