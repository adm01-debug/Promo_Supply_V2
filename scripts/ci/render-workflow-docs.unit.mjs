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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

// ── Regressao: silencios que o gerador ainda tinha ────────────────────────────
test('segunda linha de um campo do bloco `# docs:` reprova em vez de sumir do README', () => {
  // Medido: a linha de continuacao encerrava o bloco; no ULTIMO campo os quatro ja existiam,
  // o gerador saia 0 e o resto do texto nunca chegava ao README.
  const noFim = BLOCO_OK.replace('#   avisa: ninguem', '#   avisa: ninguem\n#     (o resultado do check e a prova)');
  const r = rodar(arvore({ 'a.yml': noFim }));
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /a\.yml: linha nao reconhecida no bloco # docs:/u);
  assert.match(r.stderr, /o resultado do check e a prova/u);

  const noMeio = BLOCO_OK.replace('#   prova: que o gerador le o bloco', '#   prova: que o gerador\n#     le o bloco');
  assert.equal(rodar(arvore({ 'a.yml': noMeio })).status, 1);
});

test('campo repetido no bloco `# docs:` reprova em vez de o segundo apagar o primeiro', () => {
  const repetido = BLOCO_OK.replace('#   avisa: ninguem', '#   avisa: ninguem\n#   gatilho: outro gatilho');
  const r = rodar(arvore({ 'a.yml': repetido }));
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /campo repetido no bloco # docs: gatilho/u);
});

test('segunda linha de um item de `# nao-e-bug:` reprova em vez de descartar os itens seguintes', () => {
  const comContinuacao = BLOCO_OK.replace(
    'name: Fixture A',
    ['# nao-e-bug:', '#   - primeiro: explicado', '#     em duas linhas', '#   - segundo: tambem explicado', 'name: Fixture A'].join('\n'),
  );
  const r = rodar(arvore({ 'a.yml': comContinuacao }));
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /linha nao reconhecida em # nao-e-bug:/u);
});

test('comentario comum depois dos blocos continua encerrando-os sem erro', () => {
  // O cabecalho real dos workflows: bloco, `# ====`, texto livre com 1 espaco, `#` vazio.
  const comRodape = BLOCO_OK.replace(
    'name: Fixture A',
    ['# nao-e-bug:', '#   - chave: explicada', '# =====================', '# Texto livre do cabecalho.', '#', '#   - isto nao e item: e comentario solto', 'name: Fixture A'].join('\n'),
  );
  const raiz = arvore({ 'a.yml': comRodape });
  const r = rodar(raiz);
  assert.equal(r.status, 0, r.stderr);
  const md = lerReadme(raiz);
  assert.match(md, /\*\*chave\*\*/u);
  assert.doesNotMatch(md, /isto nao e item/u);

  // Comentario recuado depois de uma linha `#` vazia tambem e texto livre, nao continuacao.
  const comVazia = BLOCO_OK.replace(
    'name: Fixture A',
    ['#', '#   Uso: texto recuado solto', '# nao-e-bug:', '#   - chave: explicada', '#', '#   Outro texto recuado solto', 'name: Fixture A'].join('\n'),
  );
  const raizVazia = arvore({ 'a.yml': comVazia });
  const rVazia = rodar(raizVazia);
  assert.equal(rVazia.status, 0, rVazia.stderr);
  assert.match(lerReadme(raizVazia), /\| ninguem \|/u);
});

test('workflow com fim de linha CRLF gera o mesmo README que o LF', () => {
  const lf = arvore({ 'a.yml': BLOCO_OK });
  const crlf = arvore({ 'a.yml': BLOCO_OK.replaceAll('\n', '\r\n') });
  assert.equal(rodar(lf).status, 0);
  assert.equal(rodar(crlf).status, 0);
  assert.equal(lerReadme(crlf), lerReadme(lf));
  assert.doesNotMatch(lerReadme(crlf), /\r/u);
});

test('gerar duas vezes produz o mesmo arquivo (deterministico) e termina em quebra de linha', () => {
  const raiz = arvore({ 'b.yml': BLOCO_OK.replace('Fixture A', 'Fixture B'), 'a.yml': BLOCO_OK });
  assert.equal(rodar(raiz).status, 0);
  const primeiro = lerReadme(raiz);
  assert.equal(rodar(raiz).status, 0);
  assert.equal(lerReadme(raiz), primeiro);
  assert.ok(primeiro.endsWith('\n'));
  assert.ok(primeiro.indexOf('a.yml') < primeiro.indexOf('b.yml'), 'ordem alfabetica por arquivo');
});

test('kpi.json que existe mas nao e JSON valido reprova em vez de publicar "—"', () => {
  for (const conteudo of ['{ quebrado', 'null', '[]']) {
    const raiz = arvore({ 'a.yml': BLOCO_OK });
    mkdirSync(path.join(raiz, 'docs', 'ci'), { recursive: true });
    writeFileSync(path.join(raiz, 'docs', 'ci', 'kpi.json'), conteudo);
    const r = rodar(raiz);
    assert.equal(r.status, 1, `kpi.json = ${conteudo}: ${r.stdout}`);
    assert.match(r.stderr, /kpi\.json/u);
  }
});

test('`|` em valor do kpi.json tambem e escapado', () => {
  const raiz = arvore({ 'a.yml': BLOCO_OK });
  mkdirSync(path.join(raiz, 'docs', 'ci'), { recursive: true });
  writeFileSync(path.join(raiz, 'docs', 'ci', 'kpi.json'), JSON.stringify({ 'a.yml': { custo_semana_min: '1|2', taxa_falha_7d: '3%' } }));
  assert.equal(rodar(raiz).status, 0);
  const linha = lerReadme(raiz).split('\n').find((l) => l.startsWith('| Fixture A |'));
  assert.equal([...linha.matchAll(/(?<!\\)\|/gu)].length, 9, linha);
});

test('argumento desconhecido reprova e NAO escreve o README', () => {
  // Medido: `--chek` (erro de digitacao) caia no modo de escrita, regerava e saia 0.
  const raiz = arvore({ 'a.yml': BLOCO_OK });
  const r = rodar(raiz, ['--chek']);
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /argumento desconhecido: --chek/u);
  assert.equal(existsSync(path.join(raiz, 'docs', 'ci', 'README.md')), false);
});

test('pasta de workflows vazia reprova (nada lido nao e OK)', () => {
  const raiz = arvore({});
  const r = rodar(raiz);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /nenhum workflow/u);
  writeFileSync(path.join(raiz, '.github', 'workflows', 'LEIAME.md'), 'nao e workflow');
  assert.equal(rodar(raiz, ['--check']).status, 1);
});

test('nome do workflow sai sem aspas e sem comentario YAML; sem `name:` usa o arquivo sem extensao', () => {
  const comAspas = BLOCO_OK.replace('name: Fixture A', 'name: "Fixture #1" # principal');
  const semNome = BLOCO_OK.replace('name: Fixture A\n', '');
  const raiz = arvore({ 'a.yml': comAspas, 'b.yaml': semNome, 'c.yml': BLOCO_OK.replace('name: Fixture A', 'name: Fixture C # comentario') });
  assert.equal(rodar(raiz).status, 0);
  const md = lerReadme(raiz);
  assert.match(md, /^\| Fixture #1 \| \[`a\.yml`\]/mu);
  assert.match(md, /^\| b \| \[`b\.yaml`\]/mu);
  assert.match(md, /^\| Fixture C \| \[`c\.yml`\]/mu);
});
