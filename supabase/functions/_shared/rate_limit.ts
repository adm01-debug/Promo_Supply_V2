/**
 * Rate limit helper compartilhado para edge functions.
 * Usa a função Postgres public.check_rate_limit() para janela uniforme.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  identifier: string;      // user_id, ip ou "source:key"
  endpoint: string;        // nome lógico do endpoint / webhook
  maxRequests?: number;    // default 60
  windowSeconds?: number;  // default 60
}

export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const { data, error } = await admin.rpc("check_rate_limit", {
    _identifier: opts.identifier,
    _endpoint: opts.endpoint,
    _max_requests: opts.maxRequests ?? 60,
    _window_seconds: opts.windowSeconds ?? 60,
  });

  if (error) {
    // Falha aberta em erro para não derrubar produção; loga silenciosamente.
    console.error("[rate_limit] fallback allow:", error.message);
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: !!row?.allowed,
    remaining: row?.remaining ?? 0,
    retryAfterSeconds: row?.retry_after_seconds ?? 0,
  };
}

export function rateLimitedResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(
    JSON.stringify({ error: "rate_limited", retry_after_seconds: retryAfter }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  );
}
