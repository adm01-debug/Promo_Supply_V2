import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface ApprovalNotification {
  id: string;
  approvalId: string;
  requestId: string;
  type: 'warning' | 'critical' | 'escalated';
  message: string;
  createdAt: Date;
  read: boolean;
  requesterName: string;
  value: number;
  timeRemaining: number; // minutes
}

interface PendingApproval {
  id: string;
  solicitacaoId: string;
  requesterName: string;
  value: number;
  createdAt: Date;
  deadlineMinutes: number;
  currentStage: number;
  totalStages: number;
}

// Mock email function - simulates sending email
const mockSendApprovalEmail = async (_notification: ApprovalNotification): Promise<boolean> => {
  // In production, this would call an actual email API
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
};

// Browser push notification
const sendBrowserNotification = (notification: ApprovalNotification) => {
  if (Notification.permission === 'granted') {
    const icon = notification.type === 'critical' ? '🔴' : 
                 notification.type === 'escalated' ? '⚫' : '🟡';
    
    new Notification(`${icon} Aprovação Pendente - ${notification.requestId}`, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type !== 'warning'
    });
  }
};

export const useApprovalNotifications = () => {
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const monitoringRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  // Request notification permission
  useEffect(() => {
    const requestPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          setPermissionGranted(true);
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          setPermissionGranted(permission === 'granted');
        }
      }
    };
    requestPermission();
  }, []);

  const sendNotification = useCallback(async (
    approvalId: string,
    requestId: string,
    type: ApprovalNotification['type'],
    message: string,
    requesterName: string,
    value: number,
    timeRemaining: number
  ) => {
    const notificationKey = `${approvalId}-${type}`;
    
    // Avoid duplicate notifications
    if (notifiedRef.current.has(notificationKey)) {
      return null;
    }
    notifiedRef.current.add(notificationKey);

    const notification: ApprovalNotification = {
      id: `${approvalId}-${Date.now()}`,
      approvalId,
      requestId,
      type,
      message,
      createdAt: new Date(),
      read: false,
      requesterName,
      value,
      timeRemaining
    };

    setNotifications(prev => [notification, ...prev]);

    // Browser notification
    if (permissionGranted) {
      sendBrowserNotification(notification);
    }

    // Mock email
    await mockSendApprovalEmail(notification);

    // Toast
    const toastType = type === 'critical' || type === 'escalated' ? 'error' : 'warning';
    toast[toastType](notification.message, {
      duration: type === 'warning' ? 5000 : 10000,
      description: `Solicitação: ${requestId} • R$ ${value.toLocaleString('pt-BR')}`
    });

    return notification;
  }, [permissionGranted]);

  const checkApprovalDeadlines = useCallback((
    pendingApprovals: PendingApproval[],
    warningThresholdMinutes: number = 30,
    criticalThresholdMinutes: number = 10,
    escalationMinutes: number = 60
  ) => {
    const now = new Date();

    pendingApprovals.forEach(approval => {
      const elapsedMinutes = (now.getTime() - approval.createdAt.getTime()) / (1000 * 60);
      const timeRemaining = approval.deadlineMinutes - elapsedMinutes;

      if (timeRemaining <= 0) {
        // Escalated
        sendNotification(
          approval.id,
          approval.solicitacaoId,
          'escalated',
          `Aprovação ESCALADA! Solicitação ${approval.solicitacaoId} ultrapassou o tempo limite.`,
          approval.requesterName,
          approval.value,
          0
        );
      } else if (timeRemaining <= criticalThresholdMinutes) {
        // Critical
        sendNotification(
          approval.id,
          approval.solicitacaoId,
          'critical',
          `URGENTE: Aprovação ${approval.solicitacaoId} vence em ${Math.round(timeRemaining)} minutos!`,
          approval.requesterName,
          approval.value,
          Math.round(timeRemaining)
        );
      } else if (timeRemaining <= warningThresholdMinutes) {
        // Warning
        sendNotification(
          approval.id,
          approval.solicitacaoId,
          'warning',
          `Atenção: Aprovação ${approval.solicitacaoId} vence em ${Math.round(timeRemaining)} minutos.`,
          approval.requesterName,
          approval.value,
          Math.round(timeRemaining)
        );
      }
    });
  }, [sendNotification]);

  const startMonitoring = useCallback((
    getPendingApprovals: () => PendingApproval[],
    intervalMs: number = 60000 // Check every minute
  ) => {
    if (monitoringRef.current) {
      clearInterval(monitoringRef.current);
    }

    // Initial check
    checkApprovalDeadlines(getPendingApprovals());

    // Periodic checks
    monitoringRef.current = setInterval(() => {
      checkApprovalDeadlines(getPendingApprovals());
    }, intervalMs);

    return () => {
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
      }
    };
  }, [checkApprovalDeadlines]);

  const stopMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      clearInterval(monitoringRef.current);
      monitoringRef.current = null;
    }
  }, []);

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
    notifiedRef.current.clear();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    permissionGranted,
    sendNotification,
    checkApprovalDeadlines,
    startMonitoring,
    stopMonitoring,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
};
