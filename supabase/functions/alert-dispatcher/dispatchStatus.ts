/**
 * 182/188: `dispatched_at` acumulava dois significados ("tentei entregar" e
 * "entreguei") e o status era o inverso do que importa: sucesso era a AUSENCIA
 * de falha, nao a presenca de entrega. Com zero assinaturas os tres contadores
 * de falha ficavam em 0, `overallOk` virava `true` e o alerta era gravado como
 * `delivered` sem ter ido a ninguem -- e, como o seletor exige
 * `dispatched_at IS NULL`, ele nunca voltava.
 *
 * Regra agora:
 *   entregou algo            -> `delivered` / `partial`, carimba `dispatched_at`
 *   nao ha canal nenhum      -> `no_subscribers`, SEM carimbo (volta quando o
 *                               dono cadastrar uma assinatura), ate o teto
 *   havia canal e falhou     -> `failed`, SEM carimbo (volta na proxima rodada)
 *   esgotou as tentativas    -> `exhausted`, carimba para parar de tentar
 */

/** Tentativas com canal configurado antes de desistir do alerta. */
export const MAX_DELIVERY_ATTEMPTS = 5;

/** Tentativas sem nenhum assinante antes de parar de reprocessar. */
export const MAX_UNCONFIGURED_ATTEMPTS = 30;

export type DispatchStatus =
  | "delivered"
  | "partial"
  | "failed"
  | "exhausted"
  | "no_subscribers";

export interface DispatchInput {
  inAppFanout: number;
  slackDelivered: number;
  slackFailed: number;
  emailDelivered: number;
  emailFailed: number;
  webhookDelivered: number;
  webhookFailed: number;
  /** O fan-out estourou (rpc/excecao): nenhuma tentativa foi contabilizada. */
  fanoutError: boolean;
  /** Linhas devolvidas por `alert_subscribers_for`. */
  subscriberRows: number;
  /** Existe `SLACK_WEBHOOK_URL` global como ultimo canal. */
  hasGlobalSlack: boolean;
  /** `metadata.fanout.attempts` da rodada anterior. */
  previousAttempts: number;
}

export interface DispatchOutcome {
  status: DispatchStatus;
  /** `null` = o alerta continua na fila do dispatcher. */
  dispatchedAt: string | null;
  attempts: number;
  anyDelivered: boolean;
  overallOk: boolean;
}

export function classifyDispatch(input: DispatchInput, nowIso: string): DispatchOutcome {
  const anyDelivered =
    input.inAppFanout + input.slackDelivered + input.emailDelivered + input.webhookDelivered > 0;
  const attempts = input.previousAttempts > 0 ? input.previousAttempts + 1 : 1;
  const overallOk = !input.fanoutError &&
    input.slackFailed === 0 &&
    input.emailFailed === 0 &&
    input.webhookFailed === 0;
  const noChannel = input.subscriberRows === 0 && !input.hasGlobalSlack;

  if (anyDelivered) {
    return {
      status: overallOk ? "delivered" : "partial",
      dispatchedAt: nowIso,
      attempts,
      anyDelivered,
      overallOk,
    };
  }
  if (noChannel) {
    return {
      status: "no_subscribers",
      dispatchedAt: attempts >= MAX_UNCONFIGURED_ATTEMPTS ? nowIso : null,
      attempts,
      anyDelivered,
      overallOk,
    };
  }
  if (attempts >= MAX_DELIVERY_ATTEMPTS) {
    return { status: "exhausted", dispatchedAt: nowIso, attempts, anyDelivered, overallOk };
  }
  return { status: "failed", dispatchedAt: null, attempts, anyDelivered, overallOk };
}

/** 171/EDG-05: `alert_type` proprio do alerta de segundo nivel. */
export const DEAD_LETTER_ALERT_TYPE = "alert_dispatch_dead_letter";

/**
 * 171/EDG-05: so a falha definitiva (`exhausted`, que carimba `dispatched_at`)
 * vira alerta de segundo nivel -- `failed` ainda volta na proxima rodada. O
 * proprio dead letter nunca gera outro, o que evita realimentar a fila.
 */
export function shouldRecordDeadLetter(status: DispatchStatus, alertType: string): boolean {
  return status === "exhausted" && alertType !== DEAD_LETTER_ALERT_TYPE;
}

/** Le `metadata.fanout.attempts` sem confiar no formato do jsonb. */
export function previousAttempts(metadata: Record<string, unknown> | null): number {
  const fanout = metadata?.["fanout"];
  if (!fanout || typeof fanout !== "object") return 0;
  const attempts = (fanout as Record<string, unknown>)["attempts"];
  return typeof attempts === "number" && Number.isFinite(attempts) && attempts > 0 ? attempts : 0;
}