import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBlocking, conditionOf, jobOf, onlyStep, permission, shellCode, stepsOf } from './workflow-test-support.mjs';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  agregar,
  coletarJobs,
  coletarRuns,
  corpoDoKpi,
  duracaoMinutos,
  maisLentos,
  paginaTemMais,
  publicarIssue,
  runsNaJanela,
  tabela,
  tabelaLentos,
} from './actions-kpi.mjs';

const AGORA = Date.parse('2026-10-03T12:00:00Z');
const run = (nome, minutos, conclusao, diasAtras = 0) => ({
  name: nome,
  conclusion: conclusao,
  run_started_at: new Date(AGORA - diasAtras * 86400000).toISOString(),
  updated_at: new Date(AGORA - diasAtras * 86400000 + minutos * 60000).toISOString(),
});

// Le' o `page` de verdade da URL: `caminho.includes('page=1')` casaria com
// `per_page=100` e faria o fake devolver a mesma pagina para sempre.
const paginaDe = (caminho) => Number(new URL(caminho, 'http://x').searchParams.get('page'));

test('E79: agregar conta runs, cancelados, falhas e minutos por workflow', () => {
  const linhas = agregar(
    [
      run('CI', 10, 'success'),
      run('CI', 20, 'cancelled'),
      run('CI', 5, 'failure'),
      run('CodeQL', 3, 'success'),
    ],
    { agora: AGORA },
  );
  const ci = linhas.find((l) => l.workflow === 'CI');
  assert.equal(ci.runs, 3);
  assert.equal(ci.cancelados, 1);
  assert.equal(ci.falhas, 1);
  assert.equal(ci.minutos, 35);
  assert.equal(ci.taxaCancelamento, 33.3);
  assert.equal(ci.taxaFalha, 33.3);
  assert.equal(linhas[0].workflow, 'CI', 'o mais frequente vem primeiro');
});

test('E79: a janela corta run velho — o KPI e dos ultimos N dias, nao de sempre', () => {
  const linhas = agregar([run('CI', 10, 'success', 1), run('CI', 99, 'success', 30)], { agora: AGORA, janelaDias: 7 });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].runs, 1, 'run de 30 dias atras nao pode entrar na janela de 7');
  assert.equal(linhas[0].minutos, 10);
});

test('E79: duracao vem dos carimbos e nunca e negativa', () => {
  assert.equal(duracaoMinutos(run('CI', 7, 'success')), 7);
  assert.equal(duracaoMinutos({}), 0, 'sem carimbo, zero -- nao NaN');
  assert.equal(
    duracaoMinutos({ run_started_at: '2026-10-03T12:00:00Z', updated_at: '2026-10-03T11:00:00Z' }),
    0,
    'fim antes do inicio nao vira minutos negativos',
  );
  assert.equal(duracaoMinutos({ run_started_at: 'nao-e-data', updated_at: 'tambem-nao' }), 0);
});

test('E79: os 5 jobs mais lentos saem ordenados e limitados', () => {
  const jobs = [
    { name: 'a', workflow_name: 'CI', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:01:00Z' },
    { name: 'b', workflow_name: 'CI', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:30:00Z' },
    { name: 'c', workflow_name: 'CI', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:10:00Z' },
  ];
  const lentos = maisLentos(jobs, { limite: 2 });
  assert.equal(lentos.length, 2);
  assert.deepEqual(lentos.map((l) => l.job), ['b', 'c']);
});

test('E79: a tabela traz as colunas pedidas e o total', () => {
  const md = tabela(agregar([run('CI', 10, 'success'), run('CI', 20, 'cancelled')], { agora: AGORA }));
  assert.match(md, /\| workflow \| runs \| cancelados \| taxa cancel\. \| falhas \| taxa falha \| minutos \|/);
  assert.match(md, /Total: \*\*2\*\* runs, \*\*30\*\* minutos\./);
  assert.match(tabelaLentos([]), /nenhum job/);
});

test('E79: o workflow semanal chama o KPI com as permissoes que ele precisa', () => {
  const y = readFileSync(new URL('../../.github/workflows/branch-hygiene-audit.yml', import.meta.url), 'utf8');
  const job = jobOf(y, 'audit');
  const step = onlyStep(stepsOf(job), (s) => /^\s*node scripts\/ci\/actions-kpi\.mjs\s*$/m.test(shellCode(s)), 'KPI');
  assert.equal(conditionOf(job, 4), 'success()');
  assert.equal(conditionOf(step), 'success()');
  assertBlocking(job, 4);
  assertBlocking(step);
  // O zizmor reprova `write` no nivel do WORKFLOW (excessive-permissions, severidade
  // alta): o escopo vale para todos os jobs. As permissoes extras ficam no job, onde
  // o escopo e exatamente o que ele usa -- foi o que o CI pegou no primeiro PR.
  const topo = y.slice(0, y.indexOf('jobs:'));
  assert.notEqual(permission(topo, 'issues', 0), 'write', 'escrita fica no job');
  assert.equal(permission(topo, 'actions', 0), undefined);
  assert.equal(permission(job, 'actions'), 'read');
  assert.equal(permission(job, 'issues'), 'write');
});

// ---------------------------------------------------------------- #365
// Defeito: o CLI lia UMA pagina de runs (`per_page=100`) e publicava o ranking dos
// "5 jobs mais lentos" a partir de `maisLentos([])` -- nunca consultava os jobs.

test('#365: paginaTemMais continua enquanto a pagina esta cheia e dentro da janela', () => {
  const cheia = Array.from({ length: 100 }, () => run('CI', 1, 'success'));
  assert.equal(paginaTemMais(cheia, { agora: AGORA, janelaDias: 7, porPagina: 100 }), true);

  const ultima = Array.from({ length: 37 }, () => run('CI', 1, 'success'));
  assert.equal(paginaTemMais(ultima, { agora: AGORA, janelaDias: 7, porPagina: 100 }), false, 'pagina incompleta e a ultima');

  const velha = Array.from({ length: 100 }, () => run('CI', 1, 'success', 30));
  assert.equal(paginaTemMais(velha, { agora: AGORA, janelaDias: 7, porPagina: 100 }), false, 'ja saiu da janela, nao ha o que buscar');
});

test('#365: coletarRuns busca a pagina seguinte em vez de parar em 100', async () => {
  const cheia = Array.from({ length: 100 }, () => run('CI', 1, 'success'));
  const chamadas = [];
  const pedirFake = async (caminho) => {
    chamadas.push(caminho);
    const pagina = paginaDe(caminho);
    if (pagina === 1) return { workflow_runs: cheia };
    if (pagina === 2) return { workflow_runs: [run('CI', 2, 'success')] };
    return { workflow_runs: [] };
  };
  const runs = await coletarRuns({ repo: 'o/r', token: 't', agora: AGORA, pedir: pedirFake });
  assert.equal(runs.length, 101, 'a segunda pagina nao pode ser ignorada');
  assert.equal(chamadas.length, 2, 'para na primeira pagina incompleta');
  assert.match(chamadas[0], /actions\/runs\?per_page=100&page=1$/);
});

test('#365: coletarRuns nao pagina para fora da janela', async () => {
  const velha = Array.from({ length: 100 }, () => run('CI', 1, 'success', 30));
  const chamadas = [];
  const pedirFake = async (caminho) => {
    chamadas.push(caminho);
    return { workflow_runs: velha };
  };
  const runs = await coletarRuns({ repo: 'o/r', token: 't', agora: AGORA, janelaDias: 7, pedir: pedirFake });
  assert.equal(chamadas.length, 1, 'pagina ja fora da janela: para na primeira');
  assert.equal(runs.length, 100);
});

test('#365: coletarJobs consulta os jobs de cada run e herda o nome do workflow', async () => {
  const chamadas = [];
  const pedirFake = async (caminho) => {
    chamadas.push(caminho);
    if (caminho.includes('/runs/1/jobs')) {
      return {
        jobs: [
          { name: 'lento', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:40:00Z' },
          { name: 'rapido', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:01:00Z' },
        ],
      };
    }
    return { jobs: [] };
  };
  const jobs = await coletarJobs([{ id: 1, name: 'CI' }], { repo: 'o/r', token: 't', pedir: pedirFake });
  assert.equal(jobs.length, 2);
  assert.match(chamadas[0], /\/repos\/o\/r\/actions\/runs\/1\/jobs\?per_page=100&page=1$/);
  assert.equal(jobs[0].workflow_name, 'CI', 'o run da o nome do workflow quando o job nao traz');
  assert.equal(maisLentos(jobs, { limite: 5 })[0].job, 'lento');
});

test('#365: coletarJobs pagina um run com mais de 100 jobs', async () => {
  const cheia = Array.from({ length: 100 }, (_, i) => ({
    name: `job-${i}`,
    started_at: '2026-10-03T10:00:00Z',
    completed_at: '2026-10-03T10:01:00Z',
  }));
  const paginaDeJobs = (caminho) => Number(new URL(caminho, 'http://x').searchParams.get('page'));
  const pedirFake = async (caminho) => {
    const pagina = paginaDeJobs(caminho);
    if (pagina === 1) return { jobs: cheia };
    if (pagina === 2) return { jobs: [cheia[0]] };
    return { jobs: [] };
  };
  const jobs = await coletarJobs([{ id: 7, name: 'CI' }], { repo: 'o/r', token: 't', pedir: pedirFake });
  assert.equal(jobs.length, 101, 'a segunda pagina de jobs nao pode ser ignorada');
});

test('#365: o corpo do KPI publica o ranking real dos jobs, nao um ranking vazio', () => {
  const runs = [run('CI', 5, 'success')];
  const jobs = [
    { name: 'build', workflow_name: 'CI', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:20:00Z' },
    { name: 'test', workflow_name: 'CI', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:04:00Z' },
  ];
  const md = corpoDoKpi(runs, jobs, { agora: AGORA, janelaDias: 7 });
  assert.match(md, /build/, 'o job mais lento tem de aparecer — antes o ranking saia vazio');
  assert.doesNotMatch(md, /nenhum job/, 'com jobs reais o placeholder nao pode aparecer');
  assert.match(md, /\| workflow \| runs \|/);
});

// ---------------------------------------------------------------- auditoria 09/11/2026
// Cada teste abaixo reproduz um defeito medido contra fixtures (API falsa em 127.0.0.1 ou
// `pedir` injetado) antes da correcao.

test('run sem run_started_at conta pela created_at em vez de sumir do KPI', () => {
  const naFila = { name: 'CI', conclusion: null, created_at: new Date(AGORA - 60000).toISOString(), updated_at: new Date(AGORA).toISOString() };
  const nulo = { ...naFila, run_started_at: null };
  assert.equal(runsNaJanela([naFila, nulo], { agora: AGORA }).length, 2, 'antes: 0 -- os dois sumiam');
  const [ci] = agregar([naFila, nulo, run('CI', 4, 'success')], { agora: AGORA });
  assert.equal(ci.runs, 3);
  assert.equal(ci.minutos, 4, 'run que nao comecou soma 0 minutos, mas conta como run');
  const velho = { name: 'CI', created_at: new Date(AGORA - 30 * 86400000).toISOString() };
  assert.equal(runsNaJanela([velho], { agora: AGORA }).length, 0, 'created_at fora da janela continua fora');
  const cheia = Array.from({ length: 100 }, () => naFila);
  assert.equal(paginaTemMais(cheia, { agora: AGORA }), true, 'pagina cheia so com created_at nao pode encerrar a paginacao');
});

test('coletarRuns avisa quando o teto de paginas corta runs da janela, e so nesse caso', async (t) => {
  const avisos = [];
  t.mock.method(console, 'error', (m) => avisos.push(String(m)));
  const cheia = (dias) => Array.from({ length: 2 }, () => run('CI', 1, 'success', dias));

  let chamadas = 0;
  const runs = await coletarRuns({
    repo: 'o/r', token: 't', agora: AGORA, porPagina: 2, maxPaginas: 3,
    pedir: async () => { chamadas += 1; return { workflow_runs: cheia(0) }; },
  });
  assert.equal(chamadas, 3);
  assert.equal(runs.length, 6);
  assert.equal(avisos.length, 1, 'antes: nenhum aviso -- o corte era silencioso');
  assert.match(avisos[0], /::warning::paginacao de runs parou no teto de 3 paginas/);

  avisos.length = 0;
  chamadas = 0;
  await coletarRuns({
    repo: 'o/r', token: 't', agora: AGORA, porPagina: 2, maxPaginas: 2,
    pedir: async () => { chamadas += 1; return { workflow_runs: cheia(chamadas === 2 ? 30 : 0) }; },
  });
  assert.deepEqual(avisos, [], 'ultima pagina ja fora da janela: nada foi cortado, nao ha o que avisar');
});

test('coletarJobs tolera o 404 de um run apagado, mas nao engole outros erros', async (t) => {
  const avisos = [];
  t.mock.method(console, 'error', (m) => avisos.push(String(m)));
  const erroHttp = (status) => Object.assign(new Error(`GET x -> ${status}`), { status });
  const job = { name: 'build', started_at: '2026-10-03T10:00:00Z', completed_at: '2026-10-03T10:05:00Z' };
  const pedir404 = async (caminho) => {
    if (caminho.includes('/runs/2/jobs')) throw erroHttp(404);
    return { jobs: [job] };
  };
  const jobs = await coletarJobs([{ id: 1, name: 'CI' }, { id: 2, name: 'CI' }, { id: 3, name: 'CI' }], { repo: 'o/r', token: 't', pedir: pedir404 });
  assert.equal(jobs.length, 2, 'os jobs dos outros runs continuam no ranking');
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /::warning::run 2 sumiu/);

  await assert.rejects(
    coletarJobs([{ id: 1, name: 'CI' }], { repo: 'o/r', token: 't', pedir: async () => { throw erroHttp(403); } }),
    /-> 403/,
    '403 (permissao/rate limit) em todo run viraria "nenhum job registrado" se fosse engolido',
  );
});

test('publicarIssue acha a [kpi-actions] na pagina 2 das abertas em vez de criar outra', async () => {
  const outras = Array.from({ length: 100 }, (_, i) => ({ number: 2000 - i, title: `PR ${i}`, pull_request: {} }));
  const pedidos = [];
  const pedirFake = async (caminho, _token, opcoes = {}) => {
    pedidos.push(`${opcoes.metodo ?? 'GET'} ${caminho}`);
    if (opcoes.metodo === 'PATCH') return { number: 42 };
    if (opcoes.metodo === 'POST') return { number: 999 };
    return paginaDe(caminho) === 1 ? outras : [{ number: 42, title: '[kpi-actions] Semana de 2026-10-01' }];
  };
  const r = await publicarIssue({ repo: 'o/r', token: 't', marca: '[kpi-actions] Semana de 2026-11-09', corpo: 'x', pedir: pedirFake });
  assert.deepEqual(r, { acao: 'atualizada', numero: 42 }, 'antes: { acao: "criada" } -- uma issue nova por semana');
  assert.deepEqual(pedidos, [
    'GET /repos/o/r/issues?state=open&per_page=100&page=1',
    'GET /repos/o/r/issues?state=open&per_page=100&page=2',
    'PATCH /repos/o/r/issues/42',
  ]);
});

test('publicarIssue cria quando nao ha issue aberta, e PR com o mesmo titulo nao conta', async () => {
  const pedidos = [];
  const pedirFake = async (caminho, _token, opcoes = {}) => {
    pedidos.push(`${opcoes.metodo ?? 'GET'} ${caminho}`);
    if (opcoes.metodo === 'POST') return { number: 7 };
    return [{ number: 5, title: '[kpi-actions] PR com o titulo', pull_request: {} }];
  };
  const r = await publicarIssue({ repo: 'o/r', token: 't', marca: 'm', corpo: 'x', pedir: pedirFake });
  assert.deepEqual(r, { acao: 'criada', numero: 7 });
  assert.deepEqual(pedidos, ['GET /repos/o/r/issues?state=open&per_page=100&page=1', 'POST /repos/o/r/issues']);
});

// --- CLI de verdade contra uma API falsa local (nenhuma chamada sai de 127.0.0.1)
const SCRIPT = fileURLToPath(new URL('./actions-kpi.mjs', import.meta.url));

function apiFalsa(responder) {
  const pedidos = [];
  const servidor = http.createServer((req, res) => {
    pedidos.push(`${req.method} ${req.url}`);
    const { status = 200, tipo = 'application/json', corpo } = responder(req.method, new URL(req.url, 'http://x'));
    res.writeHead(status, { 'content-type': tipo });
    res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
  });
  return new Promise((ok) => {
    servidor.listen(0, '127.0.0.1', () => ok({ servidor, pedidos, url: `http://127.0.0.1:${servidor.address().port}` }));
  });
}

function cli(env, script = SCRIPT) {
  return new Promise((ok) => {
    const filho = spawn(process.execPath, [script], { env: { PATH: process.env.PATH, ...env } });
    let stdout = '';
    let stderr = '';
    filho.stdout.on('data', (d) => { stdout += d; });
    filho.stderr.on('data', (d) => { stderr += d; });
    filho.on('close', (status) => ok({ status, stdout, stderr }));
  });
}

test('CLI: zero runs publica a tabela vazia e cria a issue; falha de API diz a causa', async () => {
  const vazia = await apiFalsa((metodo, u) => {
    if (metodo === 'POST') return { status: 201, corpo: { number: 11 } };
    return { corpo: u.pathname.endsWith('/issues') ? [] : { workflow_runs: [] } };
  });
  try {
    const r = await cli({ GITHUB_API_URL: vazia.url, GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 't', JANELA_DIAS: '7' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Total: \*\*0\*\* runs, \*\*0\*\* minutos\./);
    assert.match(r.stdout, /_nenhum job registrado na janela_/);
    assert.match(r.stdout, /issue criada: #11/);
    assert.equal(vazia.pedidos.at(-1), 'POST /repos/o/r/issues');
  } finally {
    vazia.servidor.close();
  }

  const limite = await apiFalsa(() => ({ status: 403, corpo: { message: 'API rate limit exceeded' } }));
  try {
    const r = await cli({ GITHUB_API_URL: limite.url, GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 't' });
    assert.equal(r.status, 1);
    assert.equal(r.stdout, '', 'sem dado nao publica nada');
    assert.match(r.stderr, /::error::GET \/repos\/o\/r\/actions\/runs\?per_page=100&page=1 -> 403 \(API rate limit exceeded\)/, 'antes: so "-> 403"');
  } finally {
    limite.servidor.close();
  }

  const html = await apiFalsa(() => ({ tipo: 'text/html', corpo: '<html>proxy</html>' }));
  try {
    const r = await cli({ GITHUB_API_URL: html.url, GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 't' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /::error::GET \/repos\/o\/r\/actions\/runs[^\n]* -> 200 com corpo que nao e JSON/);
  } finally {
    html.servidor.close();
  }

  // Porta de um servidor ja fechado: ninguem escuta, o fetch nao recebe resposta.
  const r = await cli({ GITHUB_API_URL: html.url, GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 't' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /::error::GET \/repos\/o\/r\/actions\/runs[^\n]* -> sem resposta \(/, 'antes: so "fetch failed"');
});

test('CLI: executa mesmo com espaco no caminho e chamado por symlink (antes saia 0 sem fazer nada)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kpi com espaco '));
  try {
    mkdirSync(join(dir, 'real'));
    cpSync(SCRIPT, join(dir, 'real', 'actions-kpi.mjs'));
    symlinkSync(join(dir, 'real'), join(dir, 'atalho'));
    for (const caminho of [join(dir, 'real', 'actions-kpi.mjs'), join(dir, 'atalho', 'actions-kpi.mjs')]) {
      const r = await cli({}, caminho);
      assert.equal(r.status, 2, `${caminho}: sem GITHUB_REPOSITORY/GH_TOKEN tem de sair 2, nao 0`);
      assert.match(r.stderr, /::error::GITHUB_REPOSITORY e GH_TOKEN sao obrigatorios/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
