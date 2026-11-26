/**
 * INT-05: traducao do atributo SCIM `active` para o estado real do usuario no
 * GoTrue. Vive num modulo proprio para ser testavel sem subir o servidor HTTP
 * de `index.ts`.
 */

/**
 * ~100 anos — a maior duracao pratica aceita pelo GoTrue; equivale a
 * "desativado ate o IdP mandar active:true" (que volta com `ban_duration: "none"`).
 */
export const BAN_DURATION_DESATIVADO = "876000h";

/**
 * O ban do GoTrue e o estado de desprovisionamento: `ban_duration` fica em
 * `banned_until`, e um valor no futuro significa conta desativada.
 */
export function estaAtivo(
  user: { banned_until?: string | null } | null | undefined,
  agora: number = Date.now(),
): boolean {
  const bannedUntil = user?.banned_until;
  if (!bannedUntil) return true;
  const ts = Date.parse(bannedUntil);
  // Data ilegivel nao pode virar "desativado": isso trancaria o usuario fora
  // por um erro de formato. Trata como ativo, que e o estado sem ban.
  return Number.isNaN(ts) ? true : ts <= agora;
}

/**
 * RFC 7643 §4.1.1 aceita `active` como booleano; alguns IdPs mandam a string
 * "true"/"false". Qualquer outro valor e erro do chamador — nunca "desativa
 * silenciosamente" nem "ativa por padrao".
 */
export function interpretarActive(valor: unknown): boolean | undefined {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") {
    const normalizado = valor.trim().toLowerCase();
    if (normalizado === "true") return true;
    if (normalizado === "false") return false;
  }
  return undefined;
}