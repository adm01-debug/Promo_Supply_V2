import { useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useKPITargetsStore, KPIAlert } from "@/stores/kpiTargetsStore";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const AlertIcon = ({ type }: { type: KPIAlert['type'] }) => {
  switch (type) {
    case 'critical':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  }
};

export const KPIAlertsPanel = () => {
  const { 
    alerts, 
    markAlertAsRead, 
    markAllAlertsAsRead, 
    clearAlerts,
    getUnreadCount 
  } = useKPITargetsStore();
  
  const [open, setOpen] = useState(false);
  const unreadCount = getUnreadCount();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-amber-500" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Alertas
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas de KPIs
          </h4>
          <div className="flex items-center gap-1">
            {alerts.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => markAllAlertsAsRead()}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Ler todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-red-500 hover:text-red-600"
                  onClick={() => clearAlerts()}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <CheckCircle className="w-10 h-10 mb-2 text-emerald-500" />
              <p className="text-sm">Nenhum alerta</p>
              <p className="text-xs">Os KPIs estão dentro das metas</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !alert.read && "bg-primary/5"
                  )}
                  onClick={() => markAlertAsRead(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      alert.type === 'critical' && "bg-red-500/10",
                      alert.type === 'warning' && "bg-amber-500/10",
                      alert.type === 'success' && "bg-emerald-500/10"
                    )}>
                      <AlertIcon type={alert.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {alert.kpiName}
                        </p>
                        {!alert.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          alert.type === 'critical' && "border-red-500/30 text-red-500",
                          alert.type === 'warning' && "border-amber-500/30 text-amber-500",
                          alert.type === 'success' && "border-emerald-500/30 text-emerald-500"
                        )}>
                          {alert.currentValue.toFixed(1)} / {alert.targetValue.toFixed(1)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.timestamp), { 
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
