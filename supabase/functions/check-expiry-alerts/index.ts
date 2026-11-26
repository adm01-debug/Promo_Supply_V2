import { verifyCronSecret, buildCorsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { recordCronHeartbeat } from "../_shared/cronHealth.ts";
import { insertNotification } from "../_shared/notifications.ts";
import {
  alertMessage,
  alertTitle,
  selectContractAlerts,
  type ContractRow,
} from "./contractExpiry.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  const cronDenied = verifyCronSecret(req);
  if (cronDenied) return cronDenied;

  // MED-C10: logger declarado ANTES do try para o catch poder referencia-lo
  // (antes era `const` dentro do try e o catch estourava ReferenceError em TDZ).
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let logger: EdgeLogger | undefined;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    logger = new EdgeLogger('check-expiry-alerts', requestId);

    logger.info("Starting expiry alerts check...");

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const thresholdStr = threeDaysFromNow.toISOString().split("T")[0];

    // 1. Find cotações expiring within 3 days
    const { data: expiringCotacoes, error: cotError } = await supabase
      .from("cotacoes")
      .select("id, numero, validade_proposta, solicitacao_id, fornecedor_id, tenant_id")
      .in("status", ["pendente", "analisando"])
      .not("validade_proposta", "is", null)
      .lte("validade_proposta", thresholdStr)
      .gte("validade_proposta", todayStr);

    if (cotError) throw cotError;

    // 2. Auto-expire cotações past their validity
    const { data: expiredCotacoes, error: expError } = await supabase
      .from("cotacoes")
      .select("id, numero")
      .in("status", ["pendente", "analisando"])
      .not("validade_proposta", "is", null)
      .lt("validade_proposta", todayStr);

    if (expError) throw expError;

    // Mark expired cotações
    let expiredCount = 0;
    if (expiredCotacoes && expiredCotacoes.length > 0) {
      const ids = expiredCotacoes.map((c) => c.id);
      const { error: updateErr } = await supabase
        .from("cotacoes")
        .update({ status: "expirada" })
        .in("id", ids);
      if (!updateErr) expiredCount = ids.length;
    }

    // 3. Find pagamentos near due date (3 days)
    const { data: dueSoonPagamentos, error: pagError } = await supabase
      .from("pagamentos")
      .select("id, numero, data_vencimento, fornecedor_id, valor, tenant_id")
      .in("status", ["pendente", "aprovado", "agendado"])
      .lte("data_vencimento", thresholdStr)
      .gte("data_vencimento", todayStr);

    if (pagError) throw pagError;

    // 4. Auto-mark overdue pagamentos
    const { data: overduePagamentos, error: ovdError } = await supabase
      .from("pagamentos")
      .select("id, numero")
      .in("status", ["pendente", "aprovado"])
      .lt("data_vencimento", todayStr);

    if (ovdError) throw ovdError;

    let overdueCount = 0;
    if (overduePagamentos && overduePagamentos.length > 0) {
      const ids = overduePagamentos.map((p) => p.id);
      const { error: updateErr } = await supabase
        .from("pagamentos")
        .update({ status: "atrasado" })
        .in("id", ids);
      if (!updateErr) overdueCount = ids.length;
    }

    // 5. Create notifications for expiring cotações and due pagamentos
    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      priority: string;
      tenant_id?: string | null;
    }> = [];

    // Get admin/coordinator user IDs for notifications
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "coordinator", "buyer"]);

    const userIds = [...new Set((adminUsers || []).map((u) => u.user_id))];

    // Cotação expiry alerts
    for (const cotacao of expiringCotacoes || []) {
      const daysLeft = Math.ceil(
        (new Date(cotacao.validade_proposta!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      for (const userId of userIds) {
        notifications.push({
          user_id: userId,
          title: `Cotação ${cotacao.numero} expira em ${daysLeft} dia(s)`,
          message: `A cotação ${cotacao.numero} expira em ${new Date(cotacao.validade_proposta!).toLocaleDateString("pt-BR")}. Tome uma decisão antes do vencimento.`,
          type: "cotacao_expiring",
          tenant_id: cotacao.tenant_id,
          priority: daysLeft <= 1 ? "critical" : "high",
        });
      }
    }

    // 5.1. Find stale cotações (no response in 48h)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: staleCotacoes } = await supabase
      .from("cotacoes")
      .select("id, numero, solicitacao_id, fornecedor_id, updated_at, tenant_id")
      .eq("status", "pendente")
      .lte("updated_at", fortyEightHoursAgo);

    for (const cotacao of staleCotacoes || []) {
      for (const userId of userIds) {
        notifications.push({
          user_id: userId,
          title: `Follow-up necessário: Cotação ${cotacao.numero}`,
          message: `O fornecedor ainda não respondeu à cotação ${cotacao.numero} enviada há mais de 48h.`,
          type: "cotacao_followup",
          tenant_id: cotacao.tenant_id,
          priority: "medium",
        });
      }
    }

    // Payment due alerts
    for (const pag of dueSoonPagamentos || []) {
      const daysLeft = Math.ceil(
        (new Date(pag.data_vencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      for (const userId of userIds) {
        notifications.push({
          user_id: userId,
          title: `Pagamento ${pag.numero} vence em ${daysLeft} dia(s)`,
          message: `O pagamento ${pag.numero} no valor de R$ ${Number(pag.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vence em ${new Date(pag.data_vencimento).toLocaleDateString("pt-BR")}.`,
          type: "payment_due",
          tenant_id: pag.tenant_id,
          priority: daysLeft <= 1 ? "critical" : "high",
        });
      }
    }

    // Overdue payment alerts
    if (overdueCount > 0) {
      for (const userId of userIds) {
        notifications.push({
          user_id: userId,
          title: `${overdueCount} pagamento(s) marcado(s) como atrasado`,
          message: `${overdueCount} pagamento(s) foram automaticamente marcados como atrasado por ultrapassarem a data de vencimento.`,
          type: "payment_overdue",
          priority: "critical",
        });
      }
    }

    // 6. Contratos ativos vencendo ou ja vencidos. O cron
    //    `contract-expiry-check` (07:00 UTC) chama esta edge desde
    //    20261121153000; sem este bloco ele rodava sem emitir alerta nenhum.
    const { data: contractRows, error: contractError } = await supabase
      .from("contracts")
      .select("id, contract_number, title, status, end_date, renewal_type, renewal_notice_days, tenant_id")
      .in("status", ["active", "ativo"])
      .not("end_date", "is", null);

    if (contractError) throw contractError;

    const contractAlerts = selectContractAlerts((contractRows ?? []) as ContractRow[], now);

    let contractNotifications = 0;
    let contractDeduped = 0;

    for (const alert of contractAlerts) {
      const title = alertTitle(alert);
      const message = alertMessage(alert);
      for (const userId of userIds) {
        const res = await insertNotification(
          supabase,
          {
            user_id: userId,
            tenant_id: alert.tenant_id,
            title,
            message,
            type: "contract_expiring",
            priority: alert.priority,
            action_label: "Ver Contrato",
            action_url: `/contratos?status=expiring`,
            data: {
              contract_id: alert.contract_id,
              days_left: alert.days_left,
              end_date: alert.end_date,
            },
          },
          { dedupeSince: todayStr },
        );
        if (res.ok) contractNotifications++;
        else if (res.skipped === "duplicada") contractDeduped++;
      }
    }

    // Insert notifications (deduplicate - check if similar notification exists today)
    let notificationsCreated = 0;
    for (const notif of notifications) {
      const res = await insertNotification(supabase, notif, { dedupeSince: todayStr });
      if (res.ok) notificationsCreated++;
    }

    const result = {
      cotacoes_expiring: (expiringCotacoes || []).length,
      cotacoes_expired: expiredCount,
      pagamentos_due_soon: (dueSoonPagamentos || []).length,
      pagamentos_overdue_marked: overdueCount,
      contratos_em_alerta: contractAlerts.length,
      contratos_vencidos: contractAlerts.filter((a) => a.expired).length,
      contract_notifications_created: contractNotifications,
      contract_notifications_deduped: contractDeduped,
      notifications_created: notificationsCreated,
      timestamp: now.toISOString(),
    };

    logger.info("Expiry check complete", { result });

    await recordCronHeartbeat(supabase as any, "check-expiry-alerts");
    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (typeof logger !== 'undefined') {
      logger.error("Error in expiry check", { error: errorMessage });
    }
    const supabaseForHb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await recordCronHeartbeat(supabaseForHb as any, "check-expiry-alerts", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
