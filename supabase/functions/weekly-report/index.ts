import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating weekly procurement report...");

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekAgoDate = weekAgo.split("T")[0];

    // Gather weekly stats
    const [solRes, pedRes, pagRes, cotRes] = await Promise.all([
      supabase.from("solicitacoes").select("id, status, valor_estimado").gte("created_at", weekAgo),
      supabase.from("pedidos").select("id, status, valor_total").gte("created_at", weekAgo),
      supabase.from("pagamentos").select("id, status, valor, valor_pago").gte("created_at", weekAgo),
      supabase.from("cotacoes").select("id, status, valor_total").gte("created_at", weekAgo),
    ]);

    const solicitacoes = solRes.data || [];
    const pedidos = pedRes.data || [];
    const pagamentos = pagRes.data || [];
    const cotacoes = cotRes.data || [];

    const totalSolicitacoes = solicitacoes.length;
    const totalPedidos = pedidos.length;
    const totalCotacoes = cotacoes.length;
    const volumeCompras = pedidos.reduce((sum, p) => sum + (Number(p.valor_total) || 0), 0);
    const pagamentosRealizados = pagamentos.filter((p) => p.status === "pago").length;
    const pagamentosAtrasados = pagamentos.filter((p) => p.status === "atrasado").length;
    const pedidosEntregues = pedidos.filter((p) => p.status === "entregue").length;
    const cotacoesAprovadas = cotacoes.filter((c) => c.status === "aprovada").length;

    const formatCurrency = (v: number) =>
      `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    const reportMessage = [
      `📊 *Relatório Semanal de Compras* (${weekAgoDate} a ${now.toISOString().split("T")[0]})`,
      "",
      `📝 Solicitações criadas: ${totalSolicitacoes}`,
      `📋 Cotações recebidas: ${totalCotacoes} (${cotacoesAprovadas} aprovadas)`,
      `📦 Pedidos emitidos: ${totalPedidos} (${pedidosEntregues} entregues)`,
      `💰 Volume de compras: ${formatCurrency(volumeCompras)}`,
      `💳 Pagamentos: ${pagamentosRealizados} realizados, ${pagamentosAtrasados} atrasados`,
    ].join("\n");

    // Send to all admin/coordinator users
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "coordinator"]);

    let notificationsSent = 0;

    for (const { user_id } of adminRoles || []) {
      await supabase.from("notifications").insert({
        user_id,
        title: "Relatório Semanal de Compras",
        message: reportMessage,
        type: "weekly_report",
        priority: "normal",
      });
      notificationsSent++;
    }

    console.log(`Weekly report sent to ${notificationsSent} users`);

    return new Response(
      JSON.stringify({
        report: {
          totalSolicitacoes,
          totalPedidos,
          totalCotacoes,
          volumeCompras,
          pagamentosRealizados,
          pagamentosAtrasados,
          pedidosEntregues,
          cotacoesAprovadas,
        },
        notificationsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in weekly-report:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
