import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 
  | 'sla_warning' 
  | 'sla_critical' 
  | 'sla_overdue'
  | 'order_created'
  | 'order_approved'
  | 'order_rejected'
  | 'order_delivered'
  | 'payment_pending'
  | 'payment_overdue'
  | 'supplier_alert'
  | 'price_alert'
  | 'system';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  actionLabel?: string;
}

interface PushNotificationState {
  notifications: PushNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  browserPermission: NotificationPermission | 'unsupported';
  
  // Actions
  addNotification: (notification: Omit<PushNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  toggleSound: () => void;
  setBrowserPermission: (permission: NotificationPermission | 'unsupported') => void;
}

export const usePushNotificationStore = create<PushNotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      soundEnabled: true,
      browserPermission: 'default',

      addNotification: (notification) => {
        const newNotification: PushNotification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
          unreadCount: state.unreadCount + 1,
        }));

        // Play sound if enabled
        if (get().soundEnabled && notification.priority !== 'low') {
          playNotificationSound(notification.priority);
        }

        // Send browser notification if permitted
        if (get().browserPermission === 'granted') {
          sendBrowserPushNotification(newNotification);
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (!notification || notification.read) return state;
          
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read 
              ? Math.max(0, state.unreadCount - 1) 
              : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      setBrowserPermission: (permission) => {
        set({ browserPermission: permission });
      },
    }),
    {
      name: 'push-notifications-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Persist only last 50
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);

// Helper function to play notification sound
function playNotificationSound(priority: PushNotification['priority']) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different sounds for different priorities
    const frequencies = {
      low: [440],
      medium: [440, 523],
      high: [523, 659, 784],
      critical: [784, 659, 523, 784, 659, 523],
    };

    const freqs = frequencies[priority];
    const duration = priority === 'critical' ? 0.15 : 0.1;

    freqs.forEach((freq, index) => {
      setTimeout(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = priority === 'critical' ? 'square' : 'sine';
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(audioContext.currentTime + duration);
      }, index * (duration * 1000 + 50));
    });
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

// Helper function to send browser push notification
function sendBrowserPushNotification(notification: PushNotification) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const iconMap: Record<NotificationType, string> = {
    sla_warning: '⚠️',
    sla_critical: '🔴',
    sla_overdue: '⏰',
    order_created: '📦',
    order_approved: '✅',
    order_rejected: '❌',
    order_delivered: '🚚',
    payment_pending: '💳',
    payment_overdue: '💸',
    supplier_alert: '🏭',
    price_alert: '📈',
    system: 'ℹ️',
  };

  const icon = iconMap[notification.type] || 'ℹ️';

  new Notification(`${icon} ${notification.title}`, {
    body: notification.message,
    icon: '/favicon.ico',
    tag: notification.id,
    requireInteraction: notification.priority === 'critical',
    silent: false,
  });
}

// Request browser notification permission
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
}

// Get notification type config for UI
export function getNotificationTypeConfig(type: NotificationType) {
  const configs: Record<NotificationType, { label: string; icon: string; color: string }> = {
    sla_warning: { label: 'Alerta SLA', icon: '⚠️', color: 'text-yellow-500' },
    sla_critical: { label: 'SLA Crítico', icon: '🔴', color: 'text-red-500' },
    sla_overdue: { label: 'SLA Vencido', icon: '⏰', color: 'text-red-600' },
    order_created: { label: 'Novo Pedido', icon: '📦', color: 'text-blue-500' },
    order_approved: { label: 'Aprovado', icon: '✅', color: 'text-green-500' },
    order_rejected: { label: 'Rejeitado', icon: '❌', color: 'text-red-500' },
    order_delivered: { label: 'Entregue', icon: '🚚', color: 'text-emerald-500' },
    payment_pending: { label: 'Pagamento', icon: '💳', color: 'text-orange-500' },
    payment_overdue: { label: 'Pag. Atrasado', icon: '💸', color: 'text-red-500' },
    supplier_alert: { label: 'Fornecedor', icon: '🏭', color: 'text-purple-500' },
    price_alert: { label: 'Preço', icon: '📈', color: 'text-cyan-500' },
    system: { label: 'Sistema', icon: 'ℹ️', color: 'text-muted-foreground' },
  };
  return configs[type];
}
