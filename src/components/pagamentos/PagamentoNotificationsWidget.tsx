import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, DollarSign, Calendar, CheckCircle2 } from "lucide-react";
import { differenceInDays } from "date-fns/differenceInDays";
import { format } from "date-fns/format";
import type { Pagamento } from "@/hooks/usePagamentos";

interface Props {
  pagamentos: Pagamento[];
}

interface Notificacao {
  id: string;
  icon: typeof Bell;
  message: string;
  priority: 'critical' | 'high' | 'normal';
  color: string;
}

export const PagamentoNotificationsWidget = ({ pagamentos }: Props) => {
  const notifications = useMemo(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const pendentes = pagamentos.filter(p => !['pago', 'cancelado'].includes(p.status));
    const result: Notificacao[] = [];
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Vencidos
    const vencidos = pendentes.filter(p => p.data_vencimento < hojeStr);
    if (vencidos.length > 0) {
      const valor = vencidos.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
      result.push({
        id: 'vencidos', icon: AlertTriangle,
        message: `${vencidos.length} pagamento(s) vencido(s) — ${fmt(valor)}`,
        priority: 'critical', color: 'text-destructive',
      });
    }

    // Vencem hoje
    const venceHoje = pendentes.filter(p => p.data_vencimento === hojeStr);
    if (venceHoje.length > 0) {
      const valor = venceHoje.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
      result.push({
        id: 'hoje', icon: Calendar,
        message: `${venceHoje.length} pagamento(s) vence(m) hoje — ${fmt(valor)}`,
        priority: 'high', color: 'text-warning',
      });
    }

    // Vencem amanhã
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];
    const venceAmanha = pendentes.filter(p => p.data_vencimento === amanhaStr);
    if (venceAmanha.length > 0) {
      const valor = venceAmanha.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
      result.push({
        id: 'amanha', icon: Calendar,
        message: `${venceAmanha.length} pagamento(s) vence(m) amanhã — ${fmt(valor)}`,
        priority: 'normal', color: 'text-warning',
      });
    }

    // Vencem em 3 dias
    const vence3d = pendentes.filter(p => {
      const d = differenceInDays(new Date(p.data_vencimento), hoje);
      return d > 1 && d <= 3;
    });
    if (vence3d.length > 0) {
      const valor = vence3d.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
      result.push({
        id: '3dias', icon: Bell,
        message: `${vence3d.length} pagamento(s) nos próximos 3 dias — ${fmt(valor)}`,
        priority: 'normal', color: 'text-info',
      });
    }

    return result;
  }, [pagamentos]);

  if (notifications.length === 0) return null;

  return (
    <Card className="p-3 border-l-4 border-l-amber-500">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-4 w-4 text-warning" />
        <span className="text-sm font-semibold">Alertas de Pagamento</span>
        <Badge variant="secondary" className="text-xs">{notifications.length}</Badge>
      </div>
      <div className="space-y-1.5">
        {notifications.map(n => {
          const Icon = n.icon;
          return (
            <div key={n.id} className="flex items-center gap-2 text-sm">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${n.color}`} />
              <span className="text-muted-foreground">{n.message}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
