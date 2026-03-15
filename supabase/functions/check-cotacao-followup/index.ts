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

    console.log("Starting cotação follow-up check...");

    const now = new Date();
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Find cotações pending for more than 48h without response
    const { data: staleCotacoes, error: fetchError } = await supabase
      .from("cotacoes")
      .select("id, numero, fornecedor_id, solicitacao_id, created_at, solicitacao:solicitacoes(titulo, solicitante_id)")
      .eq("status", "pendente")
      .lt("created_at", cutoff48h);

    if (fetchError) {
      console.error("Error fetching stale cotações:", fetchError);
      throw fetchError;
    }

    let followUpsSent = 0;

    for (const cotacao of staleCotacoes || []) {
      const solicitanteId = (cotacao.solicitacao as any)?.solicitante_id;
      if (!solicitanteId) continue;

      // Check if we already sent a follow-up notification for this cotação
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "cotacao_followup")
        .ilike("message", `%${cotacao.numero}%`)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      // Send follow-up notification
      await supabase.from("notifications").insert({
        user_id: solicitanteId,
        title: "Cotação sem resposta há 48h",
        message: `A cotação #${cotacao.numero} para "${(cotacao.solicitacao as any)?.titulo || "item"}" está pendente há mais de 48 horas. Considere contatar o fornecedor.`,
        type: "cotacao_followup",
        priority: "high",
        action_label: "Ver Cotação",
        action_url: `/cotacoes?id=${cotacao.id}`,
      });

      followUpsSent++;
    }

    console.log(`Follow-up check complete: ${followUpsSent} notifications sent`);

    return new Response(
      JSON.stringify({ followUpsSent, totalStale: staleCotacoes?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in check-cotacao-followup:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
