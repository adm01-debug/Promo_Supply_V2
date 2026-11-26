/**
 * INT-06 / OBS-01 — Outbox Worker
 * Processa `integration_outbox` (padrão outbox para integrações outbound).
 * Chamado periodicamente por cron (pg_net) ou manualmente.
 *
 * Comportamento:
 *   - Claim atomico via RPC public.claim_outbox_batch (FOR UPDATE SKIP LOCKED + lease de 10 min)
 *   - Backoff exponencial em falha: retries=0..5, next_attempt = now + 2^retries * 30s
 *   - Marca como 'delivered' em sucesso, 'dead' após 5 tentativas
 *   - Quando um item atinge 'dead': loga structured error. O alerta em
 *     system_alerts NAO e emitido aqui: quem emite e o gatilho transacional
 *     trg_alert_on_outbox_dead (public.alert_on_outbox_dead), que roda no
 *     mesmo UPDATE e nao pode se perder. O insert best-effort que existia
 *     neste arquivo duplicava o alerta e engolia o proprio erro.
 *
 * Claim: a RPC public.claim_outbox_batch (migration 20261127150000) reserva
 * o lote com FOR UPDATE SKIP LOCKED e um lease de 10 min, de modo que duas
 * execucoes sobrepostas do cron nunca entregam a mesma mensagem.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyCronSecret, buildCorsHeaders } from "../_shared/security.ts";
import { fetchWithTimeout, FetchTimeoutError } from "../_shared/http.ts";
import { recordCronHeartbeat } from "../_shared/cronHealth.ts";

const MAX_RETRIES = 5;
const BATCH_SIZE = 20;

interface OutboxRow {
  id: string;
  target: string;      // 'bitrix' | 'inter' | 'whatsapp' | 'erp' | ...
  endpoint: string;    // URL destino
  payload: unknown;
  retries: number;
  headers: Record<string, string> | null;
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

  const { data: rows, error } = await admin.rpc("claim_outbox_batch", {
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    await recordCronHeartbeat(admin, "process-outbox", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string; retries: number }> = [];

  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      const res = await fetchWithTimeout(row.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(row.headers ?? {}) },
        body: JSON.stringify(row.payload),
        timeoutMs: 15_000,
      });
      if (!res.ok) throw new Error(`http_${res.status}`);

      await admin
        .from("integration_outbox")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);
      results.push({ id: row.id, ok: true, retries: row.retries });
    } catch (err) {
      const retries = row.retries + 1;
      const dead = retries >= MAX_RETRIES;
      const backoffSecs = Math.min(3600, 30 * Math.pow(2, retries)); // cap 1h
      const nextAttempt = new Date(Date.now() + backoffSecs * 1000).toISOString();
      const errMsg = err instanceof FetchTimeoutError ? "timeout" : (err as Error).message;

      await admin
        .from("integration_outbox")
        .update({
          status: dead ? "dead" : "retrying",
          retries,
          next_attempt_at: dead ? null : nextAttempt,
          last_error: errMsg,
        })
        .eq("id", row.id);

      if (dead) {
        console.error(JSON.stringify({
          level: "ERROR",
          event: "outbox_item_dead",
          id: row.id,
          target: row.target,
          endpoint: row.endpoint,
          retries,
          last_error: errMsg,
          ts: new Date().toISOString(),
        }));
      }

      results.push({ id: row.id, ok: false, error: errMsg, retries });
    }
  }

  const deadCount = results.filter(r => !r.ok && r.retries >= MAX_RETRIES).length;

  await recordCronHeartbeat(admin, "process-outbox");
  return new Response(
    JSON.stringify({ processed: results.length, dead: deadCount, results }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
