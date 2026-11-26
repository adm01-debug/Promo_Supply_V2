import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  ALLOWLIST_NODE,
  RAIZ,
  casaPadrao,
  codigoExecutavelDeWorkflow,
  comandoExecutadoNoWorkflow,
  orfaosNode,
  padroesNodeDeWorkflow,
  semComentarioDeShell,
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

// ── Regressao: comentario de fim de linha e CRLF ──────────────────────────────
test('comentario de shell no fim da linha do `run:` NAO cobre a suite', () => {
  // Medido: `echo ok # node --test scripts/zz/x.unit.mjs` contava como passo que roda a suite.
  assert.deepEqual(padroesNodeDeWorkflow(passoLiteral(['echo ok # node --test scripts/zz/x.unit.mjs'])), []);
  const inline = ['jobs:', '  x:', '    steps:', '      - run: echo ok # depois: node --test scripts/zz/x.unit.mjs', ''].join('\n');
  assert.deepEqual(padroesNodeDeWorkflow(inline), []);
  assert.equal(comandoExecutadoNoWorkflow(passoLiteral(['echo ok # deno test supabase/functions/']), COMANDO_EDGES), false);
  // O que vem ANTES do `#` continua executando e continua contando.
  assert.deepEqual(
    padroesNodeDeWorkflow(passoLiteral(['node --test scripts/zz/x.unit.mjs # suite do zz'])),
    ['scripts/zz/x.unit.mjs'],
  );
});

test('semComentarioDeShell so corta `#` em inicio de palavra e fora de aspas', () => {
  assert.equal(semComentarioDeShell('echo a # b'), 'echo a ');
  assert.equal(semComentarioDeShell('echo "a # b" scripts/x.test.mjs'), 'echo "a # b" scripts/x.test.mjs');
  assert.equal(semComentarioDeShell("echo 'a # b' # c"), "echo 'a # b' ");
  assert.equal(semComentarioDeShell('echo $# ${#lista[@]} a#b'), 'echo $# ${#lista[@]} a#b');
  assert.equal(semComentarioDeShell('echo \\# literal'), 'echo \\# literal');
});

test('workflow com fim de linha CRLF e lido igual ao LF', () => {
  // Medido: com CRLF nenhuma abertura `run:` casava e toda suite virava orfa.
  const crlf = WORKFLOW.replaceAll('\n', '\r\n');
  assert.deepEqual(padroesNodeDeWorkflow(crlf), padroesNodeDeWorkflow(WORKFLOW));
  assert.equal(
    comandoExecutadoNoWorkflow(passoLiteral(['deno test --allow-net supabase/functions/']).replaceAll('\n', '\r\n'), COMANDO_EDGES),
    true,
  );
});

// ── Regressao: o CLI numa arvore sintetica ────────────────────────────────────
// O verificador deriva a raiz da propria posicao; copiar o script (e a lib que ele importa)
// para uma arvore em tmp exercita o CLI inteiro sem tocar no repositorio.
function arvore(arquivos, prefixo = 'inventario-') {
  const raiz = mkdtempSync(join(tmpdir(), prefixo));
  for (const dir of ['scripts/ci', 'scripts/lib', '.github/workflows', 'supabase/functions']) {
    mkdirSync(join(raiz, dir), { recursive: true });
  }
  copyFileSync(join(RAIZ, 'scripts/ci/check-test-inventory.mjs'), join(raiz, 'scripts/ci/check-test-inventory.mjs'));
  copyFileSync(join(RAIZ, 'scripts/lib/seguranca-processo.mjs'), join(raiz, 'scripts/lib/seguranca-processo.mjs'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true });
    writeFileSync(join(raiz, rel), conteudo);
  }
  return raiz;
}
// GIT_CEILING_DIRECTORIES: a arvore em tmp nao e repositorio; sem o teto o `git ls-files`
// subiria ate achar um `.git` alheio.
const rodarEm = (raiz, script = join(raiz, 'scripts/ci/check-test-inventory.mjs')) =>
  spawnSync(process.execPath, [script], { cwd: raiz, encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(raiz) } });
const MAIN_POR_PASTA = ['jobs:', '  t:', '    steps:', '      - run: deno test --allow-net supabase/functions/', ''].join('\n');
const MAIN_SEM_DENO = (linhas) => ['jobs:', '  t:', '    steps:', ...linhas, ''].join('\n');

test('CLI: suite orfa reprova e suite com passo aprova', () => {
  const orfa = arvore({ '.github/workflows/main.yml': MAIN_POR_PASTA, 'scripts/nova/x.unit.mjs': '' });
  const coberta = arvore({
    '.github/workflows/main.yml': MAIN_POR_PASTA,
    '.github/workflows/g.yml': MAIN_SEM_DENO(['      - run: node --test scripts/nova/*.unit.mjs']),
    'scripts/nova/x.unit.mjs': '',
  });
  try {
    const r = rodarEm(orfa);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /scripts\/nova\/x\.unit\.mjs/u);
    const ok = rodarEm(coberta);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /check-test-inventory: OK/u);
  } finally {
    rmSync(orfa, { recursive: true, force: true });
    rmSync(coberta, { recursive: true, force: true });
  }
});

test('CLI: roda de verdade com espaco/acento no caminho e quando chamado por link simbolico', () => {
  // Medido: nos dois casos a guarda de modulo principal nao batia, o inventario nao rodava e
  // o processo saia 0 sem imprimir nada -- suite orfa passava em silencio.
  const raiz = arvore({ '.github/workflows/main.yml': MAIN_POR_PASTA, 'scripts/nova/x.unit.mjs': '' }, 'inventario com espaço-');
  const link = `${raiz}-link`;
  try {
    const direto = rodarEm(raiz);
    assert.equal(direto.status, 1, `caminho com espaco deveria reprovar a orfa: ${direto.stdout}${direto.stderr}`);
    symlinkSync(raiz, link);
    const porLink = rodarEm(raiz, join(link, 'scripts/ci/check-test-inventory.mjs'));
    assert.equal(porLink.status, 1, `chamada por link deveria reprovar a orfa: ${porLink.stdout}${porLink.stderr}`);
  } finally {
    rmSync(link, { force: true });
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('CLI: sem o comando por pasta, teste Deno citado so em comentario e `*_test.ts` sao orfaos', () => {
  // Medido: a lista de fallback lia o YAML cru (comentario contava) e so enxergava `.test.ts`.
  const comentario = arvore({
    '.github/workflows/main.yml': MAIN_SEM_DENO(['      # deno test supabase/functions/f/a.test.ts', '      - run: echo oi']),
    'supabase/functions/f/a.test.ts': '',
  });
  const sublinhado = arvore({
    '.github/workflows/main.yml': MAIN_SEM_DENO(['      - run: echo oi']),
    'supabase/functions/f/b_test.ts': '',
  });
  const listado = arvore({
    '.github/workflows/main.yml': MAIN_SEM_DENO(['      - run: deno test supabase/functions/f/a.test.ts supabase/functions/f/b_test.ts']),
    'supabase/functions/f/a.test.ts': '',
    'supabase/functions/f/b_test.ts': '',
  });
  try {
    const a = rodarEm(comentario);
    assert.equal(a.status, 1, a.stdout + a.stderr);
    assert.match(a.stderr, /supabase\/functions\/f\/a\.test\.ts/u);
    const b = rodarEm(sublinhado);
    assert.equal(b.status, 1, b.stdout + b.stderr);
    assert.match(b.stderr, /supabase\/functions\/f\/b_test\.ts/u);
    const c = rodarEm(listado);
    assert.equal(c.status, 0, c.stdout + c.stderr);
  } finally {
    for (const raiz of [comentario, sublinhado, listado]) rmSync(raiz, { recursive: true, force: true });
  }
});

test('CLI: link simbolico pendurado em scripts/ nao derruba o inventario', () => {
  const raiz = arvore({ '.github/workflows/main.yml': MAIN_POR_PASTA });
  try {
    symlinkSync(join(raiz, 'nao-existe'), join(raiz, 'scripts/pendurado'));
    const r = rodarEm(raiz);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /check-test-inventory: OK/u);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
