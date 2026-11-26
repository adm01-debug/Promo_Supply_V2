// Cenarios de scripts/inventario/gerar-repo.mjs e mudou-conteudo.mjs (CLI de verdade em fixtures).
// Precisa de `rg` (ripgrep) nos casos que geram o inventario de verdade e de `git` no caso do repo git;
// sem eles o caso fica `skip` com o motivo. O resto roda so com node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, FERRAMENTAS, envSemGit, pastaNova, repoFalso, requer, rodar, importar } from './lib.mjs';

const SCRIPT = 'scripts/inventario/gerar-repo.mjs';
const MUDOU = 'scripts/inventario/mudou-conteudo.mjs';
const mud = await importar(MUDOU);
const SEM_RG = requer(FERRAMENTAS.rg, 'ripgrep (rg) ausente no PATH');
const SEM_GIT = requer(FERRAMENTAS.git, 'git ausente no PATH');

const base = () => ({
  'supabase/functions/_shared/util.ts': "export const x = Deno.env.get('SEGREDO_SHARED');\n",
  'supabase/functions/sem-index/outro.ts': '// sem index.ts\n',
  'supabase/functions/edge-a/index.ts': "const a = Deno.env.get('B_KEY');\nconst b = Deno.env.get(\"A_KEY\");\nconst c = Deno.env.get( 'A_KEY' );\n",
  'supabase/functions/edge-b/index.ts': "// chama a outra\nawait fetch(`${u}/functions/v1/edge-a`);\nconst me = 'edge-b';\n",
  'supabase/functions/edge-c/index.ts': 'export {};\r\n// acentuação: ção\r\n',
  'supabase/functions/edge.com+regex/index.ts': 'export {};\n',
  'src/a.ts': "supabase.functions.invoke('edge-a', {});\nsupabase.from('pedidos');\nsupabase.from('pedidos');\n",
  'src/b.ts': "supabase.from(\"itens\");\n",
  'supabase/migrations/20260101000000_x.sql': "select net.http_post('https://x.supabase.co/functions/v1/edge-c');\n",
  'tests-e2e/t.spec.ts': "// edge-a no e2e\n",
  '.github/workflows/w.yml': "run: curl /functions/v1/edge-b\n",
  'supabase/config.toml': '[functions.edge-a]\nverify_jwt = false\n',
  'src/integrations/supabase/types.ts': 'export type Database = {\n  public: {\n    Tables: {\n      pedidos: {\n      }\n    }\n  }\n}\n',
});
const cli = (raiz, { stdin = '', env = {}, script = SCRIPT } = {}) =>
  rodar(process.execPath, [path.join(raiz, script)], { cwd: '/', input: stdin, env: { ...process.env, ...env } });
const ler = (raiz, nome) => JSON.parse(fs.readFileSync(path.join(raiz, 'inventario/estado', nome), 'utf8'));

test('fixture: edges, segredos, chamadores e sem_chamador', { skip: SEM_RG }, () => {
  const raiz = repoFalso(base(), { scripts: [SCRIPT] });
  const r = cli(raiz);
  assert.equal(r.status, 0, r.saida);
  assert.match(r.stdout, /^edges: 4 \| sem chamador no repo \(src\/migrations\/edges\): 2\n$/);
  const j = ler(raiz, 'edges.json');
  assert.equal(j.total, 4);
  assert.deepEqual(Object.keys(j.edge_functions), ['edge-a', 'edge-b', 'edge-c', 'edge.com+regex']);
  assert.deepEqual(j.edge_functions['edge-a'], {
    linhas: 4, segredos_lidos: ['A_KEY', 'B_KEY'],
    chamada_em: { src: 1, migrations: 0, outras_edges: 1, e2e: 1, ci_config: 1 }, sem_chamador: false,
  });
  assert.deepEqual(j.edge_functions['edge-b'].chamada_em, { src: 0, migrations: 0, outras_edges: 0, e2e: 0, ci_config: 1 });
  assert.equal(j.edge_functions['edge-b'].sem_chamador, true, 'so cita a si mesma e CI: sem chamador');
  assert.equal(j.edge_functions['edge-c'].chamada_em.migrations, 1);
  assert.deepEqual(j.sem_chamador_no_repo, ['edge-b', 'edge.com+regex']);
  assert.ok(!fs.existsSync(path.join(raiz, 'inventario/estado/tabelas-uso.json')), 'sem stdin nao grava tabelas-uso');
  assert.match(j.gerado_em, /^\d{4}-\d\d-\d\dT/);
});

test('fixture: stdin com tabelas grava tabelas-uso.json (CRLF, linha vazia, nome com caractere de regex)', { skip: SEM_RG }, () => {
  const raiz = repoFalso(base(), { scripts: [SCRIPT] });
  const r = cli(raiz, { stdin: 'pedidos\r\nitens\n\nnao_usada\nxx.*\n' });
  assert.equal(r.status, 0, r.saida);
  const j = ler(raiz, 'tabelas-uso.json');
  assert.equal(j.total, 4);
  assert.deepEqual(j.tabelas.pedidos, { from_src: 2, from_edges: 0, em_types_ts: true });
  assert.deepEqual(j.tabelas.itens, { from_src: 1, from_edges: 0, em_types_ts: false });
  assert.deepEqual(j.tabelas['xx.*'], { from_src: 0, from_edges: 0, em_types_ts: false });
  assert.deepEqual(j.sem_from_em_src_nem_edges, ['nao_usada', 'xx.*']);
});

test('fixture: pastas opcionais ausentes (tests-e2e, migrations, .github, config.toml) viram 0, nao erro', { skip: SEM_RG }, () => {
  const arquivos = base();
  for (const k of Object.keys(arquivos)) if (/^(tests-e2e|supabase\/migrations|\.github|supabase\/config)/.test(k)) delete arquivos[k];
  const raiz = repoFalso(arquivos, { scripts: [SCRIPT] });
  const r = cli(raiz);
  assert.equal(r.status, 0, r.saida);
  assert.deepEqual(ler(raiz, 'edges.json').edge_functions['edge-a'].chamada_em, { src: 1, migrations: 0, outras_edges: 1, e2e: 0, ci_config: 0 });
});

test('fixture: repo em caminho com espaco e acento', { skip: SEM_RG }, () => {
  const raiz = repoFalso(base(), { scripts: [SCRIPT], nome: 'meu repo ação' });
  const r = cli(raiz);
  assert.equal(r.status, 0, r.saida);
  assert.equal(ler(raiz, 'edges.json').total, 4);
  assert.equal(ler(raiz, 'edges.json').edge_functions['edge-a'].chamada_em.src, 1);
  const irmaos = fs.readdirSync(path.dirname(raiz)).filter((d) => d.includes('%'));
  assert.deepEqual(irmaos, [], 'nao pode criar pasta com nome percent-encoded');
});

test('fixture: sem rg no PATH falha alto e nao grava edges.json', () => {
  const raiz = repoFalso(base(), { scripts: [SCRIPT] });
  const r = cli(raiz, { env: { PATH: path.dirname(process.execPath) } });
  // se o node mora no mesmo diretorio do rg este cenario nao isola; confere
  if (fs.existsSync(path.join(path.dirname(process.execPath), 'rg'))) return;
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /ripgrep \(rg\) não encontrado/);
  assert.ok(!fs.existsSync(path.join(raiz, 'inventario/estado/edges.json')));
});

test('fixture: rg que falha (exit 2) derruba o inventario; rg sem resultado (exit 1) nao', () => {
  const raiz = repoFalso(base(), { scripts: [SCRIPT] });
  const bin = pastaNova('bin');
  fs.writeFileSync(path.join(bin, 'rg'), '#!/bin/sh\necho "rg: erro de regex" >&2\nexit 2\n', { mode: 0o755 });
  let r = cli(raiz, { env: { PATH: `${bin}:${process.env.PATH}` } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /ripgrep \(rg\) falhou com exit 2/);
  assert.ok(!fs.existsSync(path.join(raiz, 'inventario/estado/edges.json')));
  fs.writeFileSync(path.join(bin, 'rg'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  r = cli(raiz, { env: { PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(r.status, 0, r.saida);
  assert.equal(ler(raiz, 'edges.json').sem_chamador_no_repo.length, 4);
});

test('fixture: sem supabase/functions falha alto', () => {
  const raiz = repoFalso({ 'src/a.ts': '' }, { scripts: [SCRIPT] });
  const r = cli(raiz);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /ENOENT/);
});

test('fixture: 0 edges -> edges.json com total 0', () => {
  const raiz = repoFalso({ 'supabase/functions/_shared/x.ts': '' }, { scripts: [SCRIPT] });
  const r = cli(raiz);
  assert.equal(r.status, 0, r.saida);
  assert.deepEqual(ler(raiz, 'edges.json').edge_functions, {});
});

test('fixture: duas execucoes so diferem em gerado_em (mudou-conteudo = false)', { skip: SEM_RG }, async () => {
  const raiz = repoFalso(base(), { scripts: [SCRIPT] });
  cli(raiz);
  const a = fs.readFileSync(path.join(raiz, 'inventario/estado/edges.json'), 'utf8');
  await new Promise((r) => setTimeout(r, 15));
  cli(raiz);
  const b = fs.readFileSync(path.join(raiz, 'inventario/estado/edges.json'), 'utf8');
  assert.notEqual(a, b);
  assert.equal(mud.semCarimbos(a), mud.semCarimbos(b));
});

test('real (arvore espelhada por symlink, sem escrever no repo): edges.json bate com as pastas de supabase/functions, ordenado e deterministico', { skip: SEM_RG }, () => {
  const gerar = () => {
    const raiz = repoFalso({}, { scripts: [SCRIPT] });
    for (const d of ['src', 'supabase', 'tests-e2e', '.github']) {
      if (fs.existsSync(path.join(REPO, d))) fs.symlinkSync(path.join(REPO, d), path.join(raiz, d));
    }
    const r = cli(raiz);
    assert.equal(r.status, 0, r.saida);
    return fs.readFileSync(path.join(raiz, 'inventario/estado/edges.json'), 'utf8');
  };
  const a = gerar();
  const b = gerar();
  assert.equal(mud.semCarimbos(a), mud.semCarimbos(b), 'duas geracoes no repo real so diferem no carimbo');
  const j = JSON.parse(a);
  const FDIR = path.join(REPO, 'supabase/functions');
  const esperadas = fs.readdirSync(FDIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(FDIR, d.name, 'index.ts')))
    .map((d) => d.name).sort();
  assert.deepEqual(Object.keys(j.edge_functions), esperadas);
  assert.equal(j.total, esperadas.length);
  assert.ok(j.total > 0);
  for (const k of j.sem_chamador_no_repo) assert.ok(k in j.edge_functions, k);
  for (const [k, v] of Object.entries(j.edge_functions)) {
    const { src, migrations, outras_edges: outras } = v.chamada_em;
    assert.equal(v.sem_chamador, src + migrations + outras === 0, k);
  }
});

// ---------------- mudou-conteudo ----------------
test('semCarimbos: ignora carimbo e telemetria, mantem o resto; ordem de chave nao importa; ordem de lista importa', () => {
  const a = { medido_em: 'x', b: 1, a: { gerado_em: 'y', execucoes_24h: 3, c: [1, 2] } };
  const b = { a: { c: [1, 2], gerado_em: 'z', execucoes_24h: 9 }, b: 1, medido_em: 'w' };
  assert.equal(mud.semCarimbos(JSON.stringify(a)), mud.semCarimbos(JSON.stringify(b)));
  assert.notEqual(mud.semCarimbos(JSON.stringify({ c: [1, 2] })), mud.semCarimbos(JSON.stringify({ c: [2, 1] })));
  assert.notEqual(mud.semCarimbos(JSON.stringify({ b: 1 })), mud.semCarimbos(JSON.stringify({ b: 2 })));
  assert.equal(mud.semCarimbos(null), null);
  assert.equal(mud.semCarimbos('nao e json'), 'nao e json');
  assert.equal(mud.semCarimbos(''), '');
});

test('semCarimbos: linhas/bytes so somem dentro de cron.historico; em tabelas[] contam', () => {
  const banco = (linhasTabela, linhasHist, pct, horas) => JSON.stringify({
    tabelas: [{ nome: 't', linhas: linhasTabela, bytes: 10 }],
    cron: { historico: { linhas: linhasHist, bytes: linhasHist * 2, mais_de_7_dias: linhasHist, mais_antigo: 'd' }, horas_paradas_7d: horas, jobs: [{ nome: 'j', taxa_falha_7d_pct: pct, ativo: true }] },
    alertas: [
      { tipo: 'cron_falhando', detalhe: [`j (${pct}% em 7d)`] },
      { tipo: 'cron_parado', detalhe: horas },
      { tipo: 'historico_cron_sem_limpeza', detalhe: [`${linhasHist} linhas com mais de 7 dias`] },
      { tipo: 'tabela_sem_rls', detalhe: ['t'] },
    ],
  });
  assert.equal(mud.semCarimbos(banco(5, 100, 9, ['h1'])), mud.semCarimbos(banco(5, 999, 9.3, ['h2', 'h3'])), 'so telemetria: igual');
  assert.notEqual(mud.semCarimbos(banco(5, 100, 9, [])), mud.semCarimbos(banco(6, 100, 9, [])), 'linhas de tabela: mudou');
  const semAlerta = JSON.parse(banco(5, 100, 9, []));
  semAlerta.alertas = semAlerta.alertas.filter((x) => x.tipo !== 'cron_falhando');
  assert.notEqual(mud.semCarimbos(banco(5, 100, 9, [])), mud.semCarimbos(JSON.stringify(semAlerta)), 'alerta que some: mudou');
  const outroJob = JSON.parse(banco(5, 100, 9, []));
  outroJob.alertas[0].detalhe = ['j (9% em 7d)', 'k (50% em 7d)'];
  assert.notEqual(mud.semCarimbos(banco(5, 100, 9, [])), mud.semCarimbos(JSON.stringify(outroJob)), 'job novo falhando: mudou');
});

test('mudou(): arquivo novo, apagado, igual, ausente nos dois lados', () => {
  const antes = { a: '{"x":1,"gerado_em":"1"}', b: null, c: '{"x":1}', d: null };
  const depois = { a: '{"gerado_em":"2","x":1}', b: null, c: '{"x":1}', d: null };
  const la = (f) => antes[f]; const ld = (f) => depois[f];
  assert.equal(mud.mudou(['a', 'b', 'c', 'd'], la, ld), false);
  assert.equal(mud.mudou(['a'], la, () => '{"x":2}'), true);
  assert.equal(mud.mudou(['b'], la, () => '{}'), true, 'arquivo novo');
  assert.equal(mud.mudou(['c'], la, () => null), true, 'arquivo apagado');
  assert.equal(mud.mudou([], la, ld), false);
});

test('mudou-conteudo CLI num repo git de verdade: false, true (conteudo), false (so data), true (arquivo novo), JSON truncado', { skip: SEM_GIT }, () => {
  const raiz = repoFalso({
    'inventario/estado/edges.json': '{"gerado_em":"2026-01-01","total":1}\n',
    'inventario/estado/rotas.json': '{\n  "format_version": 1\n}\n',
  }, { scripts: [MUDOU] });
  const git = (...a) => rodar('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { cwd: raiz, env: envSemGit() });
  assert.equal(git('init', '-q').status, 0);
  git('add', '-A');
  const c = git('commit', '-q', '-m', 'base');
  assert.equal(c.status, 0, c.saida);
  const run = (...args) => rodar(process.execPath, [MUDOU, ...args], { cwd: raiz, env: envSemGit() });
  assert.equal(run().stdout, 'false\n');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/edges.json'), '{"gerado_em":"2099-01-01","total":1}\n');
  assert.equal(run().stdout, 'false\n', 'so a data');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/edges.json'), '{"gerado_em":"2099-01-01","total":2}\n');
  assert.equal(run().stdout, 'true\n');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/edges.json'), '{"gerado_em":"2099-01-01","total":1}\n');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/banco.json'), '{"medido_em":"x","tabelas":[]}\n');
  assert.equal(run().stdout, 'true\n', 'banco.json novo');
  assert.equal(run('inventario/estado/edges.json').stdout, 'false\n', 'lista explicita de arquivos');
  fs.rmSync(path.join(raiz, 'inventario/estado/banco.json'));
  fs.rmSync(path.join(raiz, 'inventario/estado/rotas.json'));
  assert.equal(run().stdout, 'true\n', 'arquivo apagado');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/rotas.json'), '{\n  "format_version": 1\n}\n');
  fs.writeFileSync(path.join(raiz, 'inventario/estado/edges.json'), '{"gerado_em":"2099-01-01","tot');
  const r = run();
  assert.equal(r.stdout, 'true\n', 'JSON truncado conta como mudanca');
  assert.equal(r.status, 0);
});

test('mudou-conteudo CLI: saida e exatamente true|false (uma linha) — o workflow compara com "true"', () => {
  const r = rodar(process.execPath, [path.join(REPO, MUDOU), 'arquivo/que/nao/existe.json'], { cwd: REPO, env: envSemGit() });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'false\n');
  assert.equal(r.stderr, '');
});
