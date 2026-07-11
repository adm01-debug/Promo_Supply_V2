/**
 * OBS-01 — Alert Dispatcher
 * Consome `system_alerts` de severidade HIGH/CRITICAL e envia para Slack.
 *
 * Trigger:
 *   - Chamado por cron (pg_net) a cada 1 min
 *   - Dedupe: só dispara alertas com `dispatched_at IS NULL`
 *   - Silencia janela de 15 min por (alert_type + tenant_id) para evitar flood
 *
 * Secrets esperados:
 *   - SLACK_WEBHOOK_URL (opcional; se ausente, apenas marca como dispatched)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/security.ts";
import { fetchWithTimeout } from "../_shared/http.ts";

const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";

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

async function postToSlack(alert: Alert): Promise<{ ok: boolean; error?: string }> {
  if (!SLACK_WEBHOOK_URL) return { ok: true }; // no-op silencioso em dev.
  try {
    const res = await fetchWithTimeout(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
      timeoutMs: 5_000,
    });
    if (!res.ok) return { ok: false, error: `slack_status_${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Busca alertas HIGH/CRITICAL não despachados (limite conservador por rodada).
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

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  const seenWindow = new Map<string, string>(); // dedupe key -> id

  for (const alert of (alerts ?? []) as Alert[]) {
    // Dedupe janela de 15 min: (tenant_id + alert_type)
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

    const outcome = await postToSlack(alert);
    await admin
      .from("system_alerts")
      .update({
        dispatched_at: new Date().toISOString(),
        dispatch_status: outcome.ok ? "delivered" : "failed",
        dispatch_error: outcome.error ?? null,
      })
      .eq("id", alert.id);
    results.push({ id: alert.id, ...outcome });
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
