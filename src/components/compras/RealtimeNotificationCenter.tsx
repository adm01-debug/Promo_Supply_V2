import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Check, 
  CheckCheck, 
  Trash2,
  X,
  ExternalLink,
  Settings
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useRealtimePushNotifications } from "@/hooks/useRealtimePushNotifications";
import { getNotificationTypeConfig, type PushNotification } from "@/stores/pushNotificationStore";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onRemove 
}: { 
  notification: PushNotification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const config = getNotificationTypeConfig(notification.type);
  
  const priorityColors = {
    low: 'border-l-muted-foreground',
    medium: 'border-l-blue-500',
    high: 'border-l-orange-500',
    critical: 'border-l-red-500',
  };

  return (
    <div 
      className={cn(
        "p-3 border-l-4 transition-colors cursor-pointer group",
        priorityColors[notification.priority],
        notification.read ? "bg-muted/30 opacity-70" : "bg-background hover:bg-muted/50"
      )}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{config.icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium", config.color)}>
              {config.label}
            </span>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          
          <p className="text-sm font-medium text-foreground line-clamp-1">
            {notification.title}
          </p>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {notification.actionUrl && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link 
                        to={notification.actionUrl}
                        className="p-1 rounded hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      {notification.actionLabel || 'Abrir'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="p-1 rounded hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(notification.id);
                      }}
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Remover</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RealtimeNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    notifications,
    unreadCount,
    soundEnabled,
    browserPermission,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    toggleSound,
    requestPermission,
    sendTestNotification,
  } = useRealtimePushNotifications();

  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs animate-scale-in"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} novas
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurações</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">Som de notificação</span>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Notificações do navegador</span>
              </div>
              {browserPermission === 'granted' ? (
                <Badge variant="outline" className="text-xs text-green-600">
                  <Check className="w-3 h-3 mr-1" /> Ativo
                </Badge>
              ) : browserPermission === 'denied' ? (
                <Badge variant="outline" className="text-xs text-red-600">
                  Bloqueado
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={requestPermission}
                >
                  Ativar
                </Button>
              )}
            </div>

            <Separator />
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => sendTestNotification('system')}
            >
              Enviar notificação de teste
            </Button>
          </div>
        )}

        {/* Actions */}
        {notifications.length > 0 && !showSettings && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={clearAll}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
              <p className="text-xs mt-1">Você será notificado sobre eventos importantes</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onRemove={removeNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 5 && (
          <div className="p-3 border-t bg-muted/30 text-center">
            <Link 
              to="/notificacoes" 
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver todas as notificações
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
