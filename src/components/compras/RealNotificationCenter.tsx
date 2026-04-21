import { useState } from 'react';
import { Bell, BellRing, Check, Trash2, Volume2, VolumeX, Settings, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useRealPushNotifications, Notification } from '@/hooks/useRealPushNotifications';
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
  sla_warning: { label: 'Alerta SLA', icon: '⚠️', color: 'text-warning' },
  sla_critical: { label: 'SLA Crítico', icon: '🔴', color: 'text-destructive' },
  sla_overdue: { label: 'SLA Vencido', icon: '⏰', color: 'text-destructive' },
  order_created: { label: 'Novo Pedido', icon: '📦', color: 'text-info' },
  order_approved: { label: 'Aprovado', icon: '✅', color: 'text-success' },
  order_rejected: { label: 'Rejeitado', icon: '❌', color: 'text-destructive' },
  order_delivered: { label: 'Entregue', icon: '🚚', color: 'text-success' },
  payment_pending: { label: 'Pagamento', icon: '💳', color: 'text-warning' },
  payment_overdue: { label: 'Pag. Atrasado', icon: '💸', color: 'text-destructive' },
  supplier_alert: { label: 'Fornecedor', icon: '🏭', color: 'text-purple-500' },
  price_alert: { label: 'Preço', icon: '📈', color: 'text-cyan-500' },
  system: { label: 'Sistema', icon: 'ℹ️', color: 'text-muted-foreground' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', className: 'bg-info/10 text-info dark:bg-info/15 dark:text-info' },
  high: { label: 'Alta', className: 'bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning' },
  critical: { label: 'Crítica', className: 'bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive' },
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onRemove }: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.system;
  const priority = priorityConfig[notification.priority];

  return (
    <div
      className={cn(
        'p-3 border-b last:border-b-0 transition-colors',
        !notification.read && 'bg-accent/50'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', priority.className)}>
              {priority.label}
            </Badge>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="font-medium text-sm truncate">{notification.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            <div className="flex items-center gap-1">
              {notification.action_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => window.open(notification.action_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onRemove(notification.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RealNotificationCenter() {
  const {
    notifications,
    preferences,
    unreadCount,
    loading,
    permissionStatus,
    requestPermission,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useRealPushNotifications();

  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 animate-pulse" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between p-3 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications" className="text-xs">
                Notificações
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Preferências
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notifications" className="m-0">
            {/* Actions bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
              <span className="text-xs text-muted-foreground">
                {notifications.length} notificações
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Ler todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>

            {/* Notifications list */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-6">
                {/* Browser Notifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Notificações do Navegador</h4>
                  {permissionStatus === 'granted' ? (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Check className="h-4 w-4" />
                      Notificações push ativadas
                    </div>
                  ) : permissionStatus === 'denied' ? (
                    <div className="text-sm text-destructive">
                      Notificações bloqueadas. Altere nas configurações do navegador.
                    </div>
                  ) : (
                    <Button size="sm" onClick={requestPermission}>
                      <Bell className="h-4 w-4 mr-2" />
                      Ativar notificações push
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Sound */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {preferences?.sound_enabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                    <Label htmlFor="sound" className="text-sm">Som de notificação</Label>
                  </div>
                  <Switch
                    id="sound"
                    checked={preferences?.sound_enabled ?? true}
                    onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })}
                  />
                </div>

                <Separator />

                {/* Notification Types */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Tipos de Notificação</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sla_warnings" className="text-sm">Alertas de SLA</Label>
                      <Switch
                        id="sla_warnings"
                        checked={preferences?.sla_warnings ?? true}
                        onCheckedChange={(checked) => updatePreferences({ sla_warnings: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sla_critical" className="text-sm">SLA Críticos</Label>
                      <Switch
                        id="sla_critical"
                        checked={preferences?.sla_critical ?? true}
                        onCheckedChange={(checked) => updatePreferences({ sla_critical: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="order_updates" className="text-sm">Atualizações de Pedidos</Label>
                      <Switch
                        id="order_updates"
                        checked={preferences?.order_updates ?? true}
                        onCheckedChange={(checked) => updatePreferences({ order_updates: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="payment_alerts" className="text-sm">Alertas de Pagamento</Label>
                      <Switch
                        id="payment_alerts"
                        checked={preferences?.payment_alerts ?? true}
                        onCheckedChange={(checked) => updatePreferences({ payment_alerts: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="supplier_alerts" className="text-sm">Alertas de Fornecedor</Label>
                      <Switch
                        id="supplier_alerts"
                        checked={preferences?.supplier_alerts ?? true}
                        onCheckedChange={(checked) => updatePreferences({ supplier_alerts: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="price_alerts" className="text-sm">Alertas de Preço</Label>
                      <Switch
                        id="price_alerts"
                        checked={preferences?.price_alerts ?? true}
                        onCheckedChange={(checked) => updatePreferences({ price_alerts: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Channels */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Canais de Notificação</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push_notifications" className="text-sm">Notificações Push</Label>
                    <Switch
                      id="push_notifications"
                      checked={preferences?.push_notifications ?? true}
                      onCheckedChange={(checked) => updatePreferences({ push_notifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_notifications" className="text-sm">Notificações por Email</Label>
                    <Switch
                      id="email_notifications"
                      checked={preferences?.email_notifications ?? false}
                      onCheckedChange={(checked) => updatePreferences({ email_notifications: checked })}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
