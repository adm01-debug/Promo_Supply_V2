/**
 * Idempotência para webhooks: garante que o mesmo evento (source + idempotency_key)
 * seja processado uma única vez, retornando o payload cacheado nas próximas chamadas.
 *
 * Uso típico:
 *   const key = extractKeyFromWebhook(req); // e.g. header X-Idempotency-Key ou hash do body
 *   const cached = await getIdempotentResponse("spot", key);
 *   if (cached) return cached.response();
 *   const result = await processWebhook(...);
 *   await recordIdempotentResponse("spot", key, result);
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface CachedResponse {
  status: "processed" | "failed" | "processing";
  payload: unknown;
  response(corsHeaders?: Record<string, string>): Response;
}

export async function getIdempotentResponse(
  source: string,
  key: string,
): Promise<CachedResponse | null> {
  if (!key) return null;
  const { data, error } = await admin()
    .from("webhook_events")
    .select("status, response_payload, error_message")
    .eq("source", source)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error || !data) return null;

  return {
    status: data.status as CachedResponse["status"],
    payload: data.response_payload,
    response(corsHeaders = {}) {
      const body = data.status === "failed"
        ? { error: data.error_message ?? "previously failed", idempotent_replay: true }
        : { ...(typeof data.response_payload === "object" && data.response_payload ? data.response_payload : { result: data.response_payload }), idempotent_replay: true };
      return new Response(JSON.stringify(body), {
        status: data.status === "failed" ? 409 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Idempotent-Replay": "true" },
      });
    },
  };
}

export async function recordIdempotentResponse(
  source: string,
  key: string,
  payload: unknown,
  opts: { status?: "processed" | "failed"; errorMessage?: string; headers?: Record<string, string> } = {},
): Promise<void> {
  if (!key) return;
  await admin()
    .from("webhook_events")
    .upsert(
      {
        source,
        idempotency_key: key,
        status: opts.status ?? "processed",
        response_payload: payload as any,
        error_message: opts.errorMessage ?? null,
        request_headers: opts.headers ?? null,
      },
      { onConflict: "source,idempotency_key" },
    );
}

/**
 * Deriva uma chave estável a partir do request quando o cliente não envia
 * X-Idempotency-Key: usa (source + hash do body). SHA-256 hex.
 */
export async function deriveIdempotencyKey(req: Request, bodyText: string): Promise<string> {
  const header = req.headers.get("x-idempotency-key") || req.headers.get("idempotency-key");
  if (header) return header.trim();
  const data = new TextEncoder().encode(bodyText || "");
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
