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
import { insertNotificationsBatch } from "../_shared/notifications.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyCronSecret, buildCorsHeaders } from "../_shared/security.ts";
import { fetchWithTimeout } from "../_shared/http.ts";
import { retry } from "../_shared/retry.ts";
import { recordCronHeartbeat } from "../_shared/cronHealth.ts";
import {
  classifyDispatch,
  previousAttempts,
  shouldRecordDeadLetter,
  DEAD_LETTER_ALERT_TYPE,
  type DispatchStatus,
} from "./dispatchStatus.ts";

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

/** Assinatura HMAC-SHA256 hex do body — usada quando webhook_secret está definido. */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendWebhookWithRetry(
  url: string,
  secret: string | null,
  alert: Alert,
): Promise<{ ok: boolean; error?: string }> {
  const body = JSON.stringify({
    event: "system_alert",
    alert: {
      id: alert.id,
      tenant_id: alert.tenant_id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata,
      created_at: alert.created_at,
    },
    deep_link: `${APP_URL}/admin/health/alerts/${alert.id}`,
    delivered_at: new Date().toISOString(),
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "lovable-alert-dispatcher/1.0",
    "X-Alert-Id": alert.id,
    "X-Alert-Type": alert.alert_type,
    "X-Alert-Severity": alert.severity,
  };
  if (secret) headers["X-Signature-256"] = `sha256=${await hmacSha256Hex(secret, body)}`;
  try {
    await retry(
      async () => {
        const res = await fetchWithTimeout(url, { method: "POST", headers, body, timeoutMs: 6_000 });
        if (!res.ok) {
          const err = new Error(`webhook_status_${res.status}`);
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

// deno-lint-ignore no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

/**
 * 171/EDG-05: `exhausted` carimba `dispatched_at`, entao o alerta nunca mais
 * volta para a fila (`dispatched_at IS NULL`) e a falha morre invisivel -- nada
 * no produto le `dispatch_status`. Aqui ela vira um alerta de segundo nivel,
 * que o proprio dispatcher entrega pelos canais normais.
 *
 * Dedupe por `alert_type` + tenant + `resolved_at IS NULL`: uma rodada com 50
 * alertas mortos abre um alerta, nao cinquenta. O `alert_type` proprio garante
 * que o dead letter nunca gere outro dead letter (nada de realimentar a fila).
 */
async function recordDeadLetter(
  admin: AdminClient,
  alert: Alert,
  attempts: number,
  errors: string[],
): Promise<void> {
  try {
    let aberto = admin
      .from("system_alerts")
      .select("id")
      .eq("alert_type", DEAD_LETTER_ALERT_TYPE)
      .is("resolved_at", null)
      .limit(1);
    aberto = alert.tenant_id ? aberto.eq("tenant_id", alert.tenant_id) : aberto.is("tenant_id", null);
    const { data: existentes, error: dedupeError } = await aberto;
    if (dedupeError) throw new Error(dedupeError.message);
    if ((existentes ?? []).length > 0) return;

    const { error } = await admin.from("system_alerts").insert({
      tenant_id: alert.tenant_id,
      alert_type: DEAD_LETTER_ALERT_TYPE,
      severity: "HIGH",
      message:
        `Alerta ${alert.alert_type} nao foi entregue por nenhum canal apos ${attempts} tentativas`,
      metadata: {
        source_alert_id: alert.id,
        source_alert_type: alert.alert_type,
        source_severity: alert.severity,
        source_message: alert.message.slice(0, 500),
        attempts,
        errors: errors.slice(0, 5),
      },
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    // Nao derruba a rodada: o alerta original ja foi persistido.
    console.error(JSON.stringify({
      level: "ERROR",
      event: "alert_dispatch_dead_letter_failed",
      alert_id: alert.id,
      error: (e as Error).message,
      ts: new Date().toISOString(),
    }));
  }
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const cronDenied = verifyCronSecret(req);
  if (cronDenied) return cronDenied;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: alerts, error } = await admin
    .from("system_alerts")
    .select("id, tenant_id, alert_type, severity, message, metadata, created_at")
    .in("severity", ["HIGH", "CRITICAL", "EMERGENCY", "high", "critical", "emergency"])
    .is("dispatched_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; status: DispatchStatus | "suppressed_dedup"; error?: string; in_app?: number; slack_delivered?: number; slack_failed?: number }> = [];
  const seenWindow = new Map<string, string>();

  // #209/#210: a severidade e canonica no banco a partir da migration 20261127170000;
  // normalizar aqui cobre as linhas antigas em minusculas enquanto a migration nao roda.
  const pendentes = ((alerts ?? []) as Alert[]).map((a) => ({ ...a, severity: a.severity.toUpperCase() }));

  for (const alert of pendentes) {
    const dedupeKey = `${alert.tenant_id ?? "global"}::${alert.alert_type}`;
    if (seenWindow.has(dedupeKey)) {
      // 182: supressao por janela de silencio ADIA o alerta, nao o apaga. Sem
      // `dispatched_at` ele volta na proxima rodada (1 min) e, sendo o primeiro da
      // janela, e entregue.
      await admin
        .from("system_alerts")
        .update({ dispatch_status: "suppressed_dedup" })
        .eq("id", alert.id);
      results.push({ id: alert.id, ok: true, status: "suppressed_dedup", error: "deduped" });
      continue;
    }
    seenWindow.set(dedupeKey, alert.id);

    let inAppFanout = 0;
    let slackDelivered = 0;
    let slackFailed = 0;
    let emailDelivered = 0;
    let emailFailed = 0;
    const slackErrors: string[] = [];
    const emailErrors: string[] = [];
    let webhookDelivered = 0;
    let webhookFailed = 0;
    const webhookErrors: string[] = [];
    let subscriberRows = 0;
    let fanoutError = false;

    try {
      const { data: subs } = await admin.rpc("alert_subscribers_for", {
        _alert_type: alert.alert_type,
        _severity: alert.severity.toUpperCase(),
      });
      const rows = (subs ?? []) as Array<{ user_id: string; channel: string; slack_webhook_url: string | null; email: string | null; webhook_url: string | null; webhook_secret: string | null }>;
      subscriberRows = rows.length;

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
        const { inserted } = await insertNotificationsBatch(admin, payload);
        inAppFanout = inserted;
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

      // Email fan-out por assinatura (Resend) — dedup por endereço
      const emailSubs = rows.filter((s) => s.channel === "email" && s.email);
      const emails = new Set<string>(emailSubs.map((s) => s.email!.trim().toLowerCase()).filter(Boolean));
      for (const to of emails) {
        const outcome = await sendEmailWithRetry(to, alert);
        if (outcome.ok) emailDelivered++;
        else {
          emailFailed++;
          emailErrors.push(outcome.error ?? "unknown");
        }
      }
      // Webhook fan-out por assinatura — dedup por URL (assinatura própria via HMAC opcional)
      const webhookSubs = rows.filter((s) => s.channel === "webhook" && s.webhook_url);
      const seenWebhook = new Map<string, string | null>();
      for (const s of webhookSubs) {
        if (!seenWebhook.has(s.webhook_url!)) seenWebhook.set(s.webhook_url!, s.webhook_secret);
      }
      for (const [url, secret] of seenWebhook) {
        const outcome = await sendWebhookWithRetry(url, secret, alert);
        if (outcome.ok) webhookDelivered++;
        else {
          webhookFailed++;
          webhookErrors.push(outcome.error ?? "unknown");
        }
      }
    } catch (e) {
      fanoutError = true;
      slackErrors.push(`fanout_error:${(e as Error).message}`);
    }

    const nowIso = new Date().toISOString();
    const allErrors = [...slackErrors, ...emailErrors, ...webhookErrors];

        // 182/188: ver `dispatchStatus.ts` — `dispatched_at` volta a significar
        // "entregue", e nao "tentei"; sem canal nenhum o alerta fica em
        // `no_subscribers` sem carimbo para ser entregue quando houver assinatura.
        const outcome = classifyDispatch(
          {
            inAppFanout,
            slackDelivered,
            slackFailed,
            emailDelivered,
            emailFailed,
            webhookDelivered,
            webhookFailed,
            fanoutError,
            subscriberRows,
            hasGlobalSlack: Boolean(GLOBAL_SLACK_WEBHOOK_URL),
            previousAttempts: previousAttempts(alert.metadata),
          },
          nowIso,
        );
        const { status: dispatchStatus, attempts, overallOk } = outcome;
        const noChannel = dispatchStatus === "no_subscribers";

    await admin
      .from("system_alerts")
      .update({
            dispatched_at: outcome.dispatchedAt,
        dispatch_status: dispatchStatus,
        dispatch_error: allErrors.length > 0
          ? allErrors.join(" | ").slice(0, 500)
          : noChannel
            ? "sem assinaturas em alert_subscriptions e sem SLACK_WEBHOOK_URL global"
            : null,
        metadata: {
          ...(alert.metadata ?? {}),
          fanout: {
            attempts,
            in_app: inAppFanout,
            slack_delivered: slackDelivered,
            slack_failed: slackFailed,
            email_delivered: emailDelivered,
            email_failed: emailFailed,
            webhook_delivered: webhookDelivered,
            webhook_failed: webhookFailed,
          },
        },
      })
      .eq("id", alert.id);

          // 171/EDG-05: `exhausted` e a falha definitiva (carimbou `dispatched_at`).
          // Sem isso a falha fica so na coluna que ninguem le.
          if (shouldRecordDeadLetter(dispatchStatus, alert.alert_type)) {
            await recordDeadLetter(admin, alert, attempts, allErrors);
          }

    results.push({
      id: alert.id,
      ok: overallOk,
      status: dispatchStatus,
      error: allErrors[0],
      in_app: inAppFanout,
      slack_delivered: slackDelivered,
      slack_failed: slackFailed,
    });
  }

  await recordCronHeartbeat(admin, "alert-dispatcher");
  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
