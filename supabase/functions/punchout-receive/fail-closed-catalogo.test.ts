/**
 * INT-09 (etapa 181): a conferencia do shared secret era condicional
 * (`if (catalog?.shared_secret_encrypted)`) e o catalogo era carregado com
 * `maybeSingle()` sem filtrar `is_active`. Resultado: um catalogo inativo ou sem
 * segredo configurado aceitava qualquer POST com buyer_cookie valido, porque a
 * unica barreira (o segredo) simplesmente nao era executada.
 *
 * Falha se a conferencia voltar a ser opcional ou se o filtro de atividade sumir.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const fonte = Deno.readTextFileSync(new URL('./index.ts', import.meta.url));

const posicao = (trecho: string): number => {
  const i = fonte.indexOf(trecho);
  assert(i >= 0, `trecho ausente no handler: ${trecho}`);
  return i;
};

Deno.test('punchout-receive exige catalogo ativo', () => {
  const filtro = posicao('.eq("is_active", true)');
  assert(
    filtro > posicao('.eq("id", session.catalog_id)'),
    'o filtro is_active precisa estar na consulta do catalogo',
  );
  assert(fonte.indexOf('.single();', filtro) > filtro, 'o filtro is_active precisa ser aplicado antes do single()');
  assert(
    fonte.includes('if (catalogError || !catalog)'),
    'catalogo ausente/inativo precisa falhar explicitamente',
  );
});

Deno.test('punchout-receive recusa catalogo sem shared secret configurado', () => {
  const guarda = posicao('if (!catalog.shared_secret_encrypted)');
  assert(guarda > posicao('.eq("is_active", true)'), 'a guarda de segredo ausente vem depois da consulta ao catalogo');
  assert(
    guarda < posicao('getIdempotentResponse('),
    'a guarda de segredo ausente precisa vir antes da consulta ao cache de idempotencia',
  );
  assert(
    !fonte.includes('if (catalog?.shared_secret_encrypted)'),
    'a conferencia do shared secret nao pode voltar a ser condicional',
  );
  assert(
    posicao('SharedSecret mismatch') < posicao('getIdempotentResponse('),
    'a recusa por segredo invalido precisa vir antes da consulta ao cache',
  );
});

Deno.test('punchout-receive responde 403 nos tres caminhos de recusa', () => {
  const ocorrencias = fonte.split('status: 403').length - 1;
  assertEquals(ocorrencias, 3, 'catalogo ausente, catalogo sem segredo e segredo invalido precisam devolver 403');
});