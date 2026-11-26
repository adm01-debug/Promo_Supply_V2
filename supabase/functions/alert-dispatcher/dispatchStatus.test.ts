/**
 * Etapa 182/188 do plano (INT-10 + JOB-02).
 *
 * Antes desta correcao: `dispatch_status` era `overallOk ? "delivered" : ...`,
 * entao zero canal = zero falha = "delivered", e `dispatched_at` era SEMPRE
 * carimbado -- inclusive em `failed`. Como o seletor so pega
 * `dispatched_at IS NULL`, o alerta saia da fila para sempre.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  MAX_DELIVERY_ATTEMPTS,
  MAX_UNCONFIGURED_ATTEMPTS,
  classifyDispatch,
  previousAttempts,
  type DispatchInput,
} from './dispatchStatus.ts';

const NOW = '2026-11-26T12:00:00.000Z';

const base: DispatchInput = {
  inAppFanout: 0,
  slackDelivered: 0,
  slackFailed: 0,
  emailDelivered: 0,
  emailFailed: 0,
  webhookDelivered: 0,
  webhookFailed: 0,
  fanoutError: false,
  subscriberRows: 0,
  hasGlobalSlack: false,
  previousAttempts: 0,
};

const com = (patch: Partial<DispatchInput>): DispatchInput => ({ ...base, ...patch });

Deno.test('188: nenhum assinante e nenhum webhook global nao pode ser "delivered"', () => {
  const r = classifyDispatch(com({}), NOW);
  assertEquals(r.status, 'no_subscribers');
  assertEquals(r.anyDelivered, false);
  // sem carimbo: o alerta volta na proxima rodada, para ser entregue se o dono
  // cadastrar uma assinatura em alert_subscriptions
  assertEquals(r.dispatchedAt, null);
});

Deno.test('188: zero assinantes para de reprocessar depois do teto', () => {
  const r = classifyDispatch(com({ previousAttempts: MAX_UNCONFIGURED_ATTEMPTS - 1 }), NOW);
  assertEquals(r.status, 'no_subscribers');
  assertEquals(r.dispatchedAt, NOW);
});

Deno.test('182: falha total com canal configurado nao carimba dispatched_at', () => {
  const r = classifyDispatch(
    com({ subscriberRows: 1, slackFailed: 1, emailFailed: 0 }),
    NOW,
  );
  assertEquals(r.status, 'failed');
  assertEquals(r.dispatchedAt, null);
  assertEquals(r.attempts, 1);
});

Deno.test('182: falha total desiste depois de MAX_DELIVERY_ATTEMPTS', () => {
  const r = classifyDispatch(
    com({ subscriberRows: 1, slackFailed: 1, previousAttempts: MAX_DELIVERY_ATTEMPTS - 1 }),
    NOW,
  );
  assertEquals(r.status, 'exhausted');
  assertEquals(r.dispatchedAt, NOW);
  assertEquals(r.attempts, MAX_DELIVERY_ATTEMPTS);
});

Deno.test('182: excecao no fan-out conta como falha, nao como sucesso', () => {
  const r = classifyDispatch(com({ subscriberRows: 2, fanoutError: true }), NOW);
  assertEquals(r.status, 'failed');
  assertEquals(r.dispatchedAt, null);
  assertEquals(r.overallOk, false);
});

Deno.test('188: entregou para alguem mas um canal falhou = partial, carimbado', () => {
  const r = classifyDispatch(
    com({ subscriberRows: 2, inAppFanout: 1, slackFailed: 1 }),
    NOW,
  );
  assertEquals(r.status, 'partial');
  assertEquals(r.dispatchedAt, NOW);
});

Deno.test('188: entrega em todos os canais = delivered, carimbado', () => {
  const r = classifyDispatch(
    com({ subscriberRows: 1, inAppFanout: 1, slackDelivered: 1 }),
    NOW,
  );
  assertEquals(r.status, 'delivered');
  assertEquals(r.dispatchedAt, NOW);
  assertEquals(r.overallOk, true);
});

Deno.test('182: apenas o webhook global entregando ja conta como entregue', () => {
  const r = classifyDispatch(com({ hasGlobalSlack: true, slackDelivered: 1 }), NOW);
  assertEquals(r.status, 'delivered');
  assertEquals(r.dispatchedAt, NOW);
});

Deno.test('previousAttempts le o contador do jsonb sem quebrar em formato inesperado', () => {
  assertEquals(previousAttempts(null), 0);
  assertEquals(previousAttempts({}), 0);
  assertEquals(previousAttempts({ fanout: 'texto' }), 0);
  assertEquals(previousAttempts({ fanout: { attempts: 'x' } }), 0);
  assertEquals(previousAttempts({ fanout: { attempts: 0 } }), 0);
  assertEquals(previousAttempts({ fanout: { attempts: 3 } }), 3);
  assert(previousAttempts({ fanout: { attempts: 2 }, outro: 1 }) === 2);
});