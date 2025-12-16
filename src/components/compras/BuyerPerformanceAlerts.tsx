import { useState, useEffect } from "react";
import { Bell, BellRing, AlertTriangle, AlertCircle, CheckCircle2, User, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock buyer data for checking performance
const buyersPerformanceData = [
  {
    id: "ana-silva",
    nome: "Ana Silva",
    performance: { economiaMes: 8750, descontoMedio: 12.3, cotacoesRealizadas: 45 },
    meta: { economiaMensal: 10000, descontoMedio: 12, cotacoesMinimas: 40 }
  },
  {
    id: "carlos-souza",
    nome: "Carlos Souza",
    performance: { economiaMes: 6200, descontoMedio: 10.5, cotacoesRealizadas: 38 },
    meta: { economiaMensal: 8000, descontoMedio: 10, cotacoesMinimas: 35 }
  },
  {
    id: "maria-santos",
    nome: "Maria Santos",
    performance: { economiaMes: 5800, descontoMedio: 9.8, cotacoesRealizadas: 42 },
    meta: { economiaMensal: 6000, descontoMedio: 8, cotacoesMinimas: 30 }
  },
  {
    id: "pedro-lima",
    nome: "Pedro Lima",
    performance: { economiaMes: 4500, descontoMedio: 8.2, cotacoesRealizadas: 30 },
    meta: { economiaMensal: 7000, descontoMedio: 9, cotacoesMinimas: 32 }
  }
];

const AlertIcon = ({ type }: { type: BuyerAlert['type'] }) => {
  switch (type) {
    case 'critical':
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
};

const getAlertBgClass = (type: BuyerAlert['type'], read: boolean) => {
  if (read) return 'bg-muted/30';
  switch (type) {
    case 'critical': return 'bg-destructive/10 border-l-2 border-l-destructive';
    case 'warning': return 'bg-yellow-500/10 border-l-2 border-l-yellow-500';
    case 'success': return 'bg-green-500/10 border-l-2 border-l-green-500';
  }
};

export const BuyerPerformanceAlerts = () => {
  const { targets, alerts, addAlert, markAlertAsRead, markAllAlertsAsRead, clearAlerts, getUnreadCount } = useBuyerAlertsStore();
  const [open, setOpen] = useState(false);
  const unreadCount = getUnreadCount();

  // Check performance and generate alerts on mount and periodically
  useEffect(() => {
    const checkAllBuyers = () => {
      buyersPerformanceData.forEach(buyer => {
        const target = targets.find(t => t.buyerId === buyer.id);
        if (!target || !target.enabled) return;

        // Check economia
        const economiaCheck = checkBuyerPerformance(
          buyer.id,
          buyer.nome,
          buyer.performance.economiaMes,
          target.economiaMensal,
          'economia',
          target
        );
        if (economiaCheck.shouldAlert) {
          addAlert({
            buyerId: buyer.id,
            buyerName: buyer.nome,
            metric: 'economia',
            metricLabel: getMetricLabel('economia'),
            type: economiaCheck.status as 'warning' | 'critical',
            message: `${buyer.nome} está ${economiaCheck.status === 'critical' ? 'muito abaixo' : 'abaixo'} da meta de economia`,
            currentValue: buyer.performance.economiaMes,
            targetValue: target.economiaMensal,
            percentage: economiaCheck.percentage
          });
        }

        // Check desconto
        const descontoCheck = checkBuyerPerformance(
          buyer.id,
          buyer.nome,
          buyer.performance.descontoMedio,
          target.descontoMedio,
          'desconto',
          target
        );
        if (descontoCheck.shouldAlert) {
          addAlert({
            buyerId: buyer.id,
            buyerName: buyer.nome,
            metric: 'desconto',
            metricLabel: getMetricLabel('desconto'),
            type: descontoCheck.status as 'warning' | 'critical',
            message: `${buyer.nome} está ${descontoCheck.status === 'critical' ? 'muito abaixo' : 'abaixo'} da meta de desconto`,
            currentValue: buyer.performance.descontoMedio,
            targetValue: target.descontoMedio,
            percentage: descontoCheck.percentage
          });
        }

        // Check cotacoes
        const cotacoesCheck = checkBuyerPerformance(
          buyer.id,
          buyer.nome,
          buyer.performance.cotacoesRealizadas,
          target.cotacoesMinimas,
          'cotacoes',
          target
        );
        if (cotacoesCheck.shouldAlert) {
          addAlert({
            buyerId: buyer.id,
            buyerName: buyer.nome,
            metric: 'cotacoes',
            metricLabel: getMetricLabel('cotacoes'),
            type: cotacoesCheck.status as 'warning' | 'critical',
            message: `${buyer.nome} está ${cotacoesCheck.status === 'critical' ? 'muito abaixo' : 'abaixo'} da meta de cotações`,
            currentValue: buyer.performance.cotacoesRealizadas,
            targetValue: target.cotacoesMinimas,
            percentage: cotacoesCheck.percentage
          });
        }
      });
    };

    checkAllBuyers();
    const interval = setInterval(checkAllBuyers, 300000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [targets, addAlert]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-yellow-500" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          <span className="ml-2 hidden sm:inline">Alertas</span>
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
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
              <CheckCircle2 className="w-12 h-12 mb-3 text-green-500/50" />
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
                        <span className="text-xs font-medium text-muted-foreground">
                          {alert.buyerName}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {alert.metricLabel}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          Atual: <strong className={alert.type === 'critical' ? 'text-destructive' : 'text-yellow-600'}>
                            {formatMetricValue(alert.metric, alert.currentValue)}
                          </strong>
                        </span>
                        <span>
                          Meta: <strong>{formatMetricValue(alert.metric, alert.targetValue)}</strong>
                        </span>
                        <span>
                          ({alert.percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.timestamp), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                    {!alert.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
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
