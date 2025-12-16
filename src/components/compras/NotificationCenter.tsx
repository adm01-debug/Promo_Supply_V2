import { Bell, Check, CheckCheck, Trash2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications, SLANotification } from '@/hooks/useNotifications';
import { useSLAMonitor } from '@/hooks/useSLAMonitor';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationIcon = ({ type }: { type: SLANotification['type'] }) => {
  switch (type) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'overdue':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <Clock className="h-4 w-4 text-warning" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: SLANotification;
  onMarkAsRead: (id: string) => void;
}) => {
  return (
    <div
      className={cn(
        "p-3 border-b border-border last:border-b-0 transition-colors cursor-pointer hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
      onClick={() => onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              Pedido {notification.orderNumber}
            </span>
            <Badge 
              variant={
                notification.type === 'overdue' ? 'destructive' :
                notification.type === 'critical' ? 'destructive' :
                'outline'
              }
              className="text-xs"
            >
              {notification.type === 'warning' && 'Atenção'}
              {notification.type === 'critical' && 'Crítico'}
              {notification.type === 'overdue' && 'Atrasado'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <span className="text-xs text-muted-foreground mt-1 block">
            {formatDistanceToNow(notification.createdAt, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
};

export const NotificationCenter = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    permissionGranted,
    requestPermission
  } = useNotifications();
  
  const { triggerTestNotification } = useSLAMonitor();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notificações</h4>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar lidas
                </Button>
              )}
            </div>
          </div>
          {!permissionGranted && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestPermission}
              className="w-full mt-2 text-xs"
            >
              <Bell className="h-3 w-3 mr-1" />
              Ativar notificações do navegador
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="flex-1 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerTestNotification}
                className="flex-1 text-xs"
              >
                Testar notificação
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
