/**
 * INT-08 (etapas 179 e 180): o cache de idempotencia nao pode memorizar falha
 * como resultado definitivo.
 *
 * Antes desta etapa, `getIdempotentResponse` devolvia a linha mesmo com
 * `status = 'failed'` e o wrapper respondia 409 "previously failed". Como quem
 * grava `failed` e qualquer erro — inclusive transitorio, como um carrinho
 * reenviado com o BuyerCookie de outra sessao —, a reentrega correta do
 * fornecedor nunca mais era processada.
 *
 * Falha se a consulta voltar a aceitar `failed` como replay.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const fonte = Deno.readTextFileSync(new URL('./idempotency.ts', import.meta.url));

const trechoDaConsulta = (): string => {
  const inicio = fonte.indexOf('export async function getIdempotentResponse');
  assert(inicio >= 0, 'getIdempotentResponse ausente');
  const fim = fonte.indexOf('export async function recordIdempotentResponse');
  assert(fim > inicio, 'limite da consulta de idempotencia ausente');
  return fonte.slice(inicio, fim);
};

Deno.test('getIdempotentResponse so faz replay de operacao processada', () => {
  const consulta = trechoDaConsulta();
  assert(
    consulta.includes('.eq("status", "processed")'),
    'a consulta precisa filtrar status = processed para nao replay de falha',
  );
  assert(
    consulta.indexOf('.eq("status", "processed")') < consulta.indexOf('.maybeSingle()'),
    'o filtro de status precisa valer para a mesma consulta que busca a linha',
  );
});

Deno.test('withIdempotency continua registrando a falha para analise', () => {
  const inicio = fonte.indexOf('export async function withIdempotency');
  assert(inicio >= 0, 'withIdempotency ausente');
  assert(
    fonte.slice(inicio).includes('status: "failed"'),
    'o erro precisa continuar gravado como failed',
  );
});
