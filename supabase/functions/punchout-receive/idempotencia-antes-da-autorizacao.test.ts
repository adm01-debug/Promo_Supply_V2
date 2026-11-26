/**
 * INT-08 (etapa 180): no punchout-receive o cache de idempotencia era
 * consultado antes do try, isto e, antes de a sessao existir e de o shared
 * secret do fornecedor ser conferido. Um replay devolvia o `solicitation_id` e
 * o 303 com o `Location` da solicitacao para quem so repetisse o mesmo corpo.
 *
 * Falha se a consulta ao cache voltar para antes da validacao.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const fonte = Deno.readTextFileSync(new URL('./index.ts', import.meta.url));

const posicao = (trecho: string): number => {
  const i = fonte.indexOf(trecho);
  assert(i >= 0, `trecho ausente no handler: ${trecho}`);
  return i;
};

Deno.test('punchout-receive consulta o cache depois de validar sessao e shared secret', () => {
  const cache = posicao('getIdempotentResponse(');
  assert(cache > posicao('try {'), 'a consulta ao cache precisa estar dentro do try');
  assert(
    cache > posicao('.eq("buyer_cookie", buyerCookie)'),
    'a consulta ao cache precisa vir depois da busca da sessao',
  );
  assert(
    cache > posicao('SharedSecret mismatch'),
    'a consulta ao cache precisa vir depois da conferencia do shared secret',
  );
});

Deno.test('punchout-receive mantem o proprio source de idempotencia', () => {
  assert(fonte.includes('getIdempotentResponse(SOURCE'), 'o source da edge precisa ser o constante SOURCE');
});
