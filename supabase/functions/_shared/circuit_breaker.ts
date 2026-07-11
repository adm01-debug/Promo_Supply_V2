/**
 * INT-01: Circuit breaker leve em memória por instância de edge function.
 * Estados: CLOSED → (falhas ≥ threshold) → OPEN → (após cooldown) → HALF_OPEN → CLOSED
 *
 * Uso:
 *   const cb = getBreaker("spot", { failureThreshold: 5, cooldownMs: 30_000 });
 *   if (!cb.canRequest()) throw new Error("circuit_open");
 *   try { const r = await call(); cb.recordSuccess(); return r; }
 *   catch (e) { cb.recordFailure(); throw e; }
 */

export interface BreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
}

type State = "closed" | "open" | "half_open";

class Breaker {
  private failures = 0;
  private state: State = "closed";
  private openedAt = 0;
  constructor(private opts: Required<BreakerOptions>) {}

  canRequest(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.opts.cooldownMs) {
        this.state = "half_open";
        return true;
      }
      return false;
    }
    return true;
  }
  recordSuccess() { this.failures = 0; this.state = "closed"; }
  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.opts.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
  get status(): State { return this.state; }
}

const registry = new Map<string, Breaker>();

export function getBreaker(name: string, opts: BreakerOptions = {}): Breaker {
  const existing = registry.get(name);
  if (existing) return existing;
  const b = new Breaker({
    failureThreshold: opts.failureThreshold ?? 5,
    cooldownMs: opts.cooldownMs ?? 30_000,
  });
  registry.set(name, b);
  return b;
}
