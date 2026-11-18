import { corsHeaders, verifyCronSecret } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { recordCronHeartbeat } from "../_shared/cronHealth.ts";

interface AlertResult {
  sla_warnings: number;
  sla_critical: number;
  pending_approvals: number;
  overdue_payments: number;
  integration_failures_detected: number;
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


const INTEGRATION_FAILURE_THRESHOLD = 3;
const INTEGRATION_LOOKBACK_MS = 6 * 60 * 60 * 1000; // 6h: só alerta falhas numa janela recente

const INTEGRATION_SOURCES = [
  { table: 'spot_api_sync_log' as const, keyColumn: 'endpoint', label: 'SPOT' },
] as const;

interface IntegrationFailure {
  label: string;
  name: string;
  count: number;
  lastAt: string;
}

async function detectIntegrationFailures(
  supabase: ReturnType<typeof createClient>
): Promise<IntegrationFailure[]> {
  const now = Date.now();
  const failures: IntegrationFailure[] = [];

  for (const source of INTEGRATION_SOURCES) {
    const select = `status, created_at, error_message, ${source.keyColumn}`;
    const { data, error } = await supabase
      .from(source.table)
      .select(select)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      console.warn(JSON.stringify({ level: 'WARN', event: 'integration_failure_check_skip', table: source.table, error: String(error) }));
      continue;
    }

    // Agrupa registros do mais recente para o mais antigo, por endpooint/entidade.
    const groups = new Map<string, { status: string; created_at: string }[]>();
    for (const row of data as Array<Record<string, string>>) {
      const key = String(row[source.keyColumn] ?? 'desconhecido');
      const arr = groups.get(key) ?? [];
      arr.push({ status: row.status, created_at: row.created_at });
      groups.set(key, arr);
    }

    for (const [key, rows] of groups) {
      let count = 0;
      const mostRecent = rows[0];
      for (const row of rows) {
        if (row.status !== 'success') count++;
        else break;
      }
      if (count < INTEGRATION_FAILURE_THRESHOLD) continue;
      const lastTs = Date.parse(mostRecent.created_at);
      if (!lastTs || now - lastTs > INTEGRATION_LOOKBACK_MS) continue;
      failures.push({ label: source.label, name: key, count, lastAt: mostRecent.created_at });
    }
  }

  return failures;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const cronDenied = verifyCronSecret(req);
  if (cronDenied) return cronDenied;

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
      integration_failures_detected: 0,
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

    // 5. Detect repeated consecutive integration failures (SPOT sync, ERP sync)
    const integrationFailures = await detectIntegrationFailures(supabase);
    result.integration_failures_detected = integrationFailures.length;

    if (integrationFailures.length > 0) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'coordinator']);
      const adminIds = [...new Set((admins || []).map(a => a.user_id))];

      for (const failure of integrationFailures) {
        const title = `Integração ${failure.label}: ${failure.count} falhas consecutivas`;
        const message = `A integração ${failure.label} (${failure.name}) acumula **${failure.count} falhas consecutivas** desde ${new Date(failure.lastAt).toLocaleString('pt-BR')}. Verifique o credenciamento e a disponibilidade do serviço.`;
        for (const userId of adminIds) {
          const sent = await insertIfNotDuplicate(supabase, {
            user_id: userId,
            type: 'integration_failure',
            title,
            message,
            priority: 'critical',
            data: { integration: failure.label, name: failure.name, count: failure.count, last_at: failure.lastAt },
            action_url: '/',
            action_label: 'Ver Integrações',
          }, today);
          if (sent) result.notifications_sent++;
          else result.notifications_skipped++;
        }
      }
      logger.warn('Integration failures detected', { failures: integrationFailures });
    }

    logger.info('Alert check complete', { result });

    await recordCronHeartbeat(supabase as any, "check-sla-alerts");
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
    const supabaseForHb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await recordCronHeartbeat(supabaseForHb as any, "check-sla-alerts", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
