import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface SLANotification {
  id: string;
  orderId: string;
  orderNumber: string;
  type: 'warning' | 'critical' | 'overdue';
  message: string;
  createdAt: Date;
  read: boolean;
}

// Mock email function - simulates sending without real API
const mockSendEmail = async (notification: SLANotification): Promise<boolean> => {
  console.log('📧 [MOCK EMAIL] Enviando notificação:', {
    to: 'compras@promobrindes.com.br',
    subject: `[${notification.type.toUpperCase()}] Alerta SLA - Pedido ${notification.orderNumber}`,
    body: notification.message,
    timestamp: new Date().toISOString()
  });
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return true;
};

// Request browser notification permission
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Browser não suporta notificações');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send browser push notification
const sendBrowserNotification = (notification: SLANotification) => {
  if (Notification.permission === 'granted') {
    const icon = notification.type === 'critical' ? '🔴' : 
                 notification.type === 'overdue' ? '⚫' : '🟡';
    
    new Notification(`${icon} Alerta SLA - Pedido ${notification.orderNumber}`, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type !== 'warning'
    });
  }
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<SLANotification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    requestNotificationPermission().then(setPermissionGranted);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const sendNotification = useCallback(async (
    orderId: string,
    orderNumber: string,
    type: SLANotification['type'],
    message: string
  ) => {
    const notification: SLANotification = {
      id: `${orderId}-${Date.now()}`,
      orderId,
      orderNumber,
      type,
      message,
      createdAt: new Date(),
      read: false
    };

    // Add to local state
    setNotifications(prev => [notification, ...prev]);

    // Send browser notification
    if (permissionGranted) {
      sendBrowserNotification(notification);
    }

    // Send mock email
    await mockSendEmail(notification);

    // Show toast
    const toastType = type === 'critical' || type === 'overdue' ? 'error' : 'warning';
    toast[toastType](`Pedido ${orderNumber}: ${message}`, {
      duration: type === 'warning' ? 5000 : 10000
    });

    return notification;
  }, [permissionGranted]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    permissionGranted,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    requestPermission: requestNotificationPermission
  };
};
