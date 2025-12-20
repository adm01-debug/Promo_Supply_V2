import { supabase } from '@/integrations/supabase/client';

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

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    message,
    priority = 'medium',
    data = {},
    actionUrl,
    actionLabel,
  } = params;

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      priority,
      data: data as unknown as Record<string, never>,
      action_url: actionUrl,
      action_label: actionLabel,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return notification;
}

export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message,
    priority: params.priority || 'medium',
    data: (params.data || {}) as unknown as Record<string, never>,
    action_url: params.actionUrl || null,
    action_label: params.actionLabel || null,
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }

  return data;
}

// Helper functions for common notification types
export const NotificationHelpers = {
  async slaWarning(userId: string, orderId: string, orderNumber: string, hoursRemaining: number) {
    return createNotification({
      userId,
      type: 'sla_warning',
      title: 'Alerta de SLA',
      message: `Pedido ${orderNumber} está a ${hoursRemaining}h do prazo de vencimento.`,
      priority: 'high',
      data: { orderId, orderNumber },
      actionUrl: `/pedidos/${orderId}`,
      actionLabel: 'Ver Pedido',
    });
  },

  async slaCritical(userId: string, orderId: string, orderNumber: string, hoursRemaining: number) {
    return createNotification({
      userId,
      type: 'sla_critical',
      title: 'SLA Crítico!',
      message: `URGENTE: Pedido ${orderNumber} vence em ${hoursRemaining}h!`,
      priority: 'critical',
      data: { orderId, orderNumber },
      actionUrl: `/pedidos/${orderId}`,
      actionLabel: 'Ver Pedido',
    });
  },

  async slaOverdue(userId: string, orderId: string, orderNumber: string) {
    return createNotification({
      userId,
      type: 'sla_overdue',
      title: 'SLA Vencido',
      message: `Pedido ${orderNumber} ultrapassou o prazo de entrega!`,
      priority: 'critical',
      data: { orderId, orderNumber },
      actionUrl: `/pedidos/${orderId}`,
      actionLabel: 'Ver Pedido',
    });
  },

  async orderCreated(userId: string, orderId: string, orderNumber: string, value: number) {
    return createNotification({
      userId,
      type: 'order_created',
      title: 'Novo Pedido Criado',
      message: `Pedido ${orderNumber} foi criado. Valor: R$ ${value.toLocaleString('pt-BR')}`,
      priority: 'medium',
      data: { orderId, orderNumber, value },
      actionUrl: `/pedidos/${orderId}`,
      actionLabel: 'Ver Pedido',
    });
  },

  async orderApproved(userId: string, orderId: string, orderNumber: string, approvedBy: string) {
    return createNotification({
      userId,
      type: 'order_approved',
      title: 'Pedido Aprovado',
      message: `Pedido ${orderNumber} foi aprovado por ${approvedBy}.`,
      priority: 'medium',
      data: { orderId, orderNumber, approvedBy },
      actionUrl: `/pedidos/${orderId}`,
      actionLabel: 'Ver Pedido',
    });
  },

  async orderRejected(userId: string, orderId: string, orderNumber: string, reason: string) {
    return createNotification({
      userId,
      type: 'order_rejected',
      title: 'Pedido Rejeitado',
      message: `Pedido ${orderNumber} foi rejeitado. Motivo: ${reason}`,
      priority: 'high',
      data: { orderId, orderNumber, reason },
      actionUrl: `/pedidos/${orderId}`,
      actionLabel: 'Ver Pedido',
    });
  },

  async paymentPending(userId: string, paymentId: string, supplierName: string, value: number, dueDate: string) {
    return createNotification({
      userId,
      type: 'payment_pending',
      title: 'Pagamento Pendente',
      message: `Pagamento de R$ ${value.toLocaleString('pt-BR')} para ${supplierName} vence em ${dueDate}.`,
      priority: 'medium',
      data: { paymentId, supplierName, value, dueDate },
      actionUrl: `/pagamentos`,
      actionLabel: 'Ver Pagamentos',
    });
  },

  async paymentOverdue(userId: string, paymentId: string, supplierName: string, value: number, daysOverdue: number) {
    return createNotification({
      userId,
      type: 'payment_overdue',
      title: 'Pagamento Atrasado!',
      message: `Pagamento de R$ ${value.toLocaleString('pt-BR')} para ${supplierName} está ${daysOverdue} dias atrasado!`,
      priority: 'critical',
      data: { paymentId, supplierName, value, daysOverdue },
      actionUrl: `/pagamentos`,
      actionLabel: 'Ver Pagamentos',
    });
  },

  async supplierAlert(userId: string, supplierId: string, supplierName: string, alertType: string, message: string) {
    return createNotification({
      userId,
      type: 'supplier_alert',
      title: `Alerta de Fornecedor: ${supplierName}`,
      message,
      priority: alertType === 'critical' ? 'critical' : 'high',
      data: { supplierId, supplierName, alertType },
      actionUrl: `/fornecedores/${supplierId}`,
      actionLabel: 'Ver Fornecedor',
    });
  },

  async priceAlert(userId: string, itemName: string, oldPrice: number, newPrice: number, percentChange: number) {
    const direction = percentChange > 0 ? 'aumentou' : 'diminuiu';
    return createNotification({
      userId,
      type: 'price_alert',
      title: 'Variação de Preço',
      message: `Preço de "${itemName}" ${direction} ${Math.abs(percentChange).toFixed(1)}% (R$ ${oldPrice.toLocaleString('pt-BR')} → R$ ${newPrice.toLocaleString('pt-BR')})`,
      priority: Math.abs(percentChange) > 10 ? 'high' : 'medium',
      data: { itemName, oldPrice, newPrice, percentChange },
    });
  },
};
