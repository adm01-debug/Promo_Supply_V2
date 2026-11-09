import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ALLOWLIST_NODE,
  RAIZ,
  casaPadrao,
  codigoExecutavelDeWorkflow,
  comandoExecutadoNoWorkflow,
  orfaosNode,
  padroesNodeDeWorkflow,
  suitesCobertasPorImport,
  suitesNodeOrfas,
} from './check-test-inventory.mjs';

// Workflow sintetico com as tres formas de bloco `run:` do repositorio: escalar dobrado
// (`>-`), literal (`|`) e de uma linha. Os caminhos fora de `run:` (nome da etapa, comentario
// solto) NAO podem contar como cobertura: senao um comentario bastaria para esconder a suite.
const WORKFLOW = [
  'name: ci',
  'jobs:',
  '  guards:',
  '    steps:',
  '      # scripts/qa/comentado.unit.mjs aparece em comentario, nao roda',
  '      - name: roda as suites de scripts/ci (scripts/qa/mencionada-no-nome.unit.mjs)',
  '        run: >-',
  '          node --test scripts/ci/*.unit.mjs scripts/edge-deploy/*.unit.mjs',
  '          scripts/db-audit/crm-sync-outbox-contract.test.mjs',
  '      - name: roda um script de teste direto',
  '        run: node scripts/db-audit/psql-environment.integration.mjs',
  '      - name: bloco literal',
  '        run: |',
  '          node --test scripts/talkx/*.unit.mjs',
  '          # node --test scripts/qa/desligado-por-comentario.unit.mjs',
  '    outro-job:',
  '      steps: []',
].join('\n');

test('R2-INF-013: padroesNodeDeWorkflow le os blocos run (dobrado, literal e de uma linha)', () => {
  assert.deepEqual(padroesNodeDeWorkflow(WORKFLOW), [
    'scripts/ci/*.unit.mjs',
    'scripts/db-audit/crm-sync-outbox-contract.test.mjs',
    'scripts/db-audit/psql-environment.integration.mjs',
    'scripts/edge-deploy/*.unit.mjs',
    'scripts/talkx/*.unit.mjs',
  ]);
});

test('R2-INF-013: caminho citado fora de run (nome da etapa, comentario) nao cobre a suite', () => {
  const padroes = padroesNodeDeWorkflow(WORKFLOW);
  assert.equal(padroes.some((p) => p.includes('mencionada-no-nome')), false);
  assert.equal(padroes.some((p) => p.includes('comentado')), false);
  assert.equal(padroes.some((p) => p.includes('desligado-por-comentario')), false, 'passo comentado dentro do run: nao executa');
});

test('R2-INF-013: casaPadrao trata * como um nivel de diretorio e ** como qualquer nivel', () => {
  assert.equal(casaPadrao('scripts/ci/lint-ratchet.unit.mjs', 'scripts/ci/*.unit.mjs'), true);
  assert.equal(casaPadrao('scripts/qa/prova.unit.mjs', 'scripts/ci/*.unit.mjs'), false);
  assert.equal(casaPadrao('scripts/ci/sub/prova.unit.mjs', 'scripts/ci/*.unit.mjs'), false, '* nao atravessa /');
  assert.equal(casaPadrao('scripts/ci/sub/prova.unit.mjs', 'scripts/ci/**/*.unit.mjs'), true, '** atravessa /');
  assert.equal(
    casaPadrao('scripts/db-audit/crm-sync-outbox-contract.test.mjs', 'scripts/db-audit/crm-sync-outbox-contract.test.mjs'),
    true,
    'caminho exato casa',
  );
  assert.equal(casaPadrao('scripts/ci/lint-ratchet.mjs', 'scripts/ci/*.unit.mjs'), false, 'o glob pede .unit.mjs');
});

test('R2-INF-013: suite Node fora dos blocos run vira orfa — e a allowlist a absolve', () => {
  const suites = [
    'scripts/ci/lint-ratchet.unit.mjs',
    'scripts/qa/prova-visao-classificadores.unit.mjs',
  ];
  const padroes = padroesNodeDeWorkflow(WORKFLOW);
  assert.deepEqual(orfaosNode(suites, padroes, new Set()), ['scripts/qa/prova-visao-classificadores.unit.mjs']);
  assert.deepEqual(
    orfaosNode(suites, padroes, new Set(['scripts/qa/prova-visao-classificadores.unit.mjs'])),
    [],
  );
});

test('agregador coberto alcança imports estáticos, inclusive transitivos, mas não comentários', () => {
  const suites = [
    'scripts/ci/agregador.unit.mjs',
    'scripts/qa/contraste.unit.mjs',
    'scripts/vercel/producao.unit.mjs',
    'scripts/qa/orfao.unit.mjs',
  ];
  const fontes = new Map([
    ['scripts/ci/agregador.unit.mjs', "import '../qa/contraste.unit.mjs';\n// import '../qa/orfao.unit.mjs';\n"],
    ['scripts/qa/contraste.unit.mjs', "import '../vercel/producao.unit.mjs';\n"],
    ['scripts/vercel/producao.unit.mjs', ''],
  ]);
  const cobertas = suitesCobertasPorImport(
    suites,
    ['scripts/ci/*.unit.mjs'],
    (arquivo) => fontes.get(arquivo) ?? '',
  );
  assert.deepEqual([...cobertas].sort(), [
    'scripts/ci/agregador.unit.mjs',
    'scripts/qa/contraste.unit.mjs',
    'scripts/vercel/producao.unit.mjs',
  ]);
  assert.equal(cobertas.has('scripts/qa/orfao.unit.mjs'), false);
});

test('R2-INF-013: a arvore atual nao tem suite Node fora dos workflows nem da ALLOWLIST_NODE', () => {
  // Toda suite Node de scripts/ passa por aqui: ou um bloco `run:` a executa, ou ela esta
  // nomeada na ALLOWLIST_NODE. Sem isso, uma suite nova nasce sem passo nenhum e o
  // inventario continua dizendo OK — foi o defeito desta tarefa.
  assert.deepEqual(suitesNodeOrfas(), []);
});

test('R2-INF-013: a ALLOWLIST_NODE nao guarda entrada morta', () => {
  for (const arquivo of ALLOWLIST_NODE) {
    assert.ok(existsSync(join(RAIZ, arquivo)), `${arquivo} esta na ALLOWLIST_NODE mas nao existe no repositorio`);
  }
});

test('R2-INF-013: importar o verificador nao roda o inventario (o teste importa as funcoes)', () => {
  // Sem a guarda de modulo principal, o import roda a checagem e chama process.exit -- foi
  // o que fez este arquivo "passar" sem executar nenhuma assercao na primeira tentativa.
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./scripts/ci/check-test-inventory.mjs');"], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '', 'importar nao pode imprimir o relatorio do inventario');
});

// ── Regressao: desligar um passo tem de reprovar igual a apagar ───────────────
// A versao anterior testava o regex do `deno test` contra o YAML CRU. Comentar a linha --
// que e como um passo e desligado na pratica -- mantinha o guard verde enquanto os testes
// das edges deixavam de rodar. Estes casos trancam as duas pontas: o que executa conta, o
// que esta atras de `#` ou fora de `run:` nao conta.
const COMANDO_EDGES = /deno test[^\n]*\bsupabase\/functions\/?(?:\s|$)/;

const passoLiteral = (corpo) => ['jobs:', '  x:', '    steps:', '      - name: etapa', '        run: |', ...corpo.map((l) => `          ${l}`), ''].join('\n');

test('comando dentro de bloco `run:` conta como executado', () => {
  assert.equal(comandoExecutadoNoWorkflow(passoLiteral(['deno test --allow-net supabase/functions/']), COMANDO_EDGES), true);
});

test('comando comentado dentro do bloco NAO conta (passo desligado)', () => {
  assert.equal(comandoExecutadoNoWorkflow(passoLiteral(['# deno test --allow-net supabase/functions/']), COMANDO_EDGES), false);
  assert.equal(comandoExecutadoNoWorkflow(passoLiteral(['echo oi', '# TODO: deno test supabase/functions/ depois']), COMANDO_EDGES), false);
});

test('comando citado fora de `run:` NAO conta (nome da etapa)', () => {
  const yaml = ['jobs:', '  x:', '    steps:', '      - name: deno test supabase/functions/', '        run: echo oi', ''].join('\n');
  assert.equal(comandoExecutadoNoWorkflow(yaml, COMANDO_EDGES), false);
});

test('`- run:` na mesma linha do item conta, e comentado nao', () => {
  const inline = ['jobs:', '  x:', '    steps:', '      - run: node --test scripts/zz/x.unit.mjs', ''].join('\n');
  const comentado = ['jobs:', '  x:', '    steps:', '      - run: # node --test scripts/zz/x.unit.mjs', ''].join('\n');
  assert.deepEqual(padroesNodeDeWorkflow(inline), ['scripts/zz/x.unit.mjs']);
  assert.deepEqual(padroesNodeDeWorkflow(comentado), []);
});

test('codigoExecutavelDeWorkflow devolve so o corpo dos blocos `run:`', () => {
  const yaml = ['jobs:', '  x:', '    env:', '      A: scripts/ci/nao-conta.unit.mjs', '    steps:', '      - name: etapa', '        run: |', '          echo um', '          # echo dois', '        env:', '          B: 1', ''].join('\n');
  const codigo = codigoExecutavelDeWorkflow(yaml);
  assert.match(codigo, /echo um/u);
  assert.doesNotMatch(codigo, /echo dois/u, 'linha comentada nao entra');
  assert.doesNotMatch(codigo, /nao-conta/u, '`env:` do job nao entra');
});

test('o main.yml real continua cobrindo os .test.ts das edges por pasta', () => {
  const yaml = readFileSync(join(RAIZ, '.github/workflows/main.yml'), 'utf8');
  assert.equal(comandoExecutadoNoWorkflow(yaml, COMANDO_EDGES), true);
});
