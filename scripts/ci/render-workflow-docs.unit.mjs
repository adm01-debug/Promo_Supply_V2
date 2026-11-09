// Suite do gerador de `docs/ci/README.md`.
//
// Por que existe: o unico gate do render-workflow-docs.mjs e o `--check`, que compara a
// saida do gerador com o arquivo que o PROPRIO gerador escreveu. Por construcao isso pega
// drift (alguem mexeu no YAML e nao regerou) e NUNCA pega um bug do gerador. Os casos abaixo
// exercitam o gerador de verdade, numa arvore minima em tmp (via RENDER_WF_RAIZ), e trancam
// os quatro silencios que ele tinha: campo desconhecido absorvido, item malformado de
// `# nao-e-bug:` truncando a lista, workflow `.yaml` invisivel e `|` quebrando a tabela.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./render-workflow-docs.mjs', import.meta.url));

const BLOCO_OK = [
  '# docs:',
  '#   gatilho: push em main',
  '#   prova: que o gerador le o bloco',
  '#   falha: o check fica vermelho',
  '#   avisa: ninguem',
  'name: Fixture A',
  'on: { push: { branches: [main] } }',
  'jobs: { x: { runs-on: ubuntu-24.04, steps: [{ run: echo oi }] } }',
  '',
].join('\n');

/** Arvore minima com os workflows dados: { 'a.yml': '<conteudo>' }. */
function arvore(workflows) {
  const raiz = mkdtempSync(path.join(tmpdir(), 'render-wf-'));
  mkdirSync(path.join(raiz, '.github', 'workflows'), { recursive: true });
  for (const [nome, conteudo] of Object.entries(workflows)) {
    writeFileSync(path.join(raiz, '.github', 'workflows', nome), conteudo);
  }
  return raiz;
}

function rodar(raiz, args = []) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, RENDER_WF_RAIZ: raiz },
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

const lerReadme = (raiz) => readFileSync(path.join(raiz, 'docs', 'ci', 'README.md'), 'utf8');

test('gera o README a partir do bloco e o --check aprova em seguida', () => {
  const raiz = arvore({ 'a.yml': BLOCO_OK });
  const gerou = rodar(raiz);
  assert.equal(gerou.status, 0, gerou.stderr);
  const md = lerReadme(raiz);
  assert.match(md, /\*\*1 workflows\.\*\*/u);
  assert.match(md, /\| Fixture A \| \[`a\.yml`\]/u);
  assert.match(md, /- \*\*Gatilho:\*\* push em main/u);
  assert.equal(rodar(raiz, ['--check']).status, 0);
});

test('--check reprova quando o README divergiu do YAML', () => {
  const raiz = arvore({ 'a.yml': BLOCO_OK });
  assert.equal(rodar(raiz).status, 0);
  writeFileSync(path.join(raiz, 'docs', 'ci', 'README.md'), 'editado a mao\n');
  const r = rodar(raiz, ['--check']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /divergiu/u);
});

test('--check reprova quando o README nao existe', () => {
  const r = rodar(arvore({ 'a.yml': BLOCO_OK }), ['--check']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /não existe/u);
});

test('workflow sem bloco `# docs:` reprova', () => {
  const r = rodar(arvore({ 'a.yml': BLOCO_OK, 'b.yml': 'name: Sem bloco\non: { push: {} }\n' }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sem bloco '# docs:' no topo: b\.yml/u);
});

test('bloco `# docs:` sem um dos quatro campos reprova, nomeando o campo', () => {
  const semAvisa = BLOCO_OK.replace('#   avisa: ninguem\n', '');
  const r = rodar(arvore({ 'a.yml': semAvisa }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /tem bloco # docs: sem avisa/u);
});

test('campo desconhecido no bloco reprova em vez de ser absorvido em silencio', () => {
  const comExtra = BLOCO_OK.replace('#   avisa: ninguem', '#   avisa: ninguem\n#   dono: o chefe');
  const r = rodar(arvore({ 'a.yml': comExtra }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /campo nao reconhecido no bloco # docs:: dono/u);
});

test('item malformado em `# nao-e-bug:` reprova em vez de truncar a lista', () => {
  const comBug = BLOCO_OK.replace(
    'name: Fixture A',
    ['# nao-e-bug:', '#   - primeiro: explicado', '#   - item quebrado sem dois pontos', '#   - terceiro: tambem explicado', 'name: Fixture A'].join('\n'),
  );
  const r = rodar(arvore({ 'a.yml': comBug }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /item malformado em # nao-e-bug:/u);

  // Bem formado: os tres itens aparecem (antes, o malformado comia os seguintes).
  const ok = comBug.replace('#   - item quebrado sem dois pontos', '#   - segundo: explicado tambem');
  const raiz = arvore({ 'a.yml': ok });
  assert.equal(rodar(raiz).status, 0);
  const md = lerReadme(raiz);
  for (const chave of ['primeiro', 'segundo', 'terceiro']) {
    assert.match(md, new RegExp(`\\*\\*${chave}\\*\\*`, 'u'), `item ${chave} tem de aparecer`);
  }
});

test('workflow .yaml tambem e lido (o GitHub aceita as duas extensoes)', () => {
  const raiz = arvore({ 'a.yml': BLOCO_OK, 'b.yaml': BLOCO_OK.replace('Fixture A', 'Fixture B') });
  assert.equal(rodar(raiz).status, 0);
  const md = lerReadme(raiz);
  assert.match(md, /\*\*2 workflows\.\*\*/u);
  assert.match(md, /Fixture B/u);

  // E um .yaml SEM bloco tambem reprova, em vez de passar invisivel.
  const r = rodar(arvore({ 'a.yml': BLOCO_OK, 'c.yaml': 'name: Invisivel\non: { push: {} }\n' }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /c\.yaml/u);
});

test('`|` no valor de um campo e escapado e nao abre coluna nova', () => {
  const comPipe = BLOCO_OK.replace('#   avisa: ninguem', '#   avisa: ninguem | so o Job Summary');
  const raiz = arvore({ 'a.yml': comPipe });
  assert.equal(rodar(raiz).status, 0);
  const linha = lerReadme(raiz)
    .split('\n')
    .find((l) => l.startsWith('| Fixture A |'));
  assert.ok(linha, 'a linha da tabela tem de existir');
  assert.match(linha, /ninguem \\\| so o Job Summary/u);
  // 8 colunas => 9 separadores `|` nao escapados.
  const naoEscapados = [...linha.matchAll(/(?<!\\)\|/gu)].length;
  assert.equal(naoEscapados, 9, `a tabela tem de continuar com 8 colunas: ${linha}`);
});

test('kpi.json alimenta as colunas de custo quando existe', () => {
  const raiz = arvore({ 'a.yml': BLOCO_OK });
  mkdirSync(path.join(raiz, 'docs', 'ci'), { recursive: true });
  writeFileSync(
    path.join(raiz, 'docs', 'ci', 'kpi.json'),
    JSON.stringify({ 'a.yml': { custo_semana_min: 12.5, taxa_falha_7d: '3%' } }),
  );
  assert.equal(rodar(raiz).status, 0);
  assert.match(lerReadme(raiz), /\| 12\.5 \| 3% \|/u);
});
