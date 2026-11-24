/**
 * QA 048 (EDGA-08): a autenticacao e a membership do punchout-setup precisam
 * acontecer ANTES do cache de idempotencia, e a chave do cache precisa ser
 * escopada por usuario.
 *
 * Antes desta etapa, `withIdempotency("punchout-setup", ...)` envolvia o handler
 * inteiro: um replay devolvia a resposta cacheada — `buyerCookie` e `setup_xml`
 * com a credencial NetworkID do catalogo e o e-mail do usuario — sem passar por
 * `auth.getUser` nem pela checagem de `user_tenants`. E como a chave vinha do
 * header `x-idempotency-key` do cliente sem escopo, dois chamadores diferentes
 * com a mesma chave compartilhavam a mesma entrada de `webhook_events`.
 *
 * Falha se a ordem voltar a se inverter ou se o `source` perder o usuario.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const fonte = Deno.readTextFileSync(new URL('./index.ts', import.meta.url));

const posicao = (trecho: string): number => {
  const i = fonte.indexOf(trecho);
  assert(i >= 0, `trecho ausente no handler: ${trecho}`);
  return i;
};

Deno.test('punchout-setup autentica antes de consultar o cache de idempotencia', () => {
  const cache = posicao('withIdempotency(');
  assert(posicao('auth.getUser(') < cache, 'auth.getUser deve vir antes de withIdempotency');
  assert(
    posicao('.from("user_tenants")') < cache,
    'a checagem de membership deve vir antes de withIdempotency',
  );
});

Deno.test('punchout-setup escopa a chave de idempotencia por usuario', () => {
  assert(
    fonte.includes('`punchout-setup:${user.id}`'),
    'o source do cache precisa incluir o id do usuario',
  );
});