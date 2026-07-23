import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/lib/feedbackToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuthContext';

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

const sendBrowserNotification = (notification: ApprovalNotification) => {
  if (Notification.permission === 'granted') {
    const icon = notification.type === 'critical' ? '🔴' :
                 notification.type === 'escalated' ? '⚫' : '🟡';
    new Notification(`${icon} Aprovação Pendente - ${notification.requestId}`, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type !== 'warning',
    });
  }
};

/**
 * F-023 fix: replaced setInterval deadline-polling with Realtime subscription
 * on the `notifications` table. The server-side cron (`check-approval-escalations`)
 * inserts notification rows of type 'escalation'/'reminder'/'warning'; the client
 * reacts immediately without polling. startMonitoring() is kept for local countdown
 * UX (in-memory, no DB queries) but no longer drives actual escalation detection.
 */
export const useApprovalNotifications = () => {
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const monitoringRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());
  const { user } = useAuth();

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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
        monitoringRef.current = null;
      }
    };
  }, []);

  // F-023: Subscribe to server-inserted escalation/warning notifications via Realtime.
  // This replaces periodic polling — cron job inserts, client reacts instantly.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`approval_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            title: string;
            message: string;
            priority: string;
            data?: Record<string, unknown>;
          };

          const isApprovalEvent = ['escalation', 'reminder', 'sla_warning', 'sla_critical', 'sla_overdue', 'order_created'].includes(row.type);
          if (!isApprovalEvent) return;

          const notifType: ApprovalNotification['type'] =
            row.type === 'escalation' || row.priority === 'critical' ? 'escalated' :
            row.priority === 'high' ? 'critical' : 'warning';

          const notification: ApprovalNotification = {
            id: row.id,
            approvalId: String(row.data?.workflow_id ?? row.id),
            requestId: String(row.data?.pedido_numero ?? row.data?.cotacao_numero ?? row.id),
            type: notifType,
            message: row.message,
            createdAt: new Date(),
            read: false,
            requesterName: '',
            value: Number(row.data?.valor ?? 0),
            timeRemaining: 0,
          };

          const key = `${notification.approvalId}-${notifType}`;
          if (notifiedRef.current.has(key)) return;
          notifiedRef.current.add(key);

          setNotifications((prev) => [notification, ...prev]);

          if (permissionGranted) sendBrowserNotification(notification);

          const toastType = notifType === 'warning' ? 'warning' : 'error';
          toast[toastType](row.title, {
            duration: notifType === 'warning' ? 5000 : 10000,
            description: safeTruncate(row.message ?? "", 120),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, permissionGranted]);

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
    if (notifiedRef.current.has(notificationKey)) return null;
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
      timeRemaining,
    };

    setNotifications((prev) => [notification, ...prev]);
    if (permissionGranted) sendBrowserNotification(notification);

    const toastType = type === 'critical' || type === 'escalated' ? 'error' : 'warning';
    toast[toastType](message, {
      duration: type === 'warning' ? 5000 : 10000,
      description: `Solicitação: ${requestId} • R$ ${value.toLocaleString('pt-BR')}`,
    });

    return notification;
  }, [permissionGranted]);

  const checkApprovalDeadlines = useCallback((
    pendingApprovals: PendingApproval[],
    warningThresholdMinutes: number = 30,
    criticalThresholdMinutes: number = 10,
  ) => {
    const now = new Date();
    pendingApprovals.forEach(approval => {
      const elapsedMinutes = (now.getTime() - approval.createdAt.getTime()) / (1000 * 60);
      const timeRemaining = approval.deadlineMinutes - elapsedMinutes;
      if (timeRemaining <= 0) {
        sendNotification(approval.id, approval.solicitacaoId, 'escalated',
          `Aprovação ESCALADA! Solicitação ${approval.solicitacaoId} ultrapassou o tempo limite.`,
          approval.requesterName, approval.value, 0);
      } else if (timeRemaining <= criticalThresholdMinutes) {
        sendNotification(approval.id, approval.solicitacaoId, 'critical',
          `URGENTE: Aprovação ${approval.solicitacaoId} vence em ${Math.round(timeRemaining)} minutos!`,
          approval.requesterName, approval.value, Math.round(timeRemaining));
      } else if (timeRemaining <= warningThresholdMinutes) {
        sendNotification(approval.id, approval.solicitacaoId, 'warning',
          `Atenção: Aprovação ${approval.solicitacaoId} vence em ${Math.round(timeRemaining)} minutos.`,
          approval.requesterName, approval.value, Math.round(timeRemaining));
      }
    });
  }, [sendNotification]);

  /**
   * Local countdown UX helper — computes time-remaining indicators from in-memory
   * data without polling the DB. Real escalation events arrive via Realtime above.
   */
  const startMonitoring = useCallback((
    getPendingApprovals: () => PendingApproval[],
    intervalMs: number = 60000
  ) => {
    if (monitoringRef.current) clearInterval(monitoringRef.current);

    checkApprovalDeadlines(getPendingApprovals());
    monitoringRef.current = setInterval(() => {
      checkApprovalDeadlines(getPendingApprovals());
    }, intervalMs);

    return () => {
      if (monitoringRef.current) clearInterval(monitoringRef.current);
    };
  }, [checkApprovalDeadlines]);

  const stopMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      clearInterval(monitoringRef.current);
      monitoringRef.current = null;
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
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
    clearNotifications,
  };
};
