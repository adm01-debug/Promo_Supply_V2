import { useState, useEffect } from "react";
import { Bell, BellRing, AlertTriangle, AlertCircle, CheckCircle2, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useBuyerAlertsStore,
  BuyerAlert,
  checkBuyerPerformance,
  getMetricLabel,
  formatMetricValue
} from "@/stores/buyerAlertsStore";
import { useBuyerPerformanceData } from "@/hooks/useBuyerPerformanceData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const AlertIcon = ({ type }: { type: BuyerAlert['type'] }) => {
  switch (type) {
    case 'critical': return <AlertCircle className="w-4 h-4 text-destructive" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'success': return <CheckCircle2 className="w-4 h-4 text-success" />;
  }
};

const getAlertBgClass = (type: BuyerAlert['type'], read: boolean) => {
  if (read) return 'bg-muted/30';
  switch (type) {
    case 'critical': return 'bg-destructive/10 border-l-2 border-l-destructive';
    case 'warning': return 'bg-warning/10 border-l-2 border-l-yellow-500';
    case 'success': return 'bg-success/10 border-l-2 border-l-green-500';
  }
};

export const BuyerPerformanceAlerts = () => {
  const { targets, alerts, addAlert, markAlertAsRead, markAllAlertsAsRead, clearAlerts, getUnreadCount } = useBuyerAlertsStore();
  const { buyers } = useBuyerPerformanceData(6);
  const [open, setOpen] = useState(false);
  const unreadCount = getUnreadCount();

  // Check performance using REAL data
  useEffect(() => {
    if (buyers.length === 0) return;

    const checkAllBuyers = () => {
      buyers.forEach(buyer => {
        const target = targets.find(t => t.buyerId === buyer.id);
        if (!target || !target.enabled) return;

        const metrics: Array<{ metric: 'economia' | 'desconto' | 'cotacoes'; current: number; targetVal: number }> = [
          { metric: 'economia', current: buyer.performance.economiaMes, targetVal: target.economiaMensal },
          { metric: 'desconto', current: buyer.performance.descontoMedio, targetVal: target.descontoMedio },
          { metric: 'cotacoes', current: buyer.performance.cotacoesRealizadas, targetVal: target.cotacoesMinimas },
        ];

        metrics.forEach(({ metric, current, targetVal }) => {
          const check = checkBuyerPerformance(buyer.id, buyer.nome, current, targetVal, metric, target);
          if (check.shouldAlert) {
            addAlert({
              buyerId: buyer.id,
              buyerName: buyer.nome,
              metric,
              metricLabel: getMetricLabel(metric),
              type: check.status as 'warning' | 'critical',
              message: `${buyer.nome} está ${check.status === 'critical' ? 'muito abaixo' : 'abaixo'} da meta de ${getMetricLabel(metric).toLowerCase()}`,
              currentValue: current,
              targetValue: targetVal,
              percentage: check.percentage
            });
          }
        });
      });
    };

    checkAllBuyers();
    const interval = setInterval(checkAllBuyers, 300000);
    return () => clearInterval(interval);
  }, [targets, addAlert, buyers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          {unreadCount > 0 ? <BellRing className="w-4 h-4 text-warning" /> : <Bell className="w-4 h-4" />}
          <span className="ml-2 hidden sm:inline">Alertas</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold">Alertas de Performance</h3>
          </div>
          {alerts.length > 0 && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={markAllAlertsAsRead}>
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAlerts}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-3 text-success/50" />
              <p className="text-sm font-medium">Nenhum alerta</p>
              <p className="text-xs">Todos os compradores estão dentro das metas</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${getAlertBgClass(alert.type, alert.read)}`}
                  onClick={() => markAlertAsRead(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <AlertIcon type={alert.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{alert.buyerName}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{alert.metricLabel}</Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Atual: <strong className={alert.type === 'critical' ? 'text-destructive' : 'text-warning'}>{formatMetricValue(alert.metric, alert.currentValue)}</strong></span>
                        <span>Meta: <strong>{formatMetricValue(alert.metric, alert.targetValue)}</strong></span>
                        <span>({alert.percentage.toFixed(0)}%)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!alert.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {alerts.length > 0 && (
          <>
            <Separator />
            <div className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {unreadCount} alerta{unreadCount !== 1 ? 's' : ''} não lido{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
