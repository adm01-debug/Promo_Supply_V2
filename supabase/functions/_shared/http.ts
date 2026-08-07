/**
 * B-05: fetch com AbortController e timeout uniforme para APIs externas.
 * Uso:
 *   const res = await fetchWithTimeout(url, { method: "POST", body }, 10_000);
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`fetch timed out after ${timeoutMs}ms → ${url}`);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  opts: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 10_000, signal: externalSignal, ...init } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Encadeia com signal externo (permite cancelamento manual do caller).
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Onda 62 · R-03 — Headers de segurança uniformes para respostas de edge functions.
 * Merge com corsHeaders + Content-Type no wrapper de resposta.
 */
export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
};

/**
 * Constrói cabeçalhos padrão para respostas JSON de edge functions.
 * Uso: return new Response(body, { headers: buildResponseHeaders(corsHeaders) })
 */
export function buildResponseHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    ...securityHeaders,
    ...extra,
  };
}
