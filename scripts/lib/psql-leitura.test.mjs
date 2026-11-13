import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { criarMascara, exigirComandoUnico, montarAmbientePsql, REF_OFICIAL } from './psql-leitura.mjs';
import { RAIZ_REPO } from './seguranca-processo.mjs';

test('montarAmbientePsql: loopback vira PG* com a senha decodificada e sem TLS forçado', () => {
  const { env, local } = montarAmbientePsql('postgresql://auditor:S3nh%40%3Acom%2F%25@127.0.0.1:54411/banco');
  assert.equal(local, true);
  assert.deepEqual(
    { h: env.PGHOST, p: env.PGPORT, u: env.PGUSER, d: env.PGDATABASE, s: env.PGPASSWORD },
    { h: '127.0.0.1', p: '54411', u: 'auditor', d: 'banco', s: 'S3nh@:com/%' },
  );
  assert.equal(env.PGSSLMODE, undefined);
  assert.equal(montarAmbientePsql('postgres://u:p@localhost/db').env.PGPORT, '5432');
  assert.equal(montarAmbientePsql('postgres://u:p@[::1]:5433/db').local, true);
});

test('montarAmbientePsql: projeto oficial (host direto e pooler) exige verify-full com a CA pinada', () => {
  for (const url of [
    `postgresql://postgres:x@db.${REF_OFICIAL}.supabase.co:5432/postgres`,
    `postgresql://postgres.${REF_OFICIAL}:x@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    // sslmode mais fraco na URL não rebaixa nada: o ambiente é montado do zero
    `postgresql://postgres:x@db.${REF_OFICIAL}.supabase.co:5432/postgres?sslmode=disable`,
  ]) {
    const { env, local } = montarAmbientePsql(url);
    assert.equal(local, false);
    assert.equal(env.PGSSLMODE, 'verify-full');
    assert.equal(env.PGSSLROOTCERT, path.join(RAIZ_REPO, 'scripts/types-sync/certs/supabase-prod-ca-2021.crt'));
  }
});

test('montarAmbientePsql: recusa outro projeto, host desconhecido e URL inválida — sem credencial na mensagem', () => {
  const recusadas = [
    'postgresql://postgres:SEGREDO-123@db.trwgmplubeqxrxpncdgf.supabase.co:5432/postgres',
    'postgresql://postgres.apuzcrkeqodktmpwobnz:SEGREDO-123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres:SEGREDO-123@example.com:5432/postgres',
    'postgresql://postgres:SEGREDO-123@localhost.evil.com:5432/postgres',
    'mysql://u:SEGREDO-123@127.0.0.1/db',
    'postgresql://u:SEGREDO-123@127.0.0.1/',
    'SEGREDO-123',
    '',
    '   ',
    undefined,
  ];
  for (const url of recusadas) {
    assert.throws(() => montarAmbientePsql(url), (erro) => {
      assert.doesNotMatch(erro.message, /SEGREDO-123/);
      return true;
    }, String(url));
  }
  // o ref esperado pode ser trocado por quem chama; o oficial deixa de valer
  assert.throws(() => montarAmbientePsql(`postgresql://postgres:x@db.${REF_OFICIAL}.supabase.co/postgres`, { refEsperado: 'a'.repeat(20) }), /outro projeto/);
});

test('criarMascara: tira a senha crua e a url-encoded; senha vazia não mascara nada', () => {
  const mascarar = criarMascara('S3nh@:com/%');
  assert.equal(mascarar('falhou com S3nh@:com/% e S3nh%40%3Acom%2F%25 fim'), 'falhou com *** e *** fim');
  assert.equal(criarMascara('')('texto qualquer'), 'texto qualquer');
  assert.equal(criarMascara(undefined)(null), '');
});

test('exigirComandoUnico: só UM comando de leitura', () => {
  assert.equal(exigirComandoUnico('  SELECT 1 ;  '), 'SELECT 1');
  for (const ok of ['select 1', 'WITH a AS (SELECT 1) SELECT * FROM a', 'EXPLAIN (ANALYZE) SELECT 1', 'SHOW server_version', 'TABLE t', 'VALUES (1)']) {
    assert.doesNotThrow(() => exigirComandoUnico(ok), ok);
  }
  for (const ruim of ['', '   ', ';', 'DELETE FROM t', 'SELECT 1; DROP TABLE t', 'COMMIT', 'selectx 1', 'UPDATE t SET a = 1', 'COPY t TO STDOUT', null]) {
    assert.throws(() => exigirComandoUnico(ruim), Error, String(ruim));
  }
});
