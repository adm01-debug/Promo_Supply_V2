import { useEffect, useCallback, useRef } from 'react';
import { 
  usePushNotificationStore, 
  requestBrowserNotificationPermission,
  type NotificationType,
  type PushNotification 
} from '@/stores/pushNotificationStore';
import { kpisMock, solicitacoesMock } from '@/data/mockData';

interface RealtimeEvent {
  type: NotificationType;
  title: string;
  message: string;
  priority: PushNotification['priority'];
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
}

// Simulated real-time events for demo purposes
function generateRealtimeEvents(): RealtimeEvent[] {
  const events: RealtimeEvent[] = [];
  
  // SLA warnings based on mock data
  if (kpisMock.atrasados > 0) {
    events.push({
      type: 'sla_critical',
      title: 'Pedidos Atrasados',
      message: `${kpisMock.atrasados} pedidos estão atrasados e precisam de atenção imediata`,
      priority: 'critical',
      actionUrl: '/acompanhamento',
      actionLabel: 'Ver Pedidos',
    });
  }

  // Payment pending alerts
  if (kpisMock.aguardandoPagamento > 3) {
    events.push({
      type: 'payment_pending',
      title: 'Pagamentos Pendentes',
      message: `${kpisMock.aguardandoPagamento} pedidos aguardando pagamento`,
      priority: 'high',
      actionUrl: '/pagamentos',
      actionLabel: 'Ver Pagamentos',
    });
  }

  // Random new order simulation
  const pendingSolicitations = solicitacoesMock.filter(s => s.status === 'AGUARDANDO_COTACAO');
  if (pendingSolicitations.length > 0) {
    const random = pendingSolicitations[Math.floor(Math.random() * pendingSolicitations.length)];
    events.push({
      type: 'order_created',
      title: 'Solicitação Pendente',
      message: `Solicitação aguardando cotação: ${random.produto}`,
      priority: 'high',
      data: { solicitacaoId: random.id },
      actionUrl: '/solicitacoes',
      actionLabel: 'Ver Solicitação',
    });
  }

  // Price alert simulation
  if (Math.random() > 0.7) {
    events.push({
      type: 'price_alert',
      title: 'Variação de Preço',
      message: 'Detectada variação de 15% no preço de Caneta Personalizada',
      priority: 'medium',
      actionUrl: '/historico-compras',
      actionLabel: 'Ver Histórico',
    });
  }

  // Supplier alert simulation
  if (Math.random() > 0.8) {
    events.push({
      type: 'supplier_alert',
      title: 'Avaliação de Fornecedor',
      message: 'Fornecedor ABC Ltda teve queda na avaliação de qualidade',
      priority: 'medium',
      actionUrl: '/fornecedores',
      actionLabel: 'Ver Fornecedor',
    });
  }

  return events;
}

export function useRealtimePushNotifications() {
  const { 
    notifications,
    unreadCount,
    soundEnabled,
    browserPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    toggleSound,
    setBrowserPermission
  } = usePushNotificationStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventRef = useRef<number>(Date.now());

  // Request browser permission on mount
  useEffect(() => {
    requestBrowserNotificationPermission().then(setBrowserPermission);
  }, [setBrowserPermission]);

  // Simulate real-time events
  useEffect(() => {
    // Initial batch of notifications on first load
    const initialEvents = generateRealtimeEvents().slice(0, 2);
    initialEvents.forEach((event, index) => {
      setTimeout(() => {
        addNotification(event);
      }, index * 1000 + 500);
    });

    // Set up periodic checks (every 30-60 seconds in production, faster for demo)
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventRef.current;
      
      // Only trigger if enough time has passed (minimum 30 seconds)
      if (timeSinceLastEvent < 30000) return;
      
      // Random chance to generate event
      if (Math.random() > 0.6) {
        const events = generateRealtimeEvents();
        if (events.length > 0) {
          const event = events[Math.floor(Math.random() * events.length)];
          addNotification(event);
          lastEventRef.current = now;
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [addNotification]);

  // Manual notification trigger for testing
  const sendTestNotification = useCallback((type: NotificationType = 'system') => {
    const testNotifications: Record<NotificationType, Omit<RealtimeEvent, 'type'>> = {
      sla_warning: {
        title: 'Alerta SLA',
        message: 'Pedido #12345 está próximo do prazo limite',
        priority: 'medium',
      },
      sla_critical: {
        title: 'SLA Crítico',
        message: 'Pedido #12346 ultrapassou 80% do tempo limite',
        priority: 'high',
      },
      sla_overdue: {
        title: 'SLA Vencido',
        message: 'Pedido #12347 está atrasado há 2 dias',
        priority: 'critical',
      },
      order_created: {
        title: 'Novo Pedido',
        message: 'Pedido #12348 foi criado com sucesso',
        priority: 'low',
      },
      order_approved: {
        title: 'Pedido Aprovado',
        message: 'Pedido #12349 foi aprovado por Carlos Silva',
        priority: 'medium',
      },
      order_rejected: {
        title: 'Pedido Rejeitado',
        message: 'Pedido #12350 foi rejeitado - verificar justificativa',
        priority: 'high',
      },
      order_delivered: {
        title: 'Pedido Entregue',
        message: 'Pedido #12351 foi entregue com sucesso',
        priority: 'low',
      },
      payment_pending: {
        title: 'Pagamento Pendente',
        message: 'Pedido #12352 aguarda liberação de pagamento',
        priority: 'medium',
      },
      payment_overdue: {
        title: 'Pagamento Atrasado',
        message: 'Pedido #12353 com pagamento vencido há 3 dias',
        priority: 'critical',
      },
      supplier_alert: {
        title: 'Alerta de Fornecedor',
        message: 'Fornecedor XYZ reportou atraso na produção',
        priority: 'high',
      },
      price_alert: {
        title: 'Variação de Preço',
        message: 'Preço do item ABC aumentou 12% em relação ao último mês',
        priority: 'medium',
      },
      system: {
        title: 'Notificação de Teste',
        message: 'Esta é uma notificação de teste do sistema',
        priority: 'low',
      },
    };

    addNotification({
      type,
      ...testNotifications[type],
    });
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    soundEnabled,
    browserPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    toggleSound,
    requestPermission: async () => {
      const permission = await requestBrowserNotificationPermission();
      setBrowserPermission(permission);
      return permission;
    },
    sendTestNotification,
  };
}
