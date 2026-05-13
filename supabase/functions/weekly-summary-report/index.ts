import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
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

    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const logger = new EdgeLogger('weekly-summary-report', requestId);

    logger.info("Starting weekly summary generation...");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDateStr = sevenDaysAgo.toISOString().split("T")[0];

    // 1. New Requests stats
    const { data: newSolicitacoes } = await supabase
      .from("solicitacoes")
      .select("id, valor_estimado")
      .gte("created_at", sevenDaysAgo.toISOString());

    // 2. Approved Orders stats
    const { data: approvedOrders } = await supabase
      .from("pedidos")
      .select("id, valor_total, status")
      .gte("created_at", sevenDaysAgo.toISOString())
      .neq("status", "cancelado");

    // 3. Delivered Orders (for cycle time and total spend)
    const { data: deliveredOrders } = await supabase
      .from("pedidos")
      .select("id, valor_total, created_at, data_entrega")
      .eq("status", "entregue")
      .gte("data_entrega", startDateStr);

    // 4. Savings (using executive_metrics logic if possible, or simple sum)
    const { data: cotacoesAprovadas } = await supabase
      .from("cotacoes")
      .select("valor_total, solicitacao_id")
      .eq("selecionada", true)
      .gte("updated_at", sevenDaysAgo.toISOString());

    const totalSpend = approvedOrders?.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0) || 0;
    const requestsCount = newSolicitacoes?.length || 0;
    const deliveredCount = deliveredOrders?.length || 0;

    // Calculate Average Cycle Time for delivered orders
    let avgCycleTime = 0;
    if (deliveredCount > 0 && deliveredOrders) {
      const times = deliveredOrders.map(o => {
        const start = new Date(o.created_at).getTime();
        const end = new Date(o.data_entrega!).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // days
      });
      avgCycleTime = times.reduce((s, t) => s + t, 0) / deliveredCount;
    }

    const summary = {
      period: "Últimos 7 dias",
      new_requests: requestsCount,
      approved_orders_value: totalSpend,
      delivered_orders: deliveredCount,
      avg_cycle_time: avgCycleTime.toFixed(1) + " dias",
      timestamp: now.toISOString(),
    };

    // Notify admins
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "coordinator"]);

    const userIds = [...new Set((adminUsers || []).map((u) => u.user_id))];

    for (const userId of userIds) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Resumo Semanal de Compras",
        message: `Relatório Semanal: ${requestsCount} novas solicitações, R$ ${totalSpend.toLocaleString("pt-BR")} em pedidos aprovados e ${deliveredCount} entregues.`,
        type: "weekly_report",
        priority: "medium",
      });
    }

    logger.info("Weekly report generated and notifications sent", { summary });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (typeof logger !== 'undefined') {
      logger.error("Error generating weekly summary", { error: errorMessage });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
