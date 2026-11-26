// Cenarios de scripts/inventario/gerar-banco.mjs + banco.sql.
// A Management API e um servidor HTTP local (SUPABASE_API_URL, que o proprio script preve para teste).
// Os 4 casos que rodam o banco.sql de verdade precisam de um Postgres efemero LOCAL, que so sobe com
// INVENTARIO_TEST_PG_BIN (ver pg.mjs); sem a variavel ficam `skip` e nenhum cluster e criado. Nunca ha
// conexao com banco real.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { REPO, repoFalso, rodar, importar } from './lib.mjs';
import { pg, rodarPsql } from './pg.mjs';

const SCRIPT = 'scripts/inventario/gerar-banco.mjs';
const SQL = 'scripts/inventario/banco.sql';
const m = await importar(SCRIPT);
const TOKEN = 'sbp_0123456789abcdef0123456789abcdef01234567';

const versoes = (n, base = 20260101000000) => Array.from({ length: n }, (_, i) => String(base + i));
const dadoBase = (extra = {}) => ({
  format_version: 1,
  medido_em: '2026-11-09T00:00:00Z',
  resumo: { ledger_registros: 30, ledger_versao_max: '20260101000029', tabelas_public: 2 },
  tabelas: [
    { nome: 'pedidos', rls: true, rls_forcado: false, policies: 2, triggers: 0, linhas: 3, linhas_exatas: true, bytes: 1, citada_no_banco: false },
    { nome: 'orfa', rls: true, rls_forcado: false, policies: 1, triggers: 0, linhas: 0, linhas_exatas: true, bytes: 1, citada_no_banco: false },
  ],
  cron: { config: {}, jobs: [], horas_paradas_7d: [], historico: { linhas: 0, mais_de_7_dias: 0, mais_antigo: null, bytes: 0 } },
  ...extra,
});
const arquivosRepo = (n = 30) => ({
  ...Object.fromEntries(versoes(n).map((v) => [`supabase/migrations/${v}_x.sql`, '-- x\n'])),
  'supabase/functions/edge-a/index.ts': "await sb.from('pedidos').select();\n",
  'supabase/functions/_shared/x.ts': "sb.from('pedidos');\n",
  'src/a.ts': "supabase.from('pedidos');\nsupabase.storage.from('pedidos');\nfetch('/rest/v1/pedidos?x');\nfetch('/rest/v1/rpc/pedidos');\n",
  'src/a.test.ts': "supabase.from('orfa');\n",
  'src/__tests__/b.ts': "supabase.from('orfa');\n",
});
const cli = (raiz, args = [], env = {}) => new Promise((resolve) => {
  const limpo = { ...process.env };
  for (const k of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'VITE_SUPABASE_PROJECT_ID', 'VITE_SUPABASE_URL', 'SUPABASE_API_URL']) delete limpo[k];
  const p = spawn(process.execPath, [path.join(raiz, SCRIPT), ...args], { cwd: '/', env: { ...limpo, ...env } });
  let stdout = ''; let stderr = '';
  p.stdout.on('data', (d) => { stdout += d; });
  p.stderr.on('data', (d) => { stderr += d; });
  p.on('close', (status) => resolve({ status, stdout, stderr, saida: stdout + stderr }));
});
const saidaDe = (raiz) => path.join(raiz, 'inventario/estado/banco.json');
function servidor(rotas) {
  const pedidos = [];
  const srv = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (d) => { corpo += d; });
    req.on('end', () => {
      pedidos.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, corpo });
      const r = rotas(req, corpo);
      if (r === 'derruba') { req.socket.destroy(); return; }
      res.writeHead(r.status ?? 200, { 'content-type': 'application/json' });
      res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
    });
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}`, pedidos, fechar: () => new Promise((f) => srv.close(f)) })));
}

// ---------------- funcoes puras ----------------
test('refDoProjeto: precedencia, espacos, URL .co/.in, erro sem nada', () => {
  assert.equal(m.refDoProjeto({ SUPABASE_PROJECT_REF: ' abc ', VITE_SUPABASE_PROJECT_ID: 'zzz' }), 'abc');
  assert.equal(m.refDoProjeto({ SUPABASE_PROJECT_REF: '', VITE_SUPABASE_PROJECT_ID: 'zzz' }), 'zzz');
  // ref so com espacos nao vira ref vazio na URL: cai no erro explicito
  assert.throws(() => m.refDoProjeto({ SUPABASE_PROJECT_REF: '  ' }), /sem ref do projeto/);
  assert.equal(m.refDoProjeto({ VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co' }), 'abcdefghijklmnopqrst');
  assert.equal(m.refDoProjeto({ VITE_SUPABASE_URL: ' https://abcdefghijklmnopqrst.supabase.in/x ' }), 'abcdefghijklmnopqrst');
  assert.throws(() => m.refDoProjeto({ VITE_SUPABASE_URL: 'https://exemplo.com' }), /sem ref do projeto/);
  assert.throws(() => m.refDoProjeto({ VITE_SUPABASE_URL: 'https://curto.supabase.co' }), /sem ref do projeto/);
  assert.throws(() => m.refDoProjeto({}), /sem ref do projeto/);
});

test('extrairInventario: todas as formas de entrada aceitas', () => {
  const d = dadoBase();
  const formas = [
    d, JSON.stringify(d), `﻿${JSON.stringify(d)}\r\n`,
    [{ inventario: d }], { rows: [{ inventario: d }] }, { inventario: d }, { inventario: JSON.stringify(d) },
    { result: { content: [{ type: 'text', text: JSON.stringify({ rows: [{ inventario: d }] }) }] } },
    { content: [{ type: 'text', text: JSON.stringify([{ inventario: d }]) }] },
  ];
  for (const f of formas) assert.deepEqual(m.extrairInventario(f), d);
});

test('extrairInventario: entrada invalida sempre lanca (nunca devolve inventario parcial)', () => {
  for (const ruim of ['', '   ', 'nao e json', '[]', '{}', 'null', '{"rows":[]}', '[{"inventario":null}]', '42']) {
    assert.throws(() => m.extrairInventario(ruim), undefined, JSON.stringify(ruim));
  }
  assert.throws(() => m.extrairInventario(dadoBase({ format_version: 2 })), /format_version 2 desconhecido/);
  assert.throws(() => m.extrairInventario(dadoBase({ tabelas: [] })), /entrada sem tabelas/);
  assert.throws(() => m.extrairInventario(dadoBase({ tabelas: 'x' })), /entrada sem tabelas/);
  const semCron = dadoBase(); delete semCron.cron;
  assert.throws(() => m.extrairInventario(semCron), /entrada sem as chaves: cron/);
});

test('contarUsoNoCodigo: .from e /rest/v1 contam, storage.from, rpc, testes e nomes desconhecidos nao', () => {
  const raiz = repoFalso(arquivosRepo());
  assert.deepEqual(m.contarUsoNoCodigo(raiz, ['pedidos', 'orfa', 'constructor', 'toString']), {
    pedidos: { src: 2, edges: 2 }, orfa: { src: 0, edges: 0 }, constructor: { src: 0, edges: 0 }, toString: { src: 0, edges: 0 },
  });
  const vazio = repoFalso({});
  assert.deepEqual(m.contarUsoNoCodigo(vazio, ['x']), { x: { src: 0, edges: 0 } });
});

test('contarUsoNoCodigo: .from(nome-de-prototype) no codigo nao quebra nem muda a contagem', () => {
  const raiz = repoFalso({ 'src/a.ts': "Array.from('constructor');\nx.from('toString');\nx.from('pedidos');\n" });
  assert.deepEqual(m.contarUsoNoCodigo(raiz, ['pedidos']), { pedidos: { src: 1, edges: 0 } });
});

test('conferirOrigem: ledger dentro da tolerancia passa; fora, lanca', () => {
  const repo = versoes(30);
  const ok = (resumo) => m.conferirOrigem(dadoBase({ resumo }), null, repo);
  assert.deepEqual(ok({ ledger_registros: 30, ledger_versao_max: '20260101000029' }), { conferencia_por_manifesto: false, ledger_registros: 30, migrations_no_repo: 30 });
  ok({ ledger_registros: 33, ledger_versao_max: '20270101000000' }); // 10% e a frente
  ok({ ledger_registros: 27, ledger_versao_max: '20260101000010' }); // -10% e a 20a mais recente
  assert.throws(() => ok({ ledger_registros: 34, ledger_versao_max: '20260101000029' }), /nao parece ser do banco deste projeto/);
  assert.throws(() => ok({ ledger_registros: 26, ledger_versao_max: '20260101000029' }), /nao parece ser do banco deste projeto/);
  assert.throws(() => ok({ ledger_registros: 30, ledger_versao_max: '20260101000009' }), /nao parece ser do banco deste projeto/);
  assert.throws(() => m.conferirOrigem(dadoBase(), null, []), /sem supabase\/migrations/);
  assert.throws(() => m.conferirOrigem(dadoBase(), null, null), /sem supabase\/migrations/);
  assert.throws(() => m.conferirOrigem(dadoBase({ resumo: {} }), null, repo), /rode o banco\.sql atual/);
  assert.throws(() => m.conferirOrigem(dadoBase({ resumo: undefined }), null, repo), /rode o banco\.sql atual/);
});

test('conferirOrigem: banco SEM ledger (ou vazio) diz a causa, nao "rode o banco.sql atual"', () => {
  const repo = versoes(30);
  assert.throws(() => m.conferirOrigem(dadoBase({ resumo: { ledger_registros: null, ledger_versao_max: null } }), null, repo),
    (e) => /nao tem .*supabase_migrations\.schema_migrations/.test(e.message) && !/rode o banco\.sql atual/.test(e.message));
  assert.throws(() => m.conferirOrigem(dadoBase({ resumo: { ledger_registros: 0, ledger_versao_max: null } }), null, repo),
    (e) => /vazio/.test(e.message) && /supabase_migrations\.schema_migrations/.test(e.message));
});

test('conferirOrigem: manifesto (quando existir) exige >= 90% nos dois sentidos', () => {
  const repo = versoes(30);
  const tabelas = Array.from({ length: 10 }, (_, i) => ({ nome: `t${i}` }));
  const d = dadoBase({ tabelas });
  assert.equal(m.conferirOrigem(d, tabelas.map((t) => t.nome), repo).conferencia_por_manifesto, true);
  assert.equal(m.conferirOrigem(d, [...tabelas.slice(0, 9).map((t) => t.nome), 'outra'], repo).tabelas_em_comum_com_manifesto, 9);
  assert.throws(() => m.conferirOrigem(d, ['a', 'b', 'c', 't0'], repo), /em comum com o manifesto/);
  assert.equal(m.conferirOrigem(d, [], repo).conferencia_por_manifesto, false);
});

test('versoesDoRepo e edgesNoRepo', () => {
  const raiz = repoFalso({
    'supabase/migrations/20260101000000_a.sql': '', 'supabase/migrations/20260101000001_b-c_d.sql': '',
    'supabase/migrations/README.md': '', 'supabase/migrations/_superseded/20250101000000_x.sql': '', 'supabase/migrations/sem_versao.sql': '',
    'supabase/functions/b/index.ts': '', 'supabase/functions/a/index.ts': '', 'supabase/functions/_shared/index.ts': '', 'supabase/functions/sem/x.ts': '', 'supabase/functions/solto.ts': '',
  });
  assert.deepEqual(m.versoesDoRepo(raiz).sort(), ['20260101000000', '20260101000001']);
  assert.deepEqual(m.edgesNoRepo(raiz), ['a', 'b']);
  assert.equal(m.versoesDoRepo(REPO).length, fs.readdirSync(path.join(REPO, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).length);
});

test('compararEdges: nao consultado, normal, vazio; ordem independe do locale', () => {
  assert.deepEqual(m.compararEdges(null, ['a']), { publicadas: null, no_repo: 1, publicadas_sem_codigo_no_repo: null, no_repo_sem_deploy: null });
  const r = m.compararEdges([
    { slug: 'z', version: 3, status: 'ACTIVE', verify_jwt: true, updated_at: 1762732800000 },
    { slug: 'a', version: 1, status: 'ACTIVE', verify_jwt: false, updated_at: '2026-11-09T12:34:56.789Z' },
    { slug: 'so-publicada', version: 1, status: 'ACTIVE', verify_jwt: true },
  ], ['a', 'so-repo', 'z']);
  assert.deepEqual(r.publicadas.map((p) => p.slug), ['a', 'so-publicada', 'z']);
  assert.equal(r.publicadas[0].atualizada_em, '2026-11-09T12:34Z');
  assert.equal(r.publicadas[1].atualizada_em, null);
  assert.deepEqual(r.publicadas_sem_codigo_no_repo, ['so-publicada']);
  assert.deepEqual(r.no_repo_sem_deploy, ['so-repo']);
  assert.deepEqual(m.compararEdges([], ['a']).no_repo_sem_deploy, ['a']);
  const ordem = (loc) => rodar(process.execPath, ['-e', `import(${JSON.stringify(path.join(REPO, SCRIPT))}).then((x) => console.log(x.compararEdges(['hy', 'hi', 'ch', 'cz', 'h'].map((slug) => ({ slug })), []).publicadas.map((p) => p.slug).join(',')))`],
    { env: { ...process.env, LC_ALL: loc, LANG: loc } }).stdout.trim();
  assert.equal(ordem('lt_LT.UTF-8'), ordem('C.UTF-8'));
  assert.equal(ordem('cs_CZ.UTF-8'), ordem('C.UTF-8'));
});

test('rodaTodoDia', () => {
  for (const sim of ['*/5 * * * *', '0 3 * * *', '30 seconds', '1 second', ' 0 3 */1 1-12 0-6 ', '0 3 1-31 * 1-7', '* * * * 0-7']) assert.equal(m.rodaTodoDia(sim), true, sim);
  for (const nao of ['0 0 1 * *', '0 0 * * 1', '0 0 * 1 *', '0 0 * * 1-5', '@daily', '', null, undefined, '* * * *', '* * * * * *']) assert.equal(m.rodaTodoDia(nao), false, String(nao));
});

test('montarInventario: orfas, cada alerta, chaves ordenadas, sem mutar a entrada', () => {
  const dado = dadoBase({
    tabelas: [
      { nome: 'usada', rls: true, policies: 1, linhas: 0, citada_no_banco: false },
      { nome: 'orfa', rls: true, policies: 1, linhas: 0, citada_no_banco: false },
      { nome: 'citada', rls: true, policies: 1, linhas: 0, citada_no_banco: true },
      { nome: 'com_linha', rls: false, policies: 0, linhas: 1, citada_no_banco: false },
      { nome: 'cofre', rls: true, policies: 0, linhas: 0, citada_no_banco: false },
    ],
    cron: {
      config: {},
      jobs: [
        { nome: 'ok', ativo: true, agenda: '* * * * *', execucoes_24h: 10, taxa_falha_7d_pct: 4.9 },
        { nome: 'ruim', ativo: true, agenda: '* * * * *', execucoes_24h: 10, taxa_falha_7d_pct: 5 },
        { nome: 'ruim-inativo', ativo: false, agenda: '* * * * *', execucoes_24h: 0, taxa_falha_7d_pct: 99 },
        { nome: 'mudo', ativo: true, agenda: '0 3 * * *', execucoes_24h: 0, taxa_falha_7d_pct: 0 },
        { nome: 'mensal', ativo: true, agenda: '0 3 1 * *', execucoes_24h: 0, taxa_falha_7d_pct: 0 },
      ],
      horas_paradas_7d: [{ hora: 'h1' }],
      historico: { mais_de_7_dias: 50001 },
    },
  });
  const copia = JSON.stringify(dado);
  const inv = m.montarInventario(dado, { usada: { src: 1, edges: 0 } }, m.compararEdges([{ slug: 'x' }], ['y']));
  assert.equal(JSON.stringify(dado), copia);
  assert.deepEqual(inv.tabelas_orfas.lista, ['orfa', 'cofre']);
  assert.deepEqual(inv.alertas, [
    { detalhe: ['com_linha'], tipo: 'tabela_sem_rls' },
    { detalhe: ['cofre'], tipo: 'rls_sem_policy' },
    { detalhe: ['ruim (5% em 7d)'], tipo: 'cron_falhando' },
    { detalhe: ['mudo'], tipo: 'cron_sem_execucao' },
    { detalhe: ['h1'], tipo: 'cron_parado' },
    { detalhe: ['50001 linhas com mais de 7 dias'], tipo: 'historico_cron_sem_limpeza' },
    { detalhe: ['y'], tipo: 'edge_sem_deploy' },
    { detalhe: ['x'], tipo: 'edge_publicada_sem_codigo' },
  ]);
  assert.deepEqual(Object.keys(inv), [...Object.keys(inv)].sort());
  assert.deepEqual(inv.tabelas[0].uso_no_codigo, { edges: 0, src: 1 });
  const limpo = m.montarInventario(dadoBase(), {});
  assert.deepEqual(limpo.alertas, []);
  assert.equal(limpo.edge_functions.publicadas, null);
});

test('PARECE_CREDENCIAL', () => {
  for (const sim of ['Authorization: Bearer abcdefghijklmnopqrstuvwxyz', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYSJ9.sig', 'sb_secret_abc']) assert.ok(m.PARECE_CREDENCIAL.test(sim), sim);
  for (const nao of ['Bearer curto', 'net.http_post', 'tabela bearer_tokens', 'eyJ curto', 'sb_publishable_x']) assert.ok(!m.PARECE_CREDENCIAL.test(nao), nao);
});

// ---------------- CLI: --entrada ----------------
test('CLI --entrada: grava banco.json; 2a execucao identica; sem token as edges publicadas ficam null', async () => {
  const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
  const entrada = path.join(raiz, 'resp com espaço.json');
  fs.writeFileSync(entrada, JSON.stringify({ rows: [{ inventario: dadoBase() }] }));
  const r = await cli(raiz, ['--entrada', entrada]);
  assert.equal(r.status, 0, r.saida);
  assert.match(r.stdout, /^banco\.json: 2 tabelas, 0 cron jobs, 1 orfas, 0 alertas, edges 1 no repo \(publicadas nao consultadas\) \(medido_em 2026-11-09T00:00:00Z\)\.\n$/);
  const texto = fs.readFileSync(saidaDe(raiz), 'utf8');
  const j = JSON.parse(texto);
  assert.deepEqual(j.tabelas_orfas.lista, ['orfa']);
  assert.deepEqual(j.tabelas[0].uso_no_codigo, { edges: 2, src: 2 });
  assert.equal(j.edge_functions.publicadas, null);
  await cli(raiz, ['--entrada', entrada]);
  assert.equal(fs.readFileSync(saidaDe(raiz), 'utf8'), texto);
});

test('CLI --entrada + --functions: cruza publicadas x repo', async () => {
  const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
  fs.writeFileSync(path.join(raiz, 'e.json'), JSON.stringify(dadoBase()));
  fs.writeFileSync(path.join(raiz, 'f.json'), JSON.stringify([{ slug: 'fantasma', version: 2, status: 'ACTIVE', verify_jwt: true, updated_at: 1762732800000 }]));
  const r = await cli(raiz, ['--entrada', path.join(raiz, 'e.json'), '--functions', path.join(raiz, 'f.json')]);
  assert.equal(r.status, 0, r.saida);
  const j = JSON.parse(fs.readFileSync(saidaDe(raiz), 'utf8'));
  assert.deepEqual(j.alertas.map((a) => a.tipo), ['edge_sem_deploy', 'edge_publicada_sem_codigo']);
});

test('CLI: todo erro sai com exit 2, "ERRO:" e NAO toca no banco.json que ja existia', async () => {
  const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
  fs.mkdirSync(path.dirname(saidaDe(raiz)), { recursive: true });
  fs.writeFileSync(saidaDe(raiz), 'ANTIGO');
  const arq = (nome, conteudo) => { const p = path.join(raiz, nome); fs.writeFileSync(p, conteudo); return p; };
  const casos = [
    [[], /sem --entrada e sem SUPABASE_ACCESS_TOKEN/],
    [['--entrada'], /--entrada exige o caminho/],
    [['--entrada', path.join(raiz, 'nao-existe.json')], /ENOENT/],
    [['--entrada', arq('vazio.json', '')], /ERRO:/],
    [['--entrada', arq('lixo.json', '<html>')], /ERRO:/],
    [['--entrada', arq('outro-banco.json', JSON.stringify(dadoBase({ resumo: { ledger_registros: 5, ledger_versao_max: '20200101000000' } })))], /nao parece ser do banco deste projeto/],
    [['--entrada', arq('sem-ledger.json', JSON.stringify(dadoBase({ resumo: { ledger_registros: null, ledger_versao_max: null } })))], /nao tem .*supabase_migrations\.schema_migrations/],
    [['--entrada', arq('cred.json', JSON.stringify(dadoBase({ cron: { ...dadoBase().cron, jobs: [{ nome: 'j', ativo: false, chama: ['Bearer abcdefghijklmnopqrstuvwxyz0123456789'] }] } })))], /cara de credencial; nada foi gravado/],
    [['--entrada', arq('ok.json', JSON.stringify(dadoBase())), '--functions', path.join(raiz, 'nao-existe.json')], /ENOENT/],
  ];
  for (const [args, re] of casos) {
    const r = await cli(raiz, args);
    assert.equal(r.status, 2, `${args.join(' ')} -> ${r.saida}`);
    assert.match(r.stderr, re, args.join(' '));
    assert.match(r.stderr, /^ERRO: /);
    assert.equal(r.stdout, '');
    assert.equal(fs.readFileSync(saidaDe(raiz), 'utf8'), 'ANTIGO');
  }
});

test('CLI: repo sem supabase/migrations -> exit 2 (sem ledger local nao ha conferencia)', async () => {
  const arquivos = arquivosRepo();
  for (const k of Object.keys(arquivos)) if (k.startsWith('supabase/migrations/')) delete arquivos[k];
  const raiz = repoFalso(arquivos, { scripts: [SCRIPT, SQL] });
  fs.writeFileSync(path.join(raiz, 'e.json'), JSON.stringify(dadoBase()));
  const r = await cli(raiz, ['--entrada', path.join(raiz, 'e.json')]);
  assert.equal(r.status, 2);
  assert.ok(!fs.existsSync(saidaDe(raiz)));
});

// ---------------- CLI: Management API (servidor local) ----------------
test('API: caminho feliz — POST read-only com o banco.sql, GET /functions, Bearer no cabecalho, token fora de qualquer saida', async () => {
  const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
  const srv = await servidor((req) => (req.url.endsWith('/functions')
    ? { body: [{ slug: 'edge-a', version: 7, status: 'ACTIVE', verify_jwt: true, updated_at: 1762732800000 }] }
    : { status: 201, body: [{ inventario: dadoBase() }] }));
  const r = await cli(raiz, [], { SUPABASE_ACCESS_TOKEN: ` ${TOKEN}\n`, VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_API_URL: `${srv.url}/` });
  await srv.fechar();
  assert.equal(r.status, 0, r.saida);
  assert.deepEqual(srv.pedidos.map((p) => `${p.metodo} ${p.url}`), ['POST /v1/projects/abcdefghijklmnopqrst/database/query/read-only', 'GET /v1/projects/abcdefghijklmnopqrst/functions']);
  for (const p of srv.pedidos) assert.equal(p.auth, `Bearer ${TOKEN}`);
  assert.equal(JSON.parse(srv.pedidos[0].corpo).query, fs.readFileSync(path.join(raiz, SQL), 'utf8'));
  const texto = fs.readFileSync(saidaDe(raiz), 'utf8');
  assert.ok(!r.saida.includes(TOKEN) && !texto.includes(TOKEN));
  assert.match(r.stdout, /edges 1 publicadas\/1 no repo/);
  assert.equal(JSON.parse(texto).edge_functions.publicadas[0].versao, 7);
});

test('API: HTTP 400/401/500, corpo que nao e JSON, conexao derrubada, API fora do ar, /functions falhando — sempre exit 2 sem gravar e sem vazar token/corpo', async () => {
  const env = (url) => ({ SUPABASE_ACCESS_TOKEN: TOKEN, SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', SUPABASE_API_URL: url });
  const casos = [
    ['400', () => ({ status: 400, body: { message: `ERROR: relation "supabase_migrations.schema_migrations" does not exist SEGREDO_NO_CORPO` } }), /respondeu HTTP 400/],
    ['401', () => ({ status: 401, body: { message: 'Unauthorized SEGREDO_NO_CORPO' } }), /respondeu HTTP 401/],
    ['500', () => ({ status: 500, body: 'SEGREDO_NO_CORPO' }), /respondeu HTTP 500/],
    ['200 html', () => ({ status: 200, body: '<html>manutencao</html>' }), /ERRO:/],
    ['200 vazio', () => ({ status: 200, body: [] }), /entrada sem as chaves/],
    ['socket', () => 'derruba', /ERRO:/],
    ['functions 500', (req) => (req.url.endsWith('/functions') ? { status: 500, body: {} } : { body: [{ inventario: dadoBase() }] }), /\/functions respondeu HTTP 500/],
    ['functions nao-lista', (req) => (req.url.endsWith('/functions') ? { body: { message: 'x' } } : { body: [{ inventario: dadoBase() }] }), /ERRO:/],
  ];
  for (const [nome, rota, re] of casos) {
    const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
    const srv = await servidor(rota);
    const r = await cli(raiz, [], env(srv.url));
    await srv.fechar();
    assert.equal(r.status, 2, `${nome}: ${r.saida}`);
    assert.match(r.stderr, re, nome);
    assert.ok(!r.saida.includes(TOKEN), `${nome}: token vazou`);
    assert.ok(!r.saida.includes('SEGREDO_NO_CORPO'), `${nome}: corpo do erro vazou`);
    assert.ok(!fs.existsSync(saidaDe(raiz)), `${nome}: gravou`);
  }
});

test('API fora do ar: a mensagem diz a causa (codigo de rede), nao so "fetch failed"', async () => {
  const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
  const srv = await servidor(() => ({ body: [] }));
  await srv.fechar(); // porta que acabou de fechar: conexao recusada
  const r = await cli(raiz, [], { SUPABASE_ACCESS_TOKEN: TOKEN, SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', SUPABASE_API_URL: srv.url });
  assert.equal(r.status, 2, r.saida);
  assert.match(r.stderr, /^ERRO: fetch failed \(ECONNREFUSED\)\n$/);
  assert.ok(!r.saida.includes(TOKEN));
});

test('API: token sem ref do projeto -> exit 2 com a instrucao', async () => {
  const raiz = repoFalso(arquivosRepo(), { scripts: [SCRIPT, SQL] });
  const r = await cli(raiz, [], { SUPABASE_ACCESS_TOKEN: TOKEN, SUPABASE_API_URL: 'http://127.0.0.1:9' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /sem ref do projeto/);
});

// ---------------- banco.sql num Postgres efemero (opt-in) ----------------
const sql = (banco, { somenteLeitura = false } = {}) => {
  const texto = fs.readFileSync(path.join(REPO, SQL), 'utf8');
  return rodarPsql(banco, somenteLeitura ? `BEGIN TRANSACTION READ ONLY;\n${texto}\nCOMMIT;\n` : texto);
};
const SEM_PG = pg.skip ?? false;

test('banco.sql (PG local): 1 linha, 1 JSON, em transacao somente-leitura, e o gerar-banco aceita', { skip: SEM_PG }, async () => {
  const r = sql('inv_ok', { somenteLeitura: true });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim().split('\n').length, 1);
  const dado = m.extrairInventario(r.stdout);
  assert.equal(dado.resumo.tabelas_public, 7);
  assert.equal(dado.resumo.ledger_registros, m.versoesDoRepo(REPO).length, 'o ledger do banco de teste espelha as migrations do repo');
  const t = Object.fromEntries(dado.tabelas.map((x) => [x.nome, x]));
  assert.deepEqual(dado.tabelas.map((x) => x.nome), [...dado.tabelas.map((x) => x.nome)].sort());
  assert.deepEqual({ ...t.pedidos, bytes: 0 }, { nome: 'pedidos', rls: true, rls_forcado: false, policies: 2, triggers: 1, linhas: 7, linhas_exatas: true, bytes: 0, citada_no_banco: true });
  assert.equal(t.cofre.rls_forcado, true);
  assert.equal(t.citada_so_no_banco.citada_no_banco, true);
  assert.equal(t['Tabela Estranha'].linhas, 0);
  assert.ok(!m.PARECE_CREDENCIAL.test(r.stdout), 'o comando do cron (com Bearer) nao pode sair');
  assert.deepEqual(dado.cron.jobs.find((j) => j.nome === 'job-ok').chama, ['net.http_post', 'public.fn_x']);
  // ponta a ponta: resposta do SQL -> CLI, com as migrations reais do repo
  const raiz = repoFalso({ 'src/a.ts': "supabase.from('pedidos');\n", 'supabase/functions/e/index.ts': '' }, { scripts: [SCRIPT, SQL] });
  fs.symlinkSync(path.join(REPO, 'supabase/migrations'), path.join(raiz, 'supabase/migrations'));
  fs.writeFileSync(path.join(raiz, 'resp.json'), r.stdout);
  const c = await cli(raiz, ['--entrada', path.join(raiz, 'resp.json')]);
  assert.equal(c.status, 0, c.saida);
  const inv = JSON.parse(fs.readFileSync(saidaDe(raiz), 'utf8'));
  assert.deepEqual(inv.alertas.map((a) => a.tipo), ['tabela_sem_rls', 'rls_sem_policy', 'cron_falhando', 'cron_sem_execucao', 'cron_parado']);
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'cron_sem_execucao').detalhe, ['job-falhando', 'job-mudo']);
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'cron_falhando').detalhe, ['job-falhando (50% em 7d)']);
  assert.ok(inv.tabelas_orfas.lista.includes('sem_rls') && !inv.tabelas_orfas.lista.includes('pedidos'));
});

test('banco.sql (PG local): banco SEM ledger nao aborta o SELECT; o gerar-banco recusa dizendo a causa', { skip: SEM_PG }, async () => {
  const r = sql('inv_sem_ledger', { somenteLeitura: true });
  assert.equal(r.status, 0, r.stderr);
  const dado = JSON.parse(r.stdout);
  assert.equal(dado.resumo.ledger_registros, null);
  assert.equal(dado.resumo.ledger_versao_max, null);
  assert.throws(() => m.conferirOrigem(m.extrairInventario(r.stdout), null, m.versoesDoRepo(REPO)), /nao tem .*supabase_migrations\.schema_migrations/);
});

test('banco.sql (PG local): ledger vazio -> 0 registros e versao null', { skip: SEM_PG }, () => {
  const r = sql('inv_ledger_vazio');
  assert.equal(r.status, 0, r.stderr);
  const dado = JSON.parse(r.stdout);
  assert.equal(dado.resumo.ledger_registros, 0);
  assert.equal(dado.resumo.ledger_versao_max, null);
});

test('banco.sql (PG local): tabela com caractere de regex no nome nao derruba o inventario', { skip: SEM_PG }, () => {
  const r = sql('inv_regex');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).tabelas.some((t) => t.nome === 'a(b'));
});

test('banco.sql: so SELECT (nenhuma palavra de escrita fora de comentario)', () => {
  const semComentario = fs.readFileSync(path.join(REPO, SQL), 'utf8').replace(/--.*$/gm, '');
  assert.ok(!/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do)\b/i.test(semComentario));
});
