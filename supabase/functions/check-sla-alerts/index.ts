import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertResult {
  sla_warnings: number;
  sla_critical: number;
  pending_approvals: number;
  overdue_payments: number;
  notifications_sent: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting SLA and alerts check...');

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
    };

    // 1. Check for orders with SLA warnings (2 days or less)
    const { data: ordersWarning, error: ordersWarningError } = await supabase
      .from('pedidos')
      .select('id, numero, data_previsao, fornecedor:fornecedores(razao_social), comprador_id')
      .in('status', ['pendente', 'aprovado', 'enviado', 'em_transito'])
      .lte('data_previsao', twoDays)
      .gt('data_previsao', today);

    if (ordersWarningError) {
      console.error('Error checking order SLA warnings:', ordersWarningError);
    } else {
      result.sla_warnings = ordersWarning?.length || 0;
      console.log(`Found ${result.sla_warnings} orders with SLA warnings`);

      // Create notifications for SLA warnings
      for (const order of ordersWarning || []) {
        if (order.comprador_id) {
          const { error } = await supabase.from('notifications').insert({
            user_id: order.comprador_id,
            type: 'sla_warning',
            title: 'Alerta de SLA',
            message: `Pedido ${order.numero} vence em breve (${new Date(order.data_previsao!).toLocaleDateString('pt-BR')})`,
            priority: 'high',
            data: { pedido_id: order.id, pedido_numero: order.numero },
            action_url: `/pedidos?id=${order.id}`,
            action_label: 'Ver Pedido',
          });

          if (!error) result.notifications_sent++;
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
      console.error('Error checking critical SLA:', ordersCriticalError);
    } else {
      result.sla_critical = ordersCritical?.length || 0;
      console.log(`Found ${result.sla_critical} orders with critical SLA`);

      for (const order of ordersCritical || []) {
        if (order.comprador_id) {
          const isOverdue = new Date(order.data_previsao!) < new Date(today);
          const { error } = await supabase.from('notifications').insert({
            user_id: order.comprador_id,
            type: isOverdue ? 'sla_overdue' : 'sla_critical',
            title: isOverdue ? 'SLA Vencido!' : 'SLA Crítico',
            message: `Pedido ${order.numero} ${isOverdue ? 'está atrasado' : 'vence hoje'}!`,
            priority: 'critical',
            data: { pedido_id: order.id, pedido_numero: order.numero },
            action_url: `/pedidos?id=${order.id}`,
            action_label: 'Ver Pedido',
          });

          if (!error) result.notifications_sent++;
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
      console.error('Error checking pending approvals:', approvalsError);
    } else {
      result.pending_approvals = pendingApprovals?.length || 0;
      console.log(`Found ${result.pending_approvals} pending approvals`);

      // Get all users with approval permissions (admins and coordinators)
      const { data: approvers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'coordinator']);

      const approverIds = approvers?.map(a => a.user_id) || [];

      // Send notification to approvers about pending items
      if (result.pending_approvals > 0 && approverIds.length > 0) {
        for (const approverId of approverIds) {
          const { error } = await supabase.from('notifications').insert({
            user_id: approverId,
            type: 'order_created',
            title: 'Aprovações Pendentes',
            message: `Existem ${result.pending_approvals} solicitações aguardando aprovação`,
            priority: 'medium',
            data: { count: result.pending_approvals },
            action_url: '/aprovacoes',
            action_label: 'Ver Aprovações',
          });

          if (!error) result.notifications_sent++;
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
      console.error('Error checking overdue payments:', paymentsError);
    } else {
      result.overdue_payments = overduePayments?.length || 0;
      console.log(`Found ${result.overdue_payments} overdue payments`);

      for (const payment of overduePayments || []) {
        // Notify finance team
        const { data: financeUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'finance');

        for (const user of financeUsers || []) {
          const { error } = await supabase.from('notifications').insert({
            user_id: user.user_id,
            type: 'payment_overdue',
            title: 'Pagamento Vencido',
            message: `Pagamento ${payment.numero} de ${payment.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} está vencido`,
            priority: 'critical',
            data: { pagamento_id: payment.id, pagamento_numero: payment.numero },
            action_url: '/pagamentos',
            action_label: 'Ver Pagamento',
          });

          if (!error) result.notifications_sent++;
        }
      }
    }

    console.log('Alert check complete:', result);

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
    console.error('Error in check-sla-alerts:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
