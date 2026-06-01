import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique identifier suitable for React keys, draft form rows, and
 * other in-memory references. Prefers `crypto.randomUUID()` and falls back to a
 * timestamp+Math.random string when Web Crypto is unavailable (older browsers,
 * non-secure contexts).
 */
export function generateUniqueKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) {
    try { return c.randomUUID(); } catch { /* fall through */ }
  }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
