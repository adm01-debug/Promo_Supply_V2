import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  FileText,
  DollarSign,
  Users,
  Settings,
  Trash2,
  MoreHorizontal,
  Filter,
  BellOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// NOTIFICATION TYPES
// ============================================

type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error'
  | 'order'
  | 'payment'
  | 'approval'
  | 'supplier'
  | 'system';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationGroup {
  title: string;
  notifications: Notification[];
}

// ============================================
// NOTIFICATION ICON MAPPING
// ============================================

const notificationIcons: Record<NotificationType, React.ElementType> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
  order: Package,
  payment: DollarSign,
  approval: FileText,
  supplier: Users,
  system: Settings,
};

const notificationColors: Record<NotificationType, { bg: string; text: string; border: string }> = {
  info: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
  success: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  error: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
  order: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  payment: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  approval: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  supplier: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  system: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
};

const priorityBadges: Record<NotificationPriority, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: 'Baixa', variant: 'outline' },
  normal: { label: 'Normal', variant: 'secondary' },
  high: { label: 'Alta', variant: 'default' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAction?: (id: string, url?: string) => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  onAction,
  compact = false,
}: NotificationItemProps) {
  const { lightTap } = useHapticFeedback();
  const Icon = notificationIcons[notification.type];
  const colors = notificationColors[notification.type];
  const priorityBadge = priorityBadges[notification.priority];

  const handleRead = () => {
    lightTap();
    onRead?.(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    lightTap();
    onDelete?.(notification.id);
  };

  const handleAction = () => {
    lightTap();
    onAction?.(notification.id, notification.actionUrl);
  };

  const timeAgo = formatDistanceToNow(notification.timestamp, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={handleRead}
      className={cn(
        "relative p-4 rounded-xl border cursor-pointer transition-all",
        "hover:shadow-md",
        notification.read 
          ? "bg-card opacity-70" 
          : cn("bg-card border-l-4", colors.border),
        compact && "p-3"
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary"
        />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            colors.bg
          )}
        >
          <Icon className={cn("w-5 h-5", colors.text)} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h4 className={cn(
                "text-sm font-semibold line-clamp-1",
                !notification.read && "text-foreground"
              )}>
                {notification.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
            </div>
            
            {/* Priority badge */}
            {notification.priority !== 'normal' && (
              <Badge variant={priorityBadge.variant} className="text-[10px] px-1.5 shrink-0">
                {priorityBadge.label}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>

            <div className="flex items-center gap-1">
              {notification.actionUrl && notification.actionLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleAction(); }}
                  className="h-7 text-xs"
                >
                  {notification.actionLabel}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// NOTIFICATION CENTER
// ============================================

interface NotificationCenterProps {
  notifications: Notification[];
  onReadAll?: () => void;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDeleteAll?: () => void;
  onAction?: (id: string, url?: string) => void;
  onSettingsClick?: () => void;
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  className?: string;
}

export function NotificationCenter({
  notifications,
  onReadAll,
  onRead,
  onDelete,
  onDeleteAll,
  onAction,
  onSettingsClick,
  soundEnabled = true,
  onSoundToggle,
  className,
}: NotificationCenterProps) {
  const [filter, setFilter] = React.useState<'all' | 'unread' | NotificationType>('all');
  const { lightTap } = useHapticFeedback();

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.read;
      return n.type === filter;
    });
  }, [notifications, filter]);

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    const groups: NotificationGroup[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNotifs: Notification[] = [];
    const yesterdayNotifs: Notification[] = [];
    const olderNotifs: Notification[] = [];

    filteredNotifications.forEach(n => {
      const notifDate = new Date(n.timestamp);
      if (notifDate.toDateString() === today.toDateString()) {
        todayNotifs.push(n);
      } else if (notifDate.toDateString() === yesterday.toDateString()) {
        yesterdayNotifs.push(n);
      } else {
        olderNotifs.push(n);
      }
    });

    if (todayNotifs.length) groups.push({ title: 'Hoje', notifications: todayNotifs });
    if (yesterdayNotifs.length) groups.push({ title: 'Ontem', notifications: yesterdayNotifs });
    if (olderNotifs.length) groups.push({ title: 'Anteriores', notifications: olderNotifs });

    return groups;
  }, [filteredNotifications]);

  const handleReadAll = () => {
    lightTap();
    onReadAll?.();
  };

  const handleSoundToggle = () => {
    lightTap();
    onSoundToggle?.(!soundEnabled);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Notificações</h3>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
              >
                {unreadCount}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSoundToggle}
              className="h-8 w-8"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="h-8 w-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReadAll}
            disabled={unreadCount === 0}
            className="h-8 text-xs gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar tudo como lido
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            disabled={notifications.length === 0}
            className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar tudo
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="h-8 w-full justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className="h-7 text-xs data-[state=active]:bg-primary/10">
              Todas
            </TabsTrigger>
            <TabsTrigger value="unread" className="h-7 text-xs data-[state=active]:bg-primary/10">
              Não lidas
            </TabsTrigger>
            <TabsTrigger value="order" className="h-7 text-xs data-[state=active]:bg-primary/10">
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="approval" className="h-7 text-xs data-[state=active]:bg-primary/10">
              Aprovações
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {groupedNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BellOff className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-muted-foreground">Nenhuma notificação</h4>
                <p className="text-sm text-muted-foreground/70">
                  Você está em dia! 🎉
                </p>
              </motion.div>
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                    {group.title}
                  </h4>
                  <div className="space-y-2">
                    {group.notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={onRead}
                        onDelete={onDelete}
                        onAction={onAction}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// NOTIFICATION BELL WITH BADGE
// ============================================

interface NotificationBellProps {
  count: number;
  hasUrgent?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({
  count,
  hasUrgent = false,
  onClick,
  className,
}: NotificationBellProps) {
  const { lightTap } = useHapticFeedback();

  const handleClick = () => {
    lightTap();
    onClick?.();
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        "relative p-2 rounded-lg hover:bg-muted transition-colors",
        className
      )}
    >
      <motion.div
        animate={hasUrgent ? { 
          rotate: [0, -15, 15, -10, 10, 0],
        } : {}}
        transition={{ duration: 0.5, repeat: hasUrgent ? Infinity : 0, repeatDelay: 3 }}
      >
        <Bell className="w-5 h-5" />
      </motion.div>
      
      {count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
            hasUrgent ? "bg-destructive" : "bg-primary"
          )}
        >
          {count > 99 ? '99+' : count}
        </motion.div>
      )}
    </motion.button>
  );
}

// ============================================
// NOTIFICATION TOAST (for incoming)
// ============================================

interface NotificationToastProps {
  notification: Notification;
  onClose?: () => void;
  onAction?: () => void;
  duration?: number;
}

export function NotificationToast({
  notification,
  onClose,
  onAction,
  duration = 5000,
}: NotificationToastProps) {
  const Icon = notificationIcons[notification.type];
  const colors = notificationColors[notification.type];
  const { success: hapticSuccess } = useHapticFeedback();

  React.useEffect(() => {
    hapticSuccess();
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, hapticSuccess, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn(
        "fixed top-4 right-4 z-50 w-80 p-4 rounded-xl border shadow-lg",
        "bg-card",
        colors.border
      )}
    >
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl origin-left", colors.bg)}
      />

      <div className="flex gap-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
          colors.bg
        )}>
          <Icon className={cn("w-5 h-5", colors.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          {notification.actionLabel && (
            <Button
              variant="link"
              size="sm"
              onClick={onAction}
              className="h-auto p-0 mt-1 text-xs"
            >
              {notification.actionLabel} →
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 -mt-1 -mr-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
