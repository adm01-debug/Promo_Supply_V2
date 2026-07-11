import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

interface AlertResult {
  sla_warnings: number;
  sla_critical: number;
  pending_approvals: number;
  overdue_payments: number;
  notifications_sent: number;
  notifications_skipped: number;
}

async function insertIfNotDuplicate(
  supabase: ReturnType<typeof createClient>,
  notif: { user_id: string; type: string; title: string; message: string; priority: string; data?: Record<string, unknown>; action_url?: string; action_label?: string },
  today: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', notif.user_id)
    .eq('title', notif.title)
    .gte('created_at', today)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const { error } = await supabase.from('notifications').insert(notif);
  return !error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const logger = new EdgeLogger('check-sla-alerts', requestId);

    logger.info('Starting SLA and alerts check...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result: AlertResult = {
      sla_warnings: 0,
      sla_critical: 0,
      pending_approvals: 0,
      overdue_payments: 0,
      notifications_sent: 0,
      notifications_skipped: 0,
    };

    // 1. Check for orders with SLA warnings (2 days or less)
    const { data: ordersWarning, error: ordersWarningError } = await supabase
      .from('pedidos')
      .select('id, numero, data_previsao, fornecedor:fornecedores(razao_social), comprador_id')
      .in('status', ['pendente', 'aprovado', 'enviado', 'em_transito'])
      .lte('data_previsao', twoDays)
      .gt('data_previsao', today);

    if (ordersWarningError) {
      logger.error('Error checking order SLA warnings', { error: ordersWarningError });
    } else {
      result.sla_warnings = ordersWarning?.length || 0;
      logger.info(`Found ${result.sla_warnings} orders with SLA warnings`);

      for (const order of ordersWarning || []) {
        if (order.comprador_id) {
          const sent = await insertIfNotDuplicate(supabase, {
            user_id: order.comprador_id,
            type: 'sla_warning',
            title: `Alerta SLA: ${order.numero}`,
            message: `Pedido ${order.numero} vence em breve (${new Date(order.data_previsao!).toLocaleDateString('pt-BR')})`,
            priority: 'high',
            data: { pedido_id: order.id, pedido_numero: order.numero },
            action_url: `/pedidos?id=${order.id}`,
            action_label: 'Ver Pedido',
          }, today);
          if (sent) result.notifications_sent++;
          else result.notifications_skipped++;
        }
      }
    }

    // 2. Check for orders with critical SLA (today or overdue)
    const { data: ordersCritical, error: ordersCriticalError } = await supabase
      .from('pedidos')
      .select('id, numero, data_previsao, fornecedor:fornecedores(razao_social), comprador_id')
      .in('status', ['pendente', 'aprovado', 'enviado', 'em_transito'])
      .lte('data_previsao', today);

    if (ordersCriticalError) {
      logger.error('Error checking critical SLA', { error: ordersCriticalError });
    } else {
      result.sla_critical = ordersCritical?.length || 0;
      logger.info(`Found ${result.sla_critical} orders with critical SLA`);

      for (const order of ordersCritical || []) {
        if (order.comprador_id) {
          const isOverdue = new Date(order.data_previsao!) < new Date(today);
          const sent = await insertIfNotDuplicate(supabase, {
            user_id: order.comprador_id,
            type: isOverdue ? 'sla_overdue' : 'sla_critical',
            title: isOverdue ? `SLA Vencido: ${order.numero}` : `SLA Crítico: ${order.numero}`,
            message: `Pedido ${order.numero} ${isOverdue ? 'está atrasado' : 'vence hoje'}!`,
            priority: 'critical',
            data: { pedido_id: order.id, pedido_numero: order.numero },
            action_url: `/pedidos?id=${order.id}`,
            action_label: 'Ver Pedido',
          }, today);
          if (sent) result.notifications_sent++;
          else result.notifications_skipped++;
        }
      }
    }

    // 3. Check for pending approvals (solicitações)
    const { data: pendingApprovals, error: approvalsError } = await supabase
      .from('solicitacoes')
      .select('id, numero, titulo, solicitante_id, aprovador_id')
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })
      .limit(20);

    if (approvalsError) {
      logger.error('Error checking pending approvals', { error: approvalsError });
    } else {
      result.pending_approvals = pendingApprovals?.length || 0;
      logger.info(`Found ${result.pending_approvals} pending approvals`);

      const { data: approvers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'coordinator']);

      const approverIds = [...new Set((approvers || []).map(a => a.user_id))];

      if (result.pending_approvals > 0 && approverIds.length > 0) {
        for (const approverId of approverIds) {
          const sent = await insertIfNotDuplicate(supabase, {
            user_id: approverId,
            type: 'order_created',
            title: `${result.pending_approvals} Aprovações Pendentes`,
            message: `Existem ${result.pending_approvals} solicitações aguardando aprovação`,
            priority: 'medium',
            data: { count: result.pending_approvals },
            action_url: '/aprovacoes',
            action_label: 'Ver Aprovações',
          }, today);
          if (sent) result.notifications_sent++;
          else result.notifications_skipped++;
        }
      }
    }

    // 4. Check for overdue payments
    const { data: overduePayments, error: paymentsError } = await supabase
      .from('pagamentos')
      .select('id, numero, data_vencimento, valor, fornecedor:fornecedores(razao_social), created_by')
      .in('status', ['pendente', 'aprovado'])
      .lt('data_vencimento', today);

    if (paymentsError) {
      logger.error('Error checking overdue payments', { error: paymentsError });
    } else {
      result.overdue_payments = overduePayments?.length || 0;
      logger.info(`Found ${result.overdue_payments} overdue payments`);

      const { data: financeUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'finance']);

      const financeIds = [...new Set((financeUsers || []).map(u => u.user_id))];

      for (const payment of overduePayments || []) {
        for (const userId of financeIds) {
          const sent = await insertIfNotDuplicate(supabase, {
            user_id: userId,
            type: 'payment_overdue',
            title: `Pagamento Vencido: ${payment.numero}`,
            message: `Pagamento ${payment.numero} de R$ ${Number(payment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} está vencido`,
            priority: 'critical',
            data: { pagamento_id: payment.id, pagamento_numero: payment.numero },
            action_url: '/pagamentos',
            action_label: 'Ver Pagamento',
          }, today);
          if (sent) result.notifications_sent++;
          else result.notifications_skipped++;
        }
      }
    }

    logger.info('Alert check complete', { result });

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: now.toISOString(),
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (typeof logger !== 'undefined') {
      logger.error('Error in check-sla-alerts', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    } else {
      console.error('Error in check-sla-alerts:', error);
    }
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
