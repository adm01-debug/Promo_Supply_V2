/**
 * INT-01 extended: chamada unificada ao Lovable AI Gateway com
 * circuit breaker + retry (5xx/429/timeout) + timeout de 30s.
 *
 * Sob falha sustentada (5 erros seguidos) abre o breaker por 30s,
 * retornando 503 imediato e preservando quota/latency.
 */
import { fetchWithTimeout } from "./http.ts";
import { retry } from "./retry.ts";
import { getBreaker } from "./circuit_breaker.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export class AIGatewayCircuitOpenError extends Error {
  constructor() {
    super("ai_gateway_circuit_open");
    this.name = "AIGatewayCircuitOpenError";
  }
}

export interface CallAIGatewayOptions {
  apiKey: string;
  body: unknown;
  timeoutMs?: number;
  retries?: number;
}

export async function callAIGateway(opts: CallAIGatewayOptions): Promise<Response> {
  const breaker = getBreaker("ai-gateway", { failureThreshold: 5, cooldownMs: 30_000 });
  if (!breaker.canRequest()) throw new AIGatewayCircuitOpenError();

  try {
    const res = await retry(
      () => fetchWithTimeout(GATEWAY_URL, {
        method: "POST",
        timeoutMs: opts.timeoutMs ?? 30_000,
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(opts.body),
      }),
      {
        retries: opts.retries ?? 2,
        shouldRetry: (err) => /5\d\d|429|timeout|network|fetch failed/i.test(String((err as Error)?.message)),
      },
    );

    // 5xx conta como falha para o breaker; 4xx (incl. 402/429) é resposta válida do gateway.
    if (res.status >= 500) breaker.recordFailure();
    else breaker.recordSuccess();
    return res;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}

export function circuitOpenResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "ai_gateway_unavailable", retry_after_seconds: 30 }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "30" },
    },
  );
}

/**
 * Wraps callAIGateway with a deterministic fallback.
 *
 * When the AI gateway is unavailable (circuit open, network failure, or
 * non-200 status), `fallbackFn` is called with an explanation and its return
 * value is used as the response body. The response always includes
 * `"_fallback": true` so callers can show a degraded-mode indicator in the UI.
 *
 * @param opts        Same options as callAIGateway.
 * @param fallbackFn  Pure function → plain object to return when AI fails.
 * @param corsHeaders CORS headers to attach.
 */
export async function callAIGatewayWithFallback<T extends Record<string, unknown>>(
  opts: CallAIGatewayOptions,
  fallbackFn: (reason: string) => T,
  corsHeaders: Record<string, string>,
): Promise<{ response: Response; usedFallback: boolean }> {
  let reason = "unknown";

  try {
    const res = await callAIGateway(opts);
    if (res.ok) {
      return { response: res, usedFallback: false };
    }
    reason = `ai_gateway_status_${res.status}`;
    // Consume body to release the network socket
    await res.text().catch(() => null);
  } catch (err) {
    reason = err instanceof AIGatewayCircuitOpenError
      ? "circuit_open"
      : err instanceof Error ? err.message : "network_error";
  }

  const fallbackBody = { ...fallbackFn(reason), _fallback: true, _fallback_reason: reason };
  return {
    response: new Response(JSON.stringify(fallbackBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-AI-Fallback": "1" },
    }),
    usedFallback: true,
  };
}
