import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { problemasDeEstrutura } from './workflow-yaml-guard.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const BLOCO_OK = [
  'jobs:',
  '  publicar:',
  '    steps:',
  '      - name: Ler data',
  '        run: |',
  '          LAST=$(echo x | python3 -c \'',
  '          import json, sys',
  '          try:',
  '              print(json.load(sys.stdin))',
  '          except Exception:',
  '              print(0)',
  '          \') || LAST=0',
  '      - name: Depois',
  '        run: echo ok',
  '',
].join('\n');

// Reprodução do contexto.yml do commit 908b045: o Python embutido voltou para a coluna 0.
const BLOCO_QUEBRADO = [
  'jobs:',
  '  publicar:',
  '    steps:',
  '      - name: Ler data',
  '        run: |',
  '          LAST=$(echo x | python3 -c \'',
  'import json, sys',
  'try:',
  '    print(json.load(sys.stdin))',
  'except Exception:',
  '    print(0)',
  '\') || LAST=0',
  '      - name: Depois',
  '        run: echo ok',
  '',
].join('\n');

test('bloco `run: |` com o Python recuado junto é válido', () => {
  assert.deepEqual(problemasDeEstrutura(BLOCO_OK), []);
});

test('regressão 908b045: linha de bloco escalar desindentada para a coluna 0 é reprovada', () => {
  const problemas = problemasDeEstrutura(BLOCO_QUEBRADO);
  assert.equal(problemas.length, 1);
  assert.equal(problemas[0].linha, 7, 'aponta a primeira linha fora do recuo');
  assert.match(problemas[0].motivo, /texto solto depois do bloco "run: \|"/);
});

test('CRLF dá o mesmo veredito que LF', () => {
  assert.deepEqual(problemasDeEstrutura(BLOCO_OK.replace(/\n/g, '\r\n')), []);
  assert.equal(problemasDeEstrutura(BLOCO_QUEBRADO.replace(/\n/g, '\r\n')).length, 1);
});

test('tab no recuo é reprovado (YAML só aceita espaços)', () => {
  const p = problemasDeEstrutura('jobs:\n  a:\n\truns-on: x\n');
  assert.equal(p.length, 1);
  assert.match(p[0].motivo, /tab/);
});

test('não reprova o que é YAML legítimo: bloco dobrado, indicadores, linhas vazias, comentários e chave seguinte', () => {
  const legitimo = [
    'on:',
    '  push:',
    '    branches: [main]',
    'jobs:',
    '  a:',
    '    steps:',
    '      - name: >-',
    '          texto dobrado',
    '          em duas linhas',
    '',
    '      - run: |+',
    '          eco',
    '',
    '          outro',
    '        # comentário depois do bloco',
    '        shell: bash',
    '      - run: |',
    '      - name: bloco vazio acima não é defeito',
    '    env:',
    '      X: "a: b"',
    '',
  ].join('\n');
  assert.deepEqual(problemasDeEstrutura(legitimo), []);
});

test('o bloco só termina na linha que volta ao recuo da chave: linhas mais fundas continuam dentro', () => {
  const t = ['a:', '  run: |', '      base', '        mais fundo', '      base de novo', '  b: 1', ''].join('\n');
  assert.deepEqual(problemasDeEstrutura(t), []);
});

test('linha entre o recuo da chave e o do bloco é reprovada (meio-termo ambíguo)', () => {
  const t = ['a:', '  run: |', '        corpo', '      meio', '  b: 1', ''].join('\n');
  const p = problemasDeEstrutura(t);
  assert.equal(p.length, 1);
  assert.equal(p[0].linha, 4);
});

test('entrada vazia ou sem blocos não reprova', () => {
  assert.deepEqual(problemasDeEstrutura(''), []);
  assert.deepEqual(problemasDeEstrutura('name: x\non: push\n'), []);
});

test('TODOS os workflows reais do repo têm blocos `run:` íntegros (teria pego o contexto.yml quebrado)', () => {
  const dir = path.join(RAIZ, '.github', 'workflows');
  const arquivos = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(arquivos.length >= 7, `esperava os workflows do repo em ${dir}`);
  for (const arquivo of arquivos) {
    const problemas = problemasDeEstrutura(readFileSync(path.join(dir, arquivo), 'utf8'));
    assert.deepEqual(problemas, [], `${arquivo}: ${problemas.map((p) => `L${p.linha} ${p.motivo}`).join(' | ')}`);
  }
});
