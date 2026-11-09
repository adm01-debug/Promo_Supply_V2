import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

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

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (date: string | Date): string =>
  format(typeof date === 'string' ? new Date(date) : date, "dd/MM/yyyy", { locale: ptBR });

export const formatDateTime = (date: string | Date): string =>
  format(typeof date === 'string' ? new Date(date) : date, "dd/MM/yyyy HH:mm", { locale: ptBR });
