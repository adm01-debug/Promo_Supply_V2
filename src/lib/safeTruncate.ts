/**
 * Trunca uma string em no máximo `maxUnits` UTF-16 code units SEM quebrar
 * um surrogate pair (evita gerar lone surrogates que viram U+FFFD ao
 * serem codificados em UTF-8).
 *
 * Espelha `safeTruncate` de `supabase/functions/_shared/logLevel.ts` para uso
 * no frontend em pontos que truncam texto arbitrário (mensagens de erro,
 * descrições exibidas ao usuário, campos vindos de APIs externas).
 *
 * Garantias:
 *  - `result.length <= maxUnits`
 *  - `JSON.stringify(result)` é sempre válido e reversível
 *  - `new TextEncoder().encode(result)` nunca insere U+FFFD para input válido
 */
export function safeTruncate(input: string, maxUnits: number): string {
  if (maxUnits <= 0) return "";
  if (input.length <= maxUnits) return input;
  let end = maxUnits;
  const code = input.charCodeAt(end - 1);
  // Se cortamos exatamente entre um high e low surrogate, recua 1 code unit.
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return input.slice(0, end);
}
