/**
 * INT-08 (etapa 180): a chave de idempotencia do erp-sync precisa ser escopada
 * pelo chamador.
 *
 * A autenticacao ja rodava antes do cache, mas o `source` era so "erp-sync":
 * dois usuarios diferentes enviando o mesmo corpo compartilhavam a mesma linha
 * de `webhook_events` e o segundo recebia a resposta do primeiro. O padrao
 * correto ja existia no repo (fiscal-orchestrator usa `${user.id}` no source).
 *
 * Falha se o source perder o usuario ou se o cache voltar a ser lido antes da
 * autenticacao.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const fonte = Deno.readTextFileSync(new URL('./index.ts', import.meta.url));

const posicao = (trecho: string): number => {
  const i = fonte.indexOf(trecho);
  assert(i >= 0, `trecho ausente no handler: ${trecho}`);
  return i;
};

Deno.test('erp-sync escopa a chave de idempotencia por usuario', () => {
  assert(
    fonte.includes('const idempotencySource = `erp-sync:${user.id}`;'),
    'o source do cache precisa incluir o id do usuario',
  );
});

Deno.test('erp-sync le e grava o cache sempre com o source escopado', () => {
  assert(
    fonte.includes('getIdempotentResponse(idempotencySource'),
    'a leitura do cache precisa usar o source escopado',
  );
  assert(
    fonte.includes('recordIdempotentResponse(idempotencySource'),
    'a gravacao do cache precisa usar o source escopado',
  );
  assert(
    !fonte.includes('"erp-sync", idempotencyKey'),
    'nao pode sobrar chamada com o source fixo "erp-sync"',
  );
});

Deno.test('erp-sync autentica antes de consultar o cache', () => {
  assert(
    posicao('getAuthUser(') < posicao('getIdempotentResponse('),
    'a autenticacao precisa vir antes da consulta ao cache',
  );
});
