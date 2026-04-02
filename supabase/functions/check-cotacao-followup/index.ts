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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting cotação follow-up check...");

    const now = new Date();
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Find cotações pending for more than 48h without response
    const { data: staleCotacoes, error: fetchError } = await supabase
      .from("cotacoes")
      .select("id, numero, fornecedor_id, solicitacao_id, created_at, valor_total, solicitacao:solicitacoes(titulo, solicitante_id)")
      .eq("status", "pendente")
      .lt("created_at", cutoff48h);

    if (fetchError) {
      console.error("Error fetching stale cotações:", fetchError);
      throw fetchError;
    }

    let followUpsSent = 0;
    let emailsSent = 0;

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

      const titulo = (cotacao.solicitacao as any)?.titulo || "item";
      const message = `A cotação #${cotacao.numero} para "${titulo}" está pendente há mais de 48 horas. Considere contatar o fornecedor.`;

      // Send in-app notification
      await supabase.from("notifications").insert({
        user_id: solicitanteId,
        title: "Cotação sem resposta há 48h",
        message,
        type: "cotacao_followup",
        priority: "high",
        action_label: "Ver Cotação",
        action_url: `/cotacao?id=${cotacao.id}`,
      });
      followUpsSent++;

      // Send email via Resend if configured
      if (resendApiKey) {
        try {
          // Get user email from profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", solicitanteId)
            .single();

          if (profile?.email) {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Promo Supply <noreply@promosupply.com.br>",
                to: [profile.email],
                subject: `⏰ Cotação #${cotacao.numero} pendente há 48h`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Cotação pendente</h2>
                    <p>Olá ${profile.full_name || ""},</p>
                    <p>${message}</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                      <tr>
                        <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Cotação</td>
                        <td style="padding: 8px; border: 1px solid #eee;">#${cotacao.numero}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Produto</td>
                        <td style="padding: 8px; border: 1px solid #eee;">${titulo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Valor</td>
                        <td style="padding: 8px; border: 1px solid #eee;">R$ ${(cotacao.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </table>
                    <p style="color: #666; font-size: 12px;">Promo Supply — Sistema de Compras</p>
                  </div>
                `,
              }),
            });

            if (emailRes.ok) {
              emailsSent++;
              console.log(`Email sent to ${profile.email} for cotação ${cotacao.numero}`);
            } else {
              const errBody = await emailRes.text();
              console.warn(`Email failed for ${profile.email}: ${errBody}`);
            }
          }
        } catch (emailErr) {
          console.warn("Email dispatch error:", emailErr);
        }
      }
    }

    console.log(`Follow-up check complete: ${followUpsSent} notifications, ${emailsSent} emails sent`);

    return new Response(
      JSON.stringify({ followUpsSent, emailsSent, totalStale: staleCotacoes?.length || 0 }),
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
