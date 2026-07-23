import { safeTruncate } from "@/lib/safeTruncate";

/**
 * Helper unificado para exibição segura de strings em UI (toasts, mensagens
 * de erro, labels truncados). Substitui usos ad-hoc de `.slice(0, N)` que
 * podem quebrar surrogate pairs UTF-16 e produzir U+FFFD ao serializar.
 *
 * - Trunca em `maxUnits` code units UTF-16, sem cortar surrogate pair.
 * - Acrescenta `ellipsis` (default: "…") somente quando houve truncamento.
 * - O comprimento final em code units é sempre `<= maxUnits`.
 * - Aceita valores nulos/indefinidos e retorna `fallback` (default: "").
 */
export interface SafeDisplayOptions {
  ellipsis?: string;
  fallback?: string;
}

export function safeDisplay(
  input: string | null | undefined,
  maxUnits: number,
  options: SafeDisplayOptions = {},
): string {
  const { ellipsis = "…", fallback = "" } = options;
  if (input == null) return fallback;
  const str = String(input);
  if (maxUnits <= 0) return "";
  if (str.length <= maxUnits) return str;

  const ellipsisUnits = ellipsis.length;
  // Se o ellipsis já não cabe, apenas trunca sem sufixo.
  if (ellipsisUnits >= maxUnits) {
    return safeTruncate(str, maxUnits);
  }
  const head = safeTruncate(str, maxUnits - ellipsisUnits);
  return `${head}${ellipsis}`;
}
