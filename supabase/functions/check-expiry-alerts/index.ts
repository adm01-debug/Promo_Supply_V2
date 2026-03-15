import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const thresholdStr = threeDaysFromNow.toISOString().split("T")[0];

    // 1. Find cotações expiring within 3 days
    const { data: expiringCotacoes, error: cotError } = await supabase
      .from("cotacoes")
      .select("id, numero, validade_proposta, solicitacao_id, fornecedor_id")
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
      .select("id, numero, data_vencimento, fornecedor_id, valor")
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
          priority: daysLeft <= 1 ? "critical" : "high",
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

    // Insert notifications (deduplicate - check if similar notification exists today)
    let notificationsCreated = 0;
    for (const notif of notifications) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", notif.user_id)
        .eq("title", notif.title)
        .gte("created_at", todayStr)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("notifications").insert(notif);
        notificationsCreated++;
      }
    }

    const result = {
      cotacoes_expiring: (expiringCotacoes || []).length,
      cotacoes_expired: expiredCount,
      pagamentos_due_soon: (dueSoonPagamentos || []).length,
      pagamentos_overdue_marked: overdueCount,
      notifications_created: notificationsCreated,
      timestamp: now.toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
