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

/**
 * Converte texto de data para `Date`. Data SEM hora ("2024-06-15", coluna `date`
 * do Postgres ou <input type="date">) é lida como meia-noite LOCAL: `new Date()`
 * a lê como meia-noite UTC, que no Brasil (UTC−3) vira o dia anterior às 21h —
 * exibia 14/06 para "2024-06-15" e recusava "hoje" no prazo de entrega.
 * Com hora/fuso, mantém o comportamento de `new Date()`.
 */
export const parseDateValue = (value: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
};

export const formatDate = (date: string | Date): string =>
  format(typeof date === 'string' ? parseDateValue(date) : date, "dd/MM/yyyy", { locale: ptBR });

export const formatDateTime = (date: string | Date): string =>
  format(typeof date === 'string' ? parseDateValue(date) : date, "dd/MM/yyyy HH:mm", { locale: ptBR });
