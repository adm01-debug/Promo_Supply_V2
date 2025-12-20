import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: Record<string, unknown>;
  action_url?: string;
  action_label?: string;
  read: boolean;
  sent_push: boolean;
  sent_email: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  sla_warnings: boolean;
  sla_critical: boolean;
  order_updates: boolean;
  payment_alerts: boolean;
  supplier_alerts: boolean;
  price_alerts: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  sound_enabled: boolean;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id'> = {
  sla_warnings: true,
  sla_critical: true,
  order_updates: true,
  payment_alerts: true,
  supplier_alerts: true,
  price_alerts: true,
  email_notifications: false,
  push_notifications: true,
  sound_enabled: true,
};

export function useRealPushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === 'granted') {
      toast({
        title: 'Notificações ativadas',
        description: 'Você receberá notificações push do sistema.',
      });
      
      // Register service worker subscription if needed
      await registerPushSubscription();
    }

    return permission;
  }, [toast]);

  // Register push subscription with service worker
  const registerPushSubscription = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if push is supported
      if (!registration.pushManager) {
        console.log('Push notifications not supported');
        return;
      }

      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // For now, we'll use a placeholder VAPID key
        // In production, this would come from your backend
        const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        
        try {
          const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as BufferSource,
          });
        } catch (err) {
          console.log('Could not subscribe to push:', err);
          return;
        }
      }

      if (subscription) {
        const subscriptionJson = subscription.toJSON();
        
        // Save subscription to database
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || '',
        }, {
          onConflict: 'user_id,endpoint',
        });

        if (error) {
          console.error('Error saving push subscription:', error);
        }
      }
    } catch (error) {
      console.error('Error registering push subscription:', error);
    }
  }, [user]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedNotifications = (data || []).map(n => ({
        ...n,
        priority: n.priority as 'low' | 'medium' | 'high' | 'critical',
        data: (n.data || {}) as Record<string, unknown>,
      }));

      setNotifications(typedNotifications);
      setUnreadCount(typedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data as NotificationPreferences);
      } else {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...defaultPreferences,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, [user]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data as NotificationPreferences);
      toast({
        title: 'Preferências atualizadas',
        description: 'Suas preferências de notificação foram salvas.',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as preferências.',
        variant: 'destructive',
      });
    }
  }, [user, preferences, toast]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user]);

  // Delete notification
  const removeNotification = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const notification = notifications.find(n => n.id === id);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, [user, notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [user]);

  // Send browser notification
  const sendBrowserNotification = useCallback((notification: Notification) => {
    if (permissionStatus !== 'granted' || !preferences?.push_notifications) return;

    const iconMap: Record<string, string> = {
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
      icon: '/pwa-192x192.png',
      tag: notification.id,
      requireInteraction: notification.priority === 'critical',
    });

    // Play sound
    if (preferences?.sound_enabled && notification.priority !== 'low') {
      playNotificationSound(notification.priority);
    }
  }, [permissionStatus, preferences]);

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([loadNotifications(), loadPreferences()]).finally(() => {
        setLoading(false);
      });
    } else {
      setNotifications([]);
      setPreferences(null);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user, loadNotifications, loadPreferences]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = {
              ...payload.new,
              priority: payload.new.priority as 'low' | 'medium' | 'high' | 'critical',
              data: (payload.new.data || {}) as Record<string, unknown>,
            } as Notification;
            
            setNotifications(prev => [newNotification, ...prev].slice(0, 100));
            setUnreadCount(prev => prev + 1);

            // Send browser notification
            sendBrowserNotification(newNotification);

            // Show toast
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.priority === 'critical' ? 'destructive' : 'default',
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, sendBrowserNotification, toast]);

  return {
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
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Play notification sound
function playNotificationSound(priority: 'low' | 'medium' | 'high' | 'critical') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
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
