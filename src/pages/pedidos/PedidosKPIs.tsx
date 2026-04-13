import { Card } from "@/components/ui/card";
import { FileText, Clock, Truck, CheckCircle2, DollarSign } from "lucide-react";

interface KPIs {
  total: number;
  pendentes: number;
  emTransito: number;
  entregues: number;
  valorTotal: number;
}

export const PedidosKPIs = ({ kpis }: { kpis: KPIs }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-tour="pedidos-kpis">
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div>
        <div><p className="text-2xl font-bold text-foreground">{kpis.total}</p><p className="text-xs text-muted-foreground">Total Pedidos</p></div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-warning/10"><Clock className="w-5 h-5 text-warning" /></div>
        <div><p className="text-2xl font-bold text-warning">{kpis.pendentes}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10"><Truck className="w-5 h-5 text-purple-500" /></div>
        <div><p className="text-2xl font-bold text-purple-600">{kpis.emTransito}</p><p className="text-xs text-muted-foreground">Em Trânsito</p></div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="w-5 h-5 text-success" /></div>
        <div><p className="text-2xl font-bold text-success">{kpis.entregues}</p><p className="text-xs text-muted-foreground">Entregues</p></div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><DollarSign className="w-5 h-5 text-success" /></div>
        <div><p className="text-lg font-bold text-success">R$ {(kpis.valorTotal / 1000).toFixed(1)}K</p><p className="text-xs text-muted-foreground">Valor Total</p></div>
      </div>
    </Card>
  </div>
);
