import { parseISO } from "date-fns/parseISO";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte uma string de data vinda do Supabase em Date no fuso LOCAL.
 *
 * Colunas `DATE` do Postgres chegam como "YYYY-MM-DD". `new Date("YYYY-MM-DD")`
 * interpreta esse formato como UTC meia-noite, o que em fusos negativos
 * (ex.: UTC-3 no Brasil) renderiza o DIA ANTERIOR. Aqui forçamos meia-noite
 * local para datas sem hora; valores com hora (ISO/timestamptz) seguem o
 * comportamento normal.
 */
export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Formata uma data (date-only ou ISO) no padrão brasileiro, em fuso local. */
export function formatDateBR(
  value: string | Date | null | undefined,
  pattern = "dd/MM/yyyy",
  fallback = "—"
): string {
  const date = parseLocalDate(value);
  return date ? format(date, pattern, { locale: ptBR }) : fallback;
}
