/**
 * INT-02: retry com backoff exponencial + jitter para chamadas idempotentes.
 * Não usar em POSTs não-idempotentes sem chave de idempotência.
 */

export interface RetryOptions {
  retries?: number;         // default 3
  baseDelayMs?: number;     // default 250
  maxDelayMs?: number;      // default 4000
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 250;
  const max = opts.maxDelayMs ?? 4000;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err, attempt)) throw err;
      const delay = Math.min(max, base * 2 ** attempt) * (0.5 + Math.random() * 0.5);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function defaultShouldRetry(err: unknown): boolean {
  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  // Timeouts, resets, 5xx e 429 são retryable
  return /timeout|timed out|econnreset|network|fetch failed|5\d\d|429/.test(msg);
}
