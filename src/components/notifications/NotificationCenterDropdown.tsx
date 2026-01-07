import { useState } from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  ChevronDown,
  ExternalLink,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  Building2,
  TrendingUp,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useRealPushNotifications, type Notification } from "@/hooks/useRealPushNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  sla_warning: { icon: AlertTriangle, color: "text-yellow-500", label: "Alerta SLA" },
  sla_critical: { icon: AlertTriangle, color: "text-red-500", label: "SLA Crítico" },
  sla_overdue: { icon: Clock, color: "text-red-600", label: "SLA Vencido" },
  order_created: { icon: FileText, color: "text-blue-500", label: "Novo Pedido" },
  order_approved: { icon: Check, color: "text-green-500", label: "Aprovado" },
  order_rejected: { icon: X, color: "text-red-500", label: "Rejeitado" },
  order_delivered: { icon: Check, color: "text-emerald-500", label: "Entregue" },
  payment_pending: { icon: CreditCard, color: "text-orange-500", label: "Pagamento" },
  payment_overdue: { icon: CreditCard, color: "text-red-500", label: "Pag. Vencido" },
  supplier_alert: { icon: Building2, color: "text-purple-500", label: "Fornecedor" },
  price_alert: { icon: TrendingUp, color: "text-cyan-500", label: "Preço" },
  system: { icon: Info, color: "text-muted-foreground", label: "Sistema" },
};

const NotificationItem = ({ 
  notification, 
  onRead, 
  onRemove,
  onNavigate 
}: { 
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onNavigate: (url: string) => void;
}) => {
  const config = typeConfig[notification.type] || typeConfig.system;
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "p-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0",
        !notification.read && "bg-primary/5"
      )}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
        if (notification.action_url) onNavigate(notification.action_url);
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5", config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium line-clamp-1",
                !notification.read && "font-semibold"
              )}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {notification.message}
              </p>
            </div>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
            <div className="flex items-center gap-1">
              {notification.action_url && (
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(notification.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationCenterDropdown = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useRealPushNotifications();

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleNavigate = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notificações</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Marcar todas lidas
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full rounded-none border-b h-9">
            <TabsTrigger value="unread" className="flex-1 text-xs">
              Não lidas ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs">
              Todas ({notifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[400px]">
              {unreadNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma notificação não lida
                  </p>
                </div>
              ) : (
                unreadNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onRemove={removeNotification}
                    onNavigate={handleNavigate}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma notificação
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onRemove={removeNotification}
                    onNavigate={handleNavigate}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar todas
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
