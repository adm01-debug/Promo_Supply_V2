import { useState, useCallback, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  X,
  ChevronRight,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Volume2,
  VolumeX
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================
// TYPES
// ============================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
  id: string;
  label: string;
  variant?: 'default' | 'outline' | 'destructive';
  icon?: ReactNode;
  onClick: () => void | Promise<void>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  archived?: boolean;
  actions?: NotificationAction[];
  metadata?: {
    entityType?: string;
    entityId?: string;
    link?: string;
  };
  groupId?: string;
}

export interface NotificationGroup {
  id: string;
  title: string;
  notifications: Notification[];
  count: number;
}

export interface ActionableNotificationsProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onActionClick?: (notificationId: string, actionId: string) => void;
  onSettingsClick?: () => void;
  groupByEntity?: boolean;
  maxVisible?: number;
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  className?: string;
}

// ============================================
// NOTIFICATION ICON
// ============================================

const getNotificationIcon = (type: NotificationType) => {
  const icons = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
    action: <Bell className="w-4 h-4 text-primary" />
  };
  return icons[type];
};

// ============================================
// TIME AGO
// ============================================

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
};

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onActionClick?: (notificationId: string, actionId: string) => void;
  compact?: boolean;
}

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onArchive,
  onDelete,
  onActionClick,
  compact = false
}: NotificationItemProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: NotificationAction) => {
    setIsLoading(action.id);
    try {
      await action.onClick();
      onActionClick?.(notification.id, action.id);
    } finally {
      setIsLoading(null);
    }
  };

  const priorityStyles = {
    low: '',
    normal: '',
    high: 'border-l-2 border-l-amber-500',
    urgent: 'border-l-2 border-l-red-500 bg-red-500/5'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "relative p-3 rounded-lg transition-colors",
        "hover:bg-muted/50",
        !notification.read && "bg-primary/5",
        priorityStyles[notification.priority]
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={cn(
                "text-sm font-medium text-foreground",
                !notification.read && "font-semibold"
              )}>
                {notification.title}
              </p>
              {!compact && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.read && onMarkAsRead && (
                  <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Marcar como lida
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={() => onArchive(notification.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(notification.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeAgo(notification.timestamp)}
            </span>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </div>

          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && !compact && (
            <div className="flex flex-wrap gap-2 mt-3">
              {notification.actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => handleAction(action)}
                  disabled={isLoading === action.id}
                  className="h-7 text-xs"
                >
                  {isLoading === action.id ? (
                    <span className="animate-spin mr-1">⏳</span>
                  ) : action.icon ? (
                    <span className="mr-1">{action.icon}</span>
                  ) : null}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"
          layoutId={`unread-${notification.id}`}
        />
      )}
    </motion.div>
  );
};

// ============================================
// NOTIFICATION GROUP
// ============================================

interface NotificationGroupItemProps {
  group: NotificationGroup;
  onExpand: () => void;
  expanded: boolean;
}

const NotificationGroupItem = ({
  group,
  onExpand,
  expanded
}: NotificationGroupItemProps) => {
  const unreadCount = group.notifications.filter(n => !n.read).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{group.title}</span>
          <Badge variant="secondary">{group.count}</Badge>
          {unreadCount > 0 && (
            <Badge variant="default" className="bg-primary">
              {unreadCount} novas
            </Badge>
          )}
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 transition-transform",
          expanded && "rotate-90"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-2 space-y-1">
              {group.notifications.slice(0, 3).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  compact
                />
              ))}
              {group.notifications.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full">
                  Ver todas ({group.notifications.length})
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ActionableNotifications = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onArchive,
  onDelete,
  onActionClick,
  onSettingsClick,
  groupByEntity = false,
  maxVisible = 50,
  soundEnabled = true,
  onSoundToggle,
  className
}: ActionableNotificationsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read && !n.archived).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    let filtered = notifications.filter(n => !n.archived);
    
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (activeTab === 'archived') {
      filtered = notifications.filter(n => n.archived);
    }

    return filtered.slice(0, maxVisible);
  }, [notifications, activeTab, maxVisible]);

  const groupedNotifications = useMemo(() => {
    if (!groupByEntity) return null;

    const groups: Record<string, NotificationGroup> = {};
    
    filteredNotifications.forEach(notification => {
      const groupId = notification.groupId || notification.metadata?.entityType || 'other';
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          title: groupId.charAt(0).toUpperCase() + groupId.slice(1),
          notifications: [],
          count: 0
        };
      }
      groups[groupId].notifications.push(notification);
      groups[groupId].count++;
    });

    return Object.values(groups);
  }, [filteredNotifications, groupByEntity]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("relative", className)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <span className="font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} novas</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onSoundToggle && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onSoundToggle(!soundEnabled)}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              {onSettingsClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onSettingsClick}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-3">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Não lidas {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex-1">Arquivadas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === 'unread' 
                  ? 'Você está em dia!' 
                  : 'Notificações aparecerão aqui'}
              </p>
            </div>
          ) : groupByEntity && groupedNotifications ? (
            <div className="p-2 space-y-2">
              {groupedNotifications.map((group) => (
                <NotificationGroupItem
                  key={group.id}
                  group={group}
                  expanded={expandedGroup === group.id}
                  onExpand={() => setExpandedGroup(
                    expandedGroup === group.id ? null : group.id
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <AnimatePresence>
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    onActionClick={onActionClick}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {unreadCount > 0 && onMarkAllAsRead && (
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export { NotificationItem, NotificationGroupItem, getTimeAgo };
