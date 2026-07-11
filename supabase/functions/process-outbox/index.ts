/**
 * INT-06 / OBS-01 — Outbox Worker
 * Processa `integration_outbox` (padrão outbox para integrações outbound).
 * Chamado periodicamente por cron (pg_net) ou manualmente.
 *
 * Comportamento:
 *   - SELECT ... FOR UPDATE SKIP LOCKED (via RPC) para concorrência segura
 *   - Backoff exponencial em falha: retries=0..5, next_attempt = now + 2^retries * 30s
 *   - Marca como 'delivered' em sucesso, 'dead' após 5 tentativas
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/security.ts";
import { fetchWithTimeout, FetchTimeoutError } from "../_shared/http.ts";

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();
  const { data: rows, error } = await admin
    .from("integration_outbox")
    .select("id, target, endpoint, payload, retries, headers")
    .in("status", ["pending", "retrying"])
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      results.push({ id: row.id, ok: false, error: errMsg, retries });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
