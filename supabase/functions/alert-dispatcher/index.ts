/**
 * OBS-01 — Alert Dispatcher (Onda 43)
 * Consome `system_alerts` HIGH/CRITICAL e faz fan-out por assinatura:
 *   - in_app: insere em `notifications`
 *   - slack:  posta em `slack_webhook_url` da assinatura OU fallback global
 *
 * Trigger:
 *   - Chamado por cron (pg_net) a cada 1 min
 *   - Dedupe: só dispara alertas com `dispatched_at IS NULL`
 *   - Silencia janela: 1 alerta por (alert_type + tenant_id) por rodada
 *
 * Resiliência:
 *   - Retry com backoff exponencial + jitter (via `_shared/retry.ts`) para Slack
 *   - Timeout 5s por tentativa · até 3 tentativas
 *   - Falha isolada por assinatura não bloqueia demais fanouts
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/security.ts";
import { fetchWithTimeout } from "../_shared/http.ts";
import { retry } from "../_shared/retry.ts";

const GLOBAL_SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "alerts@promo-supply.app";
const APP_URL = Deno.env.get("APP_URL") ?? "https://hub-harmony-unite.lovable.app";

interface Alert {
  id: string;
  tenant_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function severityEmoji(sev: string): string {
  switch (sev.toUpperCase()) {
    case "CRITICAL": return "🚨";
    case "HIGH":     return "🔴";
    case "MEDIUM":   return "🟡";
    default:         return "🔵";
  }
}

function slackPayload(alert: Alert) {
  return {
    text: `${severityEmoji(alert.severity)} *${alert.alert_type}* — ${alert.severity}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${severityEmoji(alert.severity)} *${alert.alert_type}* (${alert.severity})\n${alert.message}`,
        },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `tenant: \`${alert.tenant_id ?? "n/a"}\` · id: \`${alert.id}\` · ${alert.created_at}` },
        ],
      },
    ],
  };
}

/** Envio com retry backoff exponencial + jitter (3 tentativas, timeout 5s cada). */
async function postToSlackWithRetry(url: string, alert: Alert): Promise<{ ok: boolean; error?: string; attempts: number }> {
  let attempts = 0;
  try {
    await retry(
      async () => {
        attempts++;
        const res = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload(alert)),
          timeoutMs: 5_000,
        });
        // 4xx (exceto 429) não deve gerar retry — trata como erro terminal.
        if (!res.ok) {
          const err = new Error(`slack_status_${res.status}`);
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            // marca como não-retryable
            (err as Error & { __noRetry?: boolean }).__noRetry = true;
          }
          throw err;
        }
      },
      {
        retries: 2,
        baseDelayMs: 300,
        maxDelayMs: 3_000,
        shouldRetry: (err) => !(err as { __noRetry?: boolean })?.__noRetry,
      },
    );
    return { ok: true, attempts };
  } catch (err) {
    return { ok: false, error: (err as Error).message, attempts };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function emailHtml(alert: Alert): string {
  const deepLink = `${APP_URL}/admin/health/alerts/${alert.id}`;
  const sev = alert.severity.toUpperCase();
  const color = sev === "CRITICAL" || sev === "EMERGENCY" ? "#dc2626" : sev === "HIGH" ? "#ea580c" : "#ca8a04";
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;padding:24px;color:#e2e8f0;">
    <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
      <div style="background:${color};padding:16px 24px;color:#fff;font-weight:600;font-size:14px;letter-spacing:.5px;">
        ${severityEmoji(sev)} ${escapeHtml(sev)} · ${escapeHtml(alert.alert_type)}
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#f1f5f9;">${escapeHtml(alert.message)}</p>
        <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;">tenant: <code>${escapeHtml(alert.tenant_id ?? "n/a")}</code> · id: <code>${escapeHtml(alert.id)}</code><br>criado em ${escapeHtml(alert.created_at)}</p>
        <a href="${deepLink}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;">Abrir detalhes do alerta →</a>
        <p style="margin:24px 0 0;font-size:11px;color:#64748b;">Você recebeu este email porque possui uma assinatura ativa neste tipo/severidade. Ajuste em <a href="${APP_URL}/admin/health" style="color:#818cf8;">/admin/health</a>.</p>
      </div>
    </div>
  </body></html>`;
}

async function sendEmailWithRetry(to: string, alert: Alert): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "resend_not_configured" };
  try {
    await retry(
      async () => {
        const res = await fetchWithTimeout("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: ALERT_EMAIL_FROM,
            to: [to],
            subject: `${severityEmoji(alert.severity)} [${alert.severity}] ${alert.alert_type}`,
            html: emailHtml(alert),
          }),
          timeoutMs: 8_000,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          const err = new Error(`resend_status_${res.status}:${body.slice(0, 120)}`);
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            (err as Error & { __noRetry?: boolean }).__noRetry = true;
          }
          throw err;
        }
      },
      {
        retries: 2,
        baseDelayMs: 400,
        maxDelayMs: 4_000,
        shouldRetry: (err) => !(err as { __noRetry?: boolean })?.__noRetry,
      },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: alerts, error } = await admin
    .from("system_alerts")
    .select("id, tenant_id, alert_type, severity, message, metadata, created_at")
    .in("severity", ["HIGH", "CRITICAL"])
    .is("dispatched_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string; in_app?: number; slack_delivered?: number; slack_failed?: number }> = [];
  const seenWindow = new Map<string, string>();

  for (const alert of (alerts ?? []) as Alert[]) {
    const dedupeKey = `${alert.tenant_id ?? "global"}::${alert.alert_type}`;
    if (seenWindow.has(dedupeKey)) {
      await admin
        .from("system_alerts")
        .update({ dispatched_at: new Date().toISOString(), dispatch_status: "suppressed_dedup" })
        .eq("id", alert.id);
      results.push({ id: alert.id, ok: true, error: "deduped" });
      continue;
    }
    seenWindow.set(dedupeKey, alert.id);

    let inAppFanout = 0;
    let slackDelivered = 0;
    let slackFailed = 0;
    const slackErrors: string[] = [];

    try {
      const { data: subs } = await admin.rpc("alert_subscribers_for", {
        _alert_type: alert.alert_type,
        _severity: alert.severity,
      });
      const rows = (subs ?? []) as Array<{ user_id: string; channel: string; slack_webhook_url: string | null }>;

      // In-app fan-out
      const inApp = rows.filter((s) => s.channel === "in_app" || s.channel === "inapp");
      if (inApp.length > 0) {
        const payload = inApp.map((s) => ({
          user_id: s.user_id,
          tenant_id: alert.tenant_id,
          type: "system_alert",
          priority: alert.severity.toLowerCase() === "critical" ? "urgent" : "high",
          title: `${severityEmoji(alert.severity)} ${alert.alert_type}`,
          message: alert.message,
          action_url: `/admin/health/alerts/${alert.id}`,
          action_label: "Ver detalhes",
          data: { alert_id: alert.id, severity: alert.severity, alert_type: alert.alert_type },
        }));
        const { error: insErr } = await admin.from("notifications").insert(payload);
        if (!insErr) inAppFanout = payload.length;
      }

      // Slack fan-out por assinatura (com retry) — dedup por URL
      const slackSubs = rows.filter((s) => s.channel === "slack" && s.slack_webhook_url);
      const urls = new Set<string>(slackSubs.map((s) => s.slack_webhook_url!));
      // Fallback global se nenhuma assinatura Slack e webhook global configurado
      if (urls.size === 0 && GLOBAL_SLACK_WEBHOOK_URL) urls.add(GLOBAL_SLACK_WEBHOOK_URL);

      for (const url of urls) {
        const outcome = await postToSlackWithRetry(url, alert);
        if (outcome.ok) slackDelivered++;
        else {
          slackFailed++;
          slackErrors.push(outcome.error ?? "unknown");
        }
      }
    } catch (e) {
      slackErrors.push(`fanout_error:${(e as Error).message}`);
    }

    const overallOk = slackFailed === 0;
    await admin
      .from("system_alerts")
      .update({
        dispatched_at: new Date().toISOString(),
        dispatch_status: overallOk ? "delivered" : slackDelivered > 0 ? "partial" : "failed",
        dispatch_error: slackErrors.length > 0 ? slackErrors.join(" | ").slice(0, 500) : null,
        metadata: {
          ...(alert.metadata ?? {}),
          fanout: {
            in_app: inAppFanout,
            slack_delivered: slackDelivered,
            slack_failed: slackFailed,
          },
        },
      })
      .eq("id", alert.id);

    results.push({
      id: alert.id,
      ok: overallOk,
      error: slackErrors[0],
      in_app: inAppFanout,
      slack_delivered: slackDelivered,
      slack_failed: slackFailed,
    });
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
