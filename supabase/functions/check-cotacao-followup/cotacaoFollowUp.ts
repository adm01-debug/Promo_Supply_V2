/**
 * Regras puras do follow-up de cota??o pendente.
 *
 * Por que mora aqui: o cron `cotacao-followup-check` (job 116) chamava a edge
 * `check-cotacao-followup`, que deduplicava por `ilike('%numero%')` no texto da
 * notifica??o. Substring casa n?mero errado (`COT-1` casa `COT-12`), ent?o uma
 * cota??o podia ficar sem follow-up porque a vizinha j? tinha sido alertada.
 * As colunas `cotacoes.last_follow_up_at` / `follow_up_status` existiam desde a
 * migration `20260517191414` e nunca eram escritas, ent?o a UI que as consome
 * sempre renderizava vazio.
 *
 * Separado do handler para poder testar sem Supabase (cotacaoFollowUp_test.ts).
 */

/** Follow-up s? depois de 48h sem resposta do fornecedor. */
export const FOLLOW_UP_AFTER_HOURS = 48;

/** Mesmo n?mero nunca gera dois follow-ups dentro dessa janela. */
export const FOLLOW_UP_DEDUPE_HOURS = 24;

export interface StaleCotacaoRow {
  id: string;
  numero: string | null;
  created_at: string | null;
}

export function cutoffIso(now: Date, hours = FOLLOW_UP_AFTER_HOURS): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

/** Data de refer?ncia do dedupe: o envio anterior mais recente, se houver. */
export function dedupeSinceIso(now: Date, hours = FOLLOW_UP_DEDUPE_HOURS): string {
  return cutoffIso(now, hours);
}

/**
 * Marca textual exata usada na notifica??o. Delimitada por `#` e espa?o para
 * permitir dedupe por n?mero inteiro, nunca por prefixo.
 */
export function quoteMarker(numero: string | null, id: string): string {
  const ref = (numero ?? "").trim();
  return ref ? `#${ref} ` : `#${id} `;
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (m) => `\\${m}`);
}

/**
 * Padr?o de busca do dedupe. `quoteMarker` termina com espa?o, ent?o
 * `%#COT-1 %` N?O casa `#COT-12 `. Os curingas do usu?rio s?o escapados para
 * que um n?mero com `%` ou `_` n?o amplie o casamento.
 */
export function dedupePattern(numero: string | null, id: string): string {
  return `%${escapeLike(quoteMarker(numero, id))}%`;
}

export interface FollowUpDecision {
  shouldNotify: boolean;
  reason?: "sem_destinatario" | "recente_duplicada";
}

/**
 * Decide se a cota??o precisa de follow-up agora.
 * `ultimoFollowUpIso` vem de `cotacoes.last_follow_up_at` ? ? mais barato e mais
 * exato que varrer `notifications`, e ? o campo que a UI j? exibe.
 */
export function shouldSendFollowUp(
  cotacao: StaleCotacaoRow,
  solicitanteId: string | null | undefined,
  ultimoFollowUpIso: string | null | undefined,
  now: Date,
  dedupeHours = FOLLOW_UP_DEDUPE_HOURS,
): FollowUpDecision {
  if (!solicitanteId) return { shouldNotify: false, reason: "sem_destinatario" };
  if (ultimoFollowUpIso) {
    const last = Date.parse(ultimoFollowUpIso);
    if (!Number.isNaN(last) && now.getTime() - last < dedupeHours * 60 * 60 * 1000) {
      return { shouldNotify: false, reason: "recente_duplicada" };
    }
  }
  return { shouldNotify: true };
}

/** Cota??o antiga o bastante para cobrar resposta. Datas inv?lidas s?o ignoradas. */
export function isStale(cotacao: StaleCotacaoRow, now: Date, hours = FOLLOW_UP_AFTER_HOURS): boolean {
  if (!cotacao.created_at) return false;
  const created = Date.parse(cotacao.created_at);
  if (Number.isNaN(created)) return false;
  return now.getTime() - created >= hours * 60 * 60 * 1000;
}
