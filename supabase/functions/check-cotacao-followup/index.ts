import { verifyCronSecret, buildCorsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/http.ts";
import { recordCronHeartbeat } from "../_shared/cronHealth.ts";
import { insertNotification } from "../_shared/notifications.ts";
import {
  cutoffIso,
  dedupePattern,
  shouldSendFollowUp,
} from "./cotacaoFollowUp.ts";
Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  const cronDenied = verifyCronSecret(req);
  if (cronDenied) return cronDenied;

  // MED-C10: declare logger BEFORE the try so the catch can safely reference it.
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  let logger: EdgeLogger | undefined;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendConfigured = Boolean(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseKey);

    logger = new EdgeLogger('check-cotacao-followup', requestId);

    logger.info("Starting cotação follow-up check...");

    if (!resendConfigured) {
      logger.warn("RESEND_API_KEY não configurada — e-mails de follow-up serão pulados", {
        hint: "Cadastre RESEND_API_KEY no Supabase (Edge Functions > Secrets)",
      });
    }

    const now = new Date();
    const cutoff48h = cutoffIso(now);

    // Find cotações pending for more than 48h without response
    const { data: staleCotacoes, error: fetchError } = await supabase
      .from("cotacoes")
      .select("id, numero, fornecedor_id, solicitacao_id, created_at, valor_total, last_follow_up_at, solicitacao:solicitacoes(titulo, solicitante_id, tenant_id)")
      .eq("status", "pendente")
      .lt("created_at", cutoff48h);

    if (fetchError) {
      logger.error("Error fetching stale cotações", { error: fetchError });
      throw fetchError;
    }

    let followUpsSent = 0;
    let emailsSent = 0;

    for (const cotacao of staleCotacoes || []) {
      const solicitanteId = (cotacao.solicitacao as any)?.solicitante_id;
      const decision = shouldSendFollowUp(
        { id: cotacao.id, numero: cotacao.numero, created_at: cotacao.created_at },
        solicitanteId,
        (cotacao as { last_follow_up_at?: string | null }).last_follow_up_at,
        now,
      );
      if (!decision.shouldNotify) continue;

      // Dedupe por numero inteiro delimitado: `#COT-1 ` nao casa `#COT-12 `,
      // que era o furo do `ilike('%COT-1%')` anterior.
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "cotacao_followup")
        .ilike("message", dedupePattern(cotacao.numero, cotacao.id))
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        await supabase
          .from("cotacoes")
          .update({ last_follow_up_at: now.toISOString(), follow_up_status: "notificado" })
          .eq("id", cotacao.id);
        continue;
      }

      const titulo = (cotacao.solicitacao as any)?.titulo || "item";
      const numeroRef = (cotacao.numero ?? "").trim() || cotacao.id;
      const message = `A cotação #${numeroRef} para "${titulo}" está pendente há mais de 48 horas. Considere contatar o fornecedor.`;

      // Send in-app notification
      const { error: notifError } = await insertNotification(supabase, {
        user_id: solicitanteId,
        tenant_id: (cotacao.solicitacao as any)?.tenant_id,
        title: "Cotação sem resposta há 48h",
        message,
        type: "cotacao_followup",
        priority: "high",
        action_label: "Ver Cotação",
        action_url: `/cotacao?id=${cotacao.id}`,
      });
      if (notifError) {
        logger.warn("follow-up: notificacao nao criada", { error: String(notifError) });
      }
      followUpsSent++;

      // Registra o envio: alimenta o dedupe da proxima execucao e as colunas
      // que a UI de cotacoes ja exibe (`last_follow_up_at`, `follow_up_status`).
      const { error: stampError } = await supabase
        .from("cotacoes")
        .update({ last_follow_up_at: now.toISOString(), follow_up_status: "notificado" })
        .eq("id", cotacao.id);
      if (stampError) {
        logger.warn("follow-up: carimbo de envio falhou", { error: String(stampError) });
      }

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
            const emailRes = await fetchWithTimeout("https://api.resend.com/emails", {
      timeoutMs: 10000,
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
              logger.info(`Email sent successfully for cotação ${cotacao.numero}`, { email: profile.email });
            } else {
              const errBody = await emailRes.text();
              logger.warn(`Email delivery failed for ${profile.email}`, { response: errBody });
            }
          }
        } catch (emailErr) {
          logger?.warn("Email dispatch failed", {
            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
          });
        }
      }
    }

    logger.info(`Follow-up check complete`, { followUpsSent, emailsSent, resendConfigured, totalStale: staleCotacoes?.length });

    await recordCronHeartbeat(supabase as any, "check-cotacao-followup");
    return new Response(
      JSON.stringify({ followUpsSent, emailsSent, resendConfigured, resendWarning: resendConfigured ? null : "RESEND_API_KEY não configurada — e-mails pulados", totalStale: staleCotacoes?.length || 0 }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (typeof logger !== 'undefined') {
      logger.error("Error in check-cotacao-followup", { error: msg, stack: error instanceof Error ? error.stack : undefined });
    } else {
      console.error("Error in check-cotacao-followup:", error);
    }
    const supabaseForHb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await recordCronHeartbeat(supabaseForHb as any, "check-cotacao-followup", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
