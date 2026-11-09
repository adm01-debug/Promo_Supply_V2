// Suíte dos scripts operacionais da raiz: scripts/{realtime-audit,stress-test,validate-bridge,
// rls-audit,db-explain-analyze}.ts, scripts/squash-migrations.sh e deploy_edge_functions_promo_supply.sh.
//
// Tudo offline: servidor HTTP em 127.0.0.1, `psql`/`supabase`/`curl` de mentira no PATH e repositório
// git descartável em diretório temporário. Nenhum teste fala com Supabase.
//
// Os `.ts` são importados/executados direto pelo node (type stripping, nativo no node 22.18+); por
// isso eles só usam sintaxe TS apagável e nenhum pacote npm.

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import * as explain from '../db-explain-analyze.ts';
import * as realtime from '../realtime-audit.ts';
import * as rls from '../rls-audit.ts';
import * as stress from '../stress-test.ts';
import * as bridge from '../validate-bridge.ts';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = (nome) => path.join(RAIZ, 'scripts', nome);
const DEPLOY = path.join(RAIZ, 'deploy_edge_functions_promo_supply.sh');

// Ambiente limpo: nada do runner (secrets, .env carregado por alguém) pode vazar para os cenários.
const ENV_BASE = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^(SUPABASE_|VITE_|BRIDGE_|RLS_AUDIT_|EXPLAIN_|PG)/.test(k)),
);

function tmp(prefixo) {
  return mkdtempSync(path.join(os.tmpdir(), `ops-${prefixo}-`));
}

function rodar(cmd, args, { env = {}, cwd } = {}) {
  return new Promise((resolve) => {
    const filho = spawn(cmd, args, { cwd, env: { ...ENV_BASE, ...env } });
    let stdout = '';
    let stderr = '';
    filho.stdout.on('data', (d) => { stdout += d; });
    filho.stderr.on('data', (d) => { stderr += d; });
    filho.on('close', (status) => resolve({ status, stdout, stderr, tudo: stdout + stderr }));
    filho.stdin.end();
  });
}

const rodarTs = (nome, args = [], opcoes = {}) => rodar(process.execPath, ['--experimental-strip-types', SCRIPT(nome), ...args], opcoes);

async function comServidor(handler, usar) {
  const servidor = http.createServer(handler);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  try {
    return await usar(`http://127.0.0.1:${servidor.address().port}`);
  } finally {
    servidor.closeAllConnections?.();
    await new Promise((r) => servidor.close(r));
  }
}

function executavel(arquivo, conteudo) {
  writeFileSync(arquivo, conteudo);
  chmodSync(arquivo, 0o755);
}

// ───────────────────────────── realtime-audit ─────────────────────────────

test('realtime: cadeia quebrada em linhas conta como canal (antes só `supabase.channel(` na mesma linha)', () => {
  const fonte = "const c = supabase\n  .channel('pedidos')\n  .on('x', f)\n  .subscribe();\n";
  assert.deepEqual(realtime.contarCanais(fonte), { opens: 1, closes: 0 });
  assert.equal(realtime.auditarArquivo('a.ts', fonte).count, 1);
  assert.equal(realtime.auditarArquivo('a.ts', `${fonte}return () => { supabase.removeChannel(c); };`), null);
});

test('realtime: comentário e string não abrem nem fecham canal', () => {
  assert.equal(realtime.contarCanais("// supabase.channel('x')\n/* a.channel('y') */\nconst s = \"z.channel('w')\";").opens, 0);
  // cleanup só em comentário/string NÃO fecha: o canal continua órfão
  const orfao = "const c = sb.channel('a');\n// sb.removeChannel(c)\nconst t = 'c.unsubscribe()';";
  assert.deepEqual(realtime.contarCanais(orfao), { opens: 1, closes: 0 });
});

test('realtime: `supabase.removeChannel(` conta uma vez; `removeAllChannels(` fecha tudo', () => {
  const dois = "const a = s.channel('a'); const b = s.channel('b');\n";
  assert.equal(realtime.contarCanais(`${dois}supabase.removeChannel(a);`).closes, 1);
  assert.equal(realtime.auditarArquivo('f.ts', `${dois}supabase.removeChannel(a);`).count, 1);
  assert.equal(realtime.auditarArquivo('f.ts', `${dois}supabase.removeAllChannels();`), null);
  assert.equal(realtime.auditarArquivo('f.ts', `${dois}a.unsubscribe(); removeChannel(b);`), null);
});

test('realtime: regex com aspas, template com ${} e apóstrofo em JSX não engolem o código seguinte', () => {
  const fonte = [
    'const esc = (s) => `"${s.replace(/"/g, \'""\').replace(/\\r?\\n/g, " ")}"`;',
    "const url = 'https://x/y'; const d = a / b / c;",
    "<p>Don't</p>",
    "const canal = supabase",
    "  .channel(`fila_${id}`)",
  ].join('\n');
  assert.equal(realtime.contarCanais(fonte).opens, 1);
  const codigo = realtime.somenteCodigo(fonte);
  assert.equal(codigo.length, fonte.length, 'somenteCodigo preserva o tamanho (e as linhas)');
  assert.equal(codigo.split('\n').length, fonte.split('\n').length);
});

test('realtime CLI: órfão sai 1, limpo sai 0, pasta ausente/vazia e flag desconhecida saem 2', async () => {
  const dir = tmp('rt');
  try {
    mkdirSync(path.join(dir, 'ok'));
    mkdirSync(path.join(dir, 'ruim', 'sub dir'), { recursive: true });
    mkdirSync(path.join(dir, 'vazio'));
    writeFileSync(path.join(dir, 'ok', 'a.tsx'), "const c = s\n .channel('a');\nuseEffect(() => () => { s.removeChannel(c); });\n");
    writeFileSync(path.join(dir, 'ruim', 'sub dir', 'b.ts'), "const c = s\n .channel('a');\n");

    const limpo = await rodarTs('realtime-audit.ts', ['--dir', path.join(dir, 'ok')]);
    assert.equal(limpo.status, 0, limpo.tudo);
    assert.match(limpo.stdout, /1 canal\(is\) em 1 arquivo/);

    const ruim = await rodarTs('realtime-audit.ts', ['--dir', path.join(dir, 'ok'), '--dir', path.join(dir, 'ruim'), '--json']);
    assert.equal(ruim.status, 1);
    const json = JSON.parse(ruim.stdout);
    assert.equal(json.total, 1);
    assert.match(json.orphaned[0].file, /sub dir[\\/]b\.ts$/);

    assert.equal((await rodarTs('realtime-audit.ts', ['--dir', path.join(dir, 'vazio')])).status, 2, 'zero arquivos não é OK');
    assert.equal((await rodarTs('realtime-audit.ts', ['--dir', path.join(dir, 'nao-existe')])).status, 2);
    assert.equal((await rodarTs('realtime-audit.ts', ['--nada'])).status, 2);
    assert.equal((await rodarTs('realtime-audit.ts', ['--dir'])).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('realtime (OPS-02): o src/ real não tem canal Realtime sem cleanup', async () => {
  const r = await rodarTs('realtime-audit.ts', ['--json'], { cwd: RAIZ });
  assert.equal(r.status, 0, `canal órfão em src/:\n${r.tudo}`);
  const json = JSON.parse(r.stdout);
  assert.ok(json.files > 100, 'leu o src/ de verdade');
  assert.ok(json.channels >= 1, 'enxergou os canais (a versão antiga via só os de `supabase.channel(` em uma linha)');
});

// ─────────────────────────────── stress-test ───────────────────────────────

test('stress: percentil nearest-rank, sem índice fora da lista e sem NaN em lista vazia', () => {
  assert.equal(stress.percentil([], 0.95), 0);
  assert.equal(stress.percentil([7], 0.99), 7);
  const cem = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(stress.percentil(cem, 0.5), 50);
  assert.equal(stress.percentil(cem, 0.95), 95);
  assert.equal(stress.percentil(cem, 0.99), 99);
  assert.equal(stress.percentil([1, 2, 3], 1), 3);
});

test('stress: 401/403 é auth (esperado como anon), 429 é rate limit, só rede e 5xx são falha', () => {
  assert.deepEqual([0, 200, 400, 401, 403, 404, 429, 500, 503].map(stress.classificar),
    ['network', 'ok', 'ok', 'auth', 'auth', 'ok', 'rate_limited', 'server_error', 'server_error']);
  const r = (status) => ({ status, latency: 10 });

  const soAuth = stress.resumir(Array.from({ length: 20 }, () => r(401)), 5);
  assert.equal(soAuth.aprovado, true);
  assert.equal(soAuth.soAuth, true, 'avisa que só o gateway de auth foi medido');

  const dezPorCento = stress.resumir([...Array.from({ length: 18 }, () => r(200)), r(500), r(0)], 5);
  assert.equal(dezPorCento.failureRate, 10);
  assert.equal(dezPorCento.aprovado, false);

  const vazio = stress.resumir([], 5);
  assert.equal(vazio.aprovado, false, 'zero respostas nunca é "sistema estável"');
  assert.equal(Number.isNaN(vazio.avgMs) || Number.isNaN(vazio.failureRate), false);
});

test('stress: argumentos inválidos são erro de uso (antes: NaN/0 viravam "SUCCESS" sem requisição)', () => {
  const ok = stress.lerArgs(['--concurrency', '80', '--requests', '10'], {});
  assert.equal(ok.concurrency, 10, 'concorrência não passa do total');
  assert.equal(ok.endpoint, 'http://localhost:54321/functions/v1/workflow-engine');
  assert.equal(stress.lerArgs([], { VITE_SUPABASE_URL: 'https://abc.supabase.co/' }).endpoint, 'https://abc.supabase.co/functions/v1/workflow-engine');
  for (const ruim of [['--concurrency', '0'], ['--concurrency', 'abc'], ['--requests', '-5'], ['--requests', '1.5'],
    ['--requests'], ['--timeout-ms', '1'], ['--max-failure-rate', '101'], ['--endpoint', 'ftp://x'], ['--endpoint', 'nada'], ['--xyz']]) {
    assert.throws(() => stress.lerArgs(ruim, {}), Error, ruim.join(' '));
  }
  assert.equal(stress.ehLoopback('http://127.0.0.1:9/x'), true);
  assert.equal(stress.ehLoopback('http://localhost:54321/x'), true);
  assert.equal(stress.ehLoopback('http://[::1]:8/x'), true);
  assert.equal(stress.ehLoopback('https://lmypcdfsrgfftzhxawao.supabase.co/functions/v1/x'), false);
  assert.equal(stress.ehLoopback('http://localhost.evil.com/x'), false);
});

test('stress CLI: endpoint real sem --confirm sai 2 sem enviar nada (o .env versionado aponta para produção)', async () => {
  const r = await rodarTs('stress-test.ts', [], { env: { VITE_SUPABASE_URL: 'https://projeto-real.invalid' } });
  assert.equal(r.status, 2, r.tudo);
  assert.match(r.stderr, /Nada foi enviado/);
  assert.doesNotMatch(r.tudo, /Starting Stress Test/);
});

test('stress CLI: 401 em tudo passa e avisa; 500 em tudo reprova; contagem de requisições é exata', async () => {
  let recebidas = 0;
  let codigo = 401;
  await comServidor((req, res) => {
    recebidas++;
    req.resume();
    res.writeHead(codigo, { 'content-type': 'application/json' }).end('{"error":"x"}');
  }, async (base) => {
    const auth = await rodarTs('stress-test.ts', ['--endpoint', `${base}/f`, '--requests', '37', '--concurrency', '5', '--json']);
    assert.equal(auth.status, 0, auth.tudo);
    assert.equal(recebidas, 37);
    const json = JSON.parse(auth.stdout);
    assert.equal(json.total, 37);
    assert.equal(json.porClasse.auth, 37);
    assert.match(auth.stderr, /só o gateway de autenticação foi medido/);

    codigo = 500;
    const erro = await rodarTs('stress-test.ts', ['--endpoint', `${base}/f`, '--requests', '12', '--concurrency', '3']);
    assert.equal(erro.status, 1);
    assert.match(erro.tudo, /Failure Rate: 100\.00% \(12\/12\)/);
  });
});

test('stress CLI: porta fechada e servidor que não responde reprovam (timeout não trava o script)', async () => {
  const fechada = await rodarTs('stress-test.ts', ['--endpoint', 'http://127.0.0.1:1/f', '--requests', '4', '--concurrency', '2']);
  assert.equal(fechada.status, 1, fechada.tudo);

  await comServidor(() => { /* nunca responde */ }, async (base) => {
    const inicio = Date.now();
    const r = await rodarTs('stress-test.ts', ['--endpoint', `${base}/f`, '--requests', '3', '--concurrency', '3', '--timeout-ms', '300']);
    assert.equal(r.status, 1, r.tudo);
    assert.match(r.tudo, /rede\/timeout×3/);
    assert.ok(Date.now() - inicio < 10_000);
  });
});

// ───────────────────────────── validate-bridge ─────────────────────────────

/** Imita o contrato real da função (supabase/functions/external-db-bridge/index.ts). */
function bridgeFalsa({ jwtValido = 'jwt-usuario', select = { status: 200, corpo: { data: [], count: null, meta: { durationMs: 3, status: 'ok' } } } } = {}) {
  const corpos = [];
  const handler = (req, res) => {
    let bruto = '';
    req.on('data', (d) => { bruto += d; });
    req.on('end', () => {
      const responder = (status, corpo) => res.writeHead(status, { 'content-type': 'application/json' }).end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
      if (req.method === 'OPTIONS') return responder(200, 'ok');
      if (req.method !== 'POST') return responder(405, { error: 'Method not allowed' });
      const auth = req.headers.authorization;
      if (!auth) return responder(401, { code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' });
      if (auth !== `Bearer ${jwtValido}`) return responder(401, { error: 'Unauthorized' });
      const corpo = JSON.parse(bruto || '{}');
      corpos.push(corpo);
      if (!['select', 'insert', 'update', 'delete', 'rpc'].includes(corpo.operation)) return responder(400, { error: `operation "${corpo.operation}" not allowed` });
      if (!['produtos_externos', 'fornecedores_externos', 'spot_pedidos_view'].includes(corpo.table)) return responder(403, { error: `table "${corpo.table}" is not in allowlist` });
      if (corpo.limit > 500) return responder(400, { error: 'limit exceeds 500' });
      return responder(select.status, select.corpo);
    });
  };
  return { handler, corpos };
}

test('bridge: contrato é lido do código real da função (tabela da allowlist e teto de limit)', () => {
  const contrato = bridge.lerContrato();
  const fonte = readFileSync(path.join(RAIZ, 'supabase/functions/_shared/external-bridge-allowlist.ts'), 'utf8');
  assert.match(fonte, new RegExp(`"${contrato.tabela}"`));
  assert.equal(contrato.limiteMaximo, Number(fonte.match(/MAX_SELECT_LIMIT = (\d+)/)[1]));
  assert.deepEqual(bridge.lerContrato('/nao/existe.ts'), { tabela: 'produtos_externos', limiteMaximo: 500 });
});

test('bridge CLI: sem JWT valida a parte pública e marca o resto NÃO VERIFICADO (strict reprova)', async () => {
  const falsa = bridgeFalsa();
  await comServidor(falsa.handler, async (base) => {
    const env = { SUPABASE_URL: base, SUPABASE_ANON_KEY: 'anon-publica' };
    const r = await rodarTs('validate-bridge.ts', ['--json'], { env });
    assert.equal(r.status, 0, r.tudo);
    const json = JSON.parse(r.stdout);
    assert.deepEqual([json.ok, json.falhou, json.nao_verificado], [4, 0, 4]);
    assert.equal((await rodarTs('validate-bridge.ts', ['--strict'], { env })).status, 1);
    // fallback para as variáveis VITE_ (é o que `npm run test:bridge` tem, via .env)
    const vite = await rodarTs('validate-bridge.ts', [], { env: { VITE_SUPABASE_URL: base, VITE_SUPABASE_PUBLISHABLE_KEY: 'anon-publica' } });
    assert.equal(vite.status, 0, vite.tudo);
  });
});

test('bridge CLI: com JWT valida os 8 pontos e NUNCA envia operação de escrita', async () => {
  const falsa = bridgeFalsa();
  await comServidor(falsa.handler, async (base) => {
    const r = await rodarTs('validate-bridge.ts', ['--strict', '--json'], { env: { SUPABASE_URL: base, SUPABASE_ANON_KEY: 'anon', BRIDGE_USER_JWT: 'jwt-usuario' } });
    assert.equal(r.status, 0, r.tudo);
    assert.equal(JSON.parse(r.stdout).ok, 8);
    assert.ok(falsa.corpos.length >= 4);
    for (const corpo of falsa.corpos) assert.ok(!['insert', 'update', 'delete', 'rpc'].includes(corpo.operation), `enviou ${corpo.operation}`);
  });
});

test('bridge: "External database not configured" (500) é resposta válida; forma errada e 401 reprovam', async () => {
  const cenario = async (opcoes, jwt = 'jwt-usuario') => {
    const falsa = bridgeFalsa(opcoes);
    return comServidor(falsa.handler, (base) => bridge.validar(bridge.criarPedir(base, 'anon', 5000), { anonKey: 'anon', userJwt: jwt, tabela: 'produtos_externos', limiteMaximo: 500 }));
  };
  const estados = (checks) => checks.map((c) => c.estado);

  const semBanco = await cenario({ select: { status: 500, corpo: { error: 'External database not configured' } } });
  assert.ok(estados(semBanco).every((e) => e === 'ok'), JSON.stringify(semBanco));

  const semMeta = await cenario({ select: { status: 200, corpo: { data: [] } } });
  assert.equal(semMeta.at(-1).estado, 'falhou');

  const erro500 = await cenario({ select: { status: 500, corpo: { error: 'boom' } } });
  assert.equal(erro500.at(-1).estado, 'falhou');

  const limitado = await cenario({ select: { status: 429, corpo: { error: 'rate' } } });
  assert.equal(limitado.at(-1).estado, 'nao_verificado');

  // Regressão: a versão antiga dava "✅ Erro tratado corretamente" para um 401.
  const tokenRuim = await cenario({}, 'jwt-expirado');
  assert.deepEqual(estados(tokenRuim).slice(4), ['falhou', 'falhou', 'falhou', 'falhou']);
});

test('bridge CLI: função fora do contrato sai 1; sem configuração sai 2; servidor fora do ar sai 1', async () => {
  await comServidor((req, res) => { req.resume(); res.writeHead(200).end('{}'); }, async (base) => {
    const r = await rodarTs('validate-bridge.ts', [], { env: { SUPABASE_URL: base, SUPABASE_ANON_KEY: 'anon' } });
    assert.equal(r.status, 1, r.tudo);
    assert.match(r.tudo, /❌ GET é recusado com 405/);
  });
  assert.equal((await rodarTs('validate-bridge.ts', [])).status, 2);
  assert.equal((await rodarTs('validate-bridge.ts', [], { env: { SUPABASE_URL: 'sem-esquema', SUPABASE_ANON_KEY: 'a' } })).status, 2);
  assert.equal((await rodarTs('validate-bridge.ts', ['--timeout-ms', 'x'], { env: { SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_ANON_KEY: 'a' } })).status, 2);
  const fora = await rodarTs('validate-bridge.ts', [], { env: { SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_ANON_KEY: 'a' } });
  assert.equal(fora.status, 1, fora.tudo);
});

// ──────────────────────────────── rls-audit ────────────────────────────────

const politica = (extra) => ({ tablename: 't', policyname: 'p', permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: null, with_check: null, ...extra });
const tabela = (relname, extra = {}) => ({ relname, relrowsecurity: true, relforcerowsecurity: false, policies: 1, ...extra });

test('rls: reconhece expressão que não filtra nada (true, parênteses, caixa, 1=1) e só ela', () => {
  for (const sim of ['true', '(true)', '((TRUE))', ' ( true ) ', '(1 = 1)']) assert.equal(rls.sempreVerdadeira(sim), true, sim);
  for (const nao of [null, undefined, '', 'false', '(tenant_id = auth.uid())', '(true) AND (x)', "(status = 'true')", '(a) = (b)', 'is_true(x)']) {
    assert.equal(rls.sempreVerdadeira(nao), false, String(nao));
  }
});

test('rls: cada comando olha a expressão que vale para ele; RESTRICTIVE nunca é achado', () => {
  assert.equal(rls.politicaAberta(politica({ cmd: 'SELECT', qual: 'true' })), true);
  assert.equal(rls.politicaAberta(politica({ cmd: 'DELETE', qual: '(true)' })), true);
  assert.equal(rls.politicaAberta(politica({ cmd: 'INSERT', with_check: 'true' })), true);
  assert.equal(rls.politicaAberta(politica({ cmd: 'UPDATE', qual: '(a = b)', with_check: 'true' })), true);
  assert.equal(rls.politicaAberta(politica({ cmd: 'ALL', qual: 'true', with_check: null })), true);
  assert.equal(rls.politicaAberta(politica({ cmd: 'SELECT', qual: '(a = b)', with_check: 'true' })), false, 'WITH CHECK não vale para SELECT');
  assert.equal(rls.politicaAberta(politica({ cmd: 'SELECT', qual: '(tenant_id = x())' })), false);
  assert.equal(rls.politicaAberta(politica({ permissive: 'RESTRICTIVE', qual: 'true' })), false);
});

test('rls: isenção é pelo PAPEL, não pelo nome (antes: bastava a política se chamar service_role_*)', () => {
  const snapshot = {
    tables: [tabela('a'), tabela('b'), tabela('c'), tabela('aberta', { relrowsecurity: false, policies: 0 }), tabela('trancada', { policies: 0 })],
    policies: [
      politica({ tablename: 'a', policyname: 'service_role_full_access', roles: ['public'], cmd: 'ALL', qual: 'true', with_check: 'true' }),
      politica({ tablename: 'b', policyname: 'outbox_all', roles: ['service_role'], cmd: 'ALL', qual: 'true', with_check: 'true' }),
      politica({ tablename: 'c', policyname: 'c_authenticated_read', roles: ['authenticated'], qual: 'true' }),
      politica({ tablename: 'c', policyname: 'mista', roles: ['service_role', 'anon'], qual: 'true' }),
    ],
  };
  const r = rls.avaliar(snapshot);
  assert.deepEqual(r.achados.map((a) => `${a.tipo}:${a.tabela}:${a.politica ?? ''}`).sort(), [
    'politica_aberta:a:service_role_full_access',
    'politica_aberta:c:c_authenticated_read',
    'politica_aberta:c:mista',
    'rls_desligado:aberta:',
  ]);
  assert.deepEqual(r.semPolitica, ['trancada']);
  assert.equal(rls.soPapeisPrivilegiados([]), false);
  assert.equal(rls.soPapeisPrivilegiados(null), false);

  const comExcecao = rls.avaliar(snapshot, [
    { table: 'c', policy: 'c_authenticated_read', motivo: 'catálogo público' },
    { table: 'zzz', policy: 'sumiu', motivo: 'antiga' },
  ]);
  assert.equal(comExcecao.achados.length, 3);
  assert.equal(comExcecao.aceitas.length, 1);
  assert.deepEqual(comExcecao.excecoesObsoletas.map((e) => e.table), ['zzz']);
});

test('rls: allowlist versionada é válida; malformada e snapshot sem tabela são erro (fail-closed)', () => {
  assert.ok(Array.isArray(rls.lerExcecoes(rls.ALLOWLIST_PADRAO)));
  assert.deepEqual(rls.lerExcecoes('/nao/existe.json'), []);
  const dir = tmp('rls-allow');
  try {
    const arq = path.join(dir, 'a.json');
    for (const ruim of ['{', '[]', '{"excecoes":[{"table":"t","policy":"p"}]}', '{"excecoes":[{"table":"t","policy":"p","motivo":" "}]}']) {
      writeFileSync(arq, ruim);
      assert.throws(() => rls.lerExcecoes(arq), Error, ruim);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.throws(() => rls.validarSnapshot({ policies: [], tables: [] }), /nenhuma tabela/);
  assert.throws(() => rls.validarSnapshot(null), /formato/);
  assert.throws(() => rls.validarSnapshot({ policies: [] }), /formato/);
});

test('rls CLI: sem banco não audita — avisa e sai 0; --strict/RLS_AUDIT_STRICT saem 1; service key sozinha sai 1', async () => {
  const sem = await rodarTs('rls-audit.ts');
  assert.equal(sem.status, 0, sem.tudo);
  assert.match(sem.stdout, /::warning title=RLS Audit::.*NÃO EXECUTADA/);
  assert.equal((await rodarTs('rls-audit.ts', ['--strict'])).status, 1);
  assert.equal((await rodarTs('rls-audit.ts', [], { env: { RLS_AUDIT_STRICT: '1' } })).status, 1);
  const soApi = await rodarTs('rls-audit.ts', [], { env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' } });
  assert.equal(soApi.status, 1);
  assert.match(soApi.stderr, /PGRST106/);
  assert.equal((await rodarTs('rls-audit.ts', ['--xyz'])).status, 2);
  const json = await rodarTs('rls-audit.ts', ['--json']);
  assert.equal(JSON.parse(json.stdout).executada, false);
});

/** `psql` de mentira: devolve o que estiver em saida.txt/status e registra argv, env e stdin. */
function psqlFalso() {
  const bin = tmp('psql');
  executavel(path.join(bin, 'psql'), [
    '#!/bin/sh',
    'd="$(dirname "$0")"',
    '{ echo "ARGV: $*"; echo "PGPASSWORD_NO_ENV: ${PGPASSWORD:+sim}"; echo "PGHOST: $PGHOST"; echo "PGSERVICE: ${PGSERVICE:-vazio}"; cat; } >> "$d/chamadas.log"',
    '[ -f "$d/stderr.txt" ] && cat "$d/stderr.txt" >&2',
    '[ -f "$d/saida.txt" ] && cat "$d/saida.txt"',
    'exit "$(cat "$d/status" 2>/dev/null || echo 0)"',
    '',
  ].join('\n'));
  return {
    bin,
    env: (extra = {}) => ({ PATH: `${bin}${path.delimiter}${process.env.PATH}`, ...extra }),
    responder: (saida, status = 0, stderr = '') => {
      writeFileSync(path.join(bin, 'saida.txt'), saida);
      writeFileSync(path.join(bin, 'status'), String(status));
      writeFileSync(path.join(bin, 'stderr.txt'), stderr);
      rmSync(path.join(bin, 'chamadas.log'), { force: true });
    },
    log: () => (existsSync(path.join(bin, 'chamadas.log')) ? readFileSync(path.join(bin, 'chamadas.log'), 'utf8') : ''),
    apagar: () => rmSync(bin, { recursive: true, force: true }),
  };
}

const URL_LOCAL = 'postgresql://auditor:S3gr3do%40Teste@127.0.0.1:1/postgres';

test('rls CLI: banco limpo sai 0, achado sai 1; senha vai por env (não argv) e a leitura é READ ONLY', async () => {
  const psql = psqlFalso();
  try {
    psql.responder(JSON.stringify({ tables: [tabela('pedidos')], policies: [politica({ tablename: 'pedidos', qual: '(tenant_id = x())' })] }));
    const limpo = await rodarTs('rls-audit.ts', [], { env: psql.env({ SUPABASE_DB_URL: URL_LOCAL, PGSERVICE: 'desvio' }) });
    assert.equal(limpo.status, 0, limpo.tudo);
    assert.match(limpo.stdout, /1 política\(s\) em 1 tabela\(s\), nenhuma aberta/);
    const log = psql.log();
    assert.match(log, /PGPASSWORD_NO_ENV: sim/);
    assert.match(log, /PGHOST: 127\.0\.0\.1/);
    assert.match(log, /PGSERVICE: vazio/, 'PG* herdado do chamador não chega ao psql');
    assert.doesNotMatch(log.split('\n').find((l) => l.startsWith('ARGV:')), /S3gr3do|auditor:/);
    assert.match(log, /BEGIN TRANSACTION READ ONLY;[\s\S]*pg_policies[\s\S]*ROLLBACK;/);

    psql.responder(JSON.stringify({ tables: [tabela('pedidos'), tabela('x', { relrowsecurity: false })], policies: [politica({ tablename: 'pedidos', roles: ['anon'], qual: 'true' })] }));
    const ruim = await rodarTs('rls-audit.ts', ['--json'], { env: psql.env({ SUPABASE_DB_URL: URL_LOCAL }) });
    assert.equal(ruim.status, 1);
    assert.equal(JSON.parse(ruim.stdout).achados.length, 2);
    assert.match(ruim.stderr, /x: RLS DESLIGADO/);
  } finally {
    psql.apagar();
  }
});

test('rls CLI: falha de conexão, saída que não é JSON e banco sem tabela saem 1 — e a senha nunca aparece', async () => {
  const psql = psqlFalso();
  try {
    const env = psql.env({ SUPABASE_DB_URL: URL_LOCAL });
    psql.responder('', 2, 'psql: error: FATAL: password authentication failed (senha S3gr3do@Teste / S3gr3do%40Teste)\n');
    const conexao = await rodarTs('rls-audit.ts', [], { env });
    assert.equal(conexao.status, 1);
    assert.match(conexao.stderr, /não conseguiu auditar/);
    assert.doesNotMatch(conexao.tudo, /S3gr3do/);

    psql.responder('<html>erro</html>');
    assert.equal((await rodarTs('rls-audit.ts', [], { env })).status, 1);
    psql.responder('');
    assert.equal((await rodarTs('rls-audit.ts', [], { env })).status, 1);
    psql.responder(JSON.stringify({ tables: [], policies: [] }));
    const vazio = await rodarTs('rls-audit.ts', [], { env });
    assert.equal(vazio.status, 1, 'banco sem tabela não é "nenhuma política aberta"');
  } finally {
    psql.apagar();
  }
});

test('rls CLI: destino que não é loopback nem o projeto oficial é recusado ANTES de chamar o psql', async () => {
  const psql = psqlFalso();
  try {
    psql.responder(JSON.stringify({ tables: [tabela('t')], policies: [] }));
    for (const url of [
      'postgresql://postgres:x@example.com:5432/postgres',
      'postgresql://postgres:x@db.trwgmplubeqxrxpncdgf.supabase.co:5432/postgres',
      'postgresql://postgres.apuzcrkeqodktmpwobnz:x@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
      'mysql://u:p@127.0.0.1/db',
      'isso não é url',
    ]) {
      const r = await rodarTs('rls-audit.ts', [], { env: psql.env({ SUPABASE_DB_URL: url }) });
      assert.equal(r.status, 1, `${url}\n${r.tudo}`);
      assert.equal(psql.log(), '', `psql foi chamado para ${url}`);
    }
  } finally {
    psql.apagar();
  }
});

// ─────────────────────────── db-explain-analyze ────────────────────────────

test('explain: extrai o tempo do plano, mediana ignora o cache frio, env inválida é erro', () => {
  assert.equal(explain.extrairTempoMs([{ Plan: { 'Actual Total Time': 1.5 }, 'Execution Time': 2.25 }]), 2.25);
  assert.equal(explain.extrairTempoMs([{ Plan: { 'Actual Total Time': 1.5 } }]), 1.5);
  for (const sem of [null, [], [{}], [{ 'Execution Time': 'x' }], [{ 'Execution Time': -1 }], 'texto']) assert.equal(explain.extrairTempoMs(sem), null);
  assert.equal(explain.mediana([900, 2, 3]), 3);
  assert.equal(explain.mediana([4, 2]), 3);
  assert.equal(explain.inteiroPositivo(undefined, 250, 'X'), 250);
  assert.equal(explain.inteiroPositivo('40', 250, 'X'), 40);
  for (const ruim of ['abc', '0', '-3', 'Infinity']) assert.throws(() => explain.inteiroPositivo(ruim, 250, 'X'), /inválido/);
});

test('explain: query que falha vira ERRO (antes virava "[skip]" e o script saía 0 sem medir nada)', () => {
  const plano = (ms) => [{ 'Execution Time': ms }];
  const medicoes = explain.medir(
    [{ name: 'rapida', sql: 'SELECT 1' }, { name: 'lenta', sql: 'SELECT 2' }, { name: 'quebrada', sql: 'SELECT 3' }, { name: 'escrita', sql: 'DELETE FROM t' }, { name: 'dupla', sql: 'SELECT 1; SELECT 2' }],
    (sql) => {
      if (sql.includes('SELECT 3')) throw new Error('relation "x" does not exist');
      return plano(sql.includes('SELECT 2') ? 900 : 1);
    },
    { runs: 3, limitMs: 250 },
  );
  assert.deepEqual(medicoes.map((m) => [m.name, m.ok, Boolean(m.erro)]), [
    ['rapida', true, false], ['lenta', false, false], ['quebrada', false, true], ['escrita', false, true], ['dupla', false, true],
  ]);
  const md = explain.montarRelatorio(medicoes, 250, new Date('2026-11-09T12:00:00Z'));
  assert.match(md, /## lenta\n- mediana: \*\*900\.00ms\*\*[\s\S]*REGRESSÃO/);
  assert.match(md, /## quebrada\n- status: ERRO/);
});

test('explain: toda query quente é leitura única e só usa coluna que existe em types.ts', () => {
  const tipos = readFileSync(path.join(RAIZ, 'src/integrations/supabase/types.ts'), 'utf8');
  const colunasDe = (tabela) => {
    const inicio = tipos.search(new RegExp(`^      ${tabela}: \\{\\n        Row: \\{`, 'm'));
    assert.ok(inicio >= 0, `tabela ${tabela} não está em types.ts`);
    const bloco = tipos.slice(inicio, tipos.indexOf('\n        }', inicio));
    return new Set([...bloco.matchAll(/^          (\w+)\??:/gm)].map((m) => m[1]));
  };
  for (const q of explain.HOT_QUERIES) {
    assert.match(q.sql, /^SELECT\b/i);
    assert.doesNotMatch(q.sql, /;/);
    const tabelaAlvo = q.sql.match(/FROM public\.(\w+)/)[1];
    const colunas = colunasDe(tabelaAlvo);
    const onde = q.sql.replace(/'[^']*'/g, "''");
    for (const m of onde.matchAll(/\b(?:WHERE|AND|ORDER BY|SELECT)\s+(\w+)\b/gi)) {
      if (/^(select|id)$/i.test(m[1])) continue;
      assert.ok(colunas.has(m[1]), `${q.name}: coluna "${m[1]}" não existe em public.${tabelaAlvo}`);
    }
  }
});

test('explain CLI: mede, grava o snapshot e sai 0; regressão, erro de query e falta de URL saem 1', async () => {
  const psql = psqlFalso();
  const fora = tmp('perf');
  try {
    const env = psql.env({ SUPABASE_DB_URL: URL_LOCAL, EXPLAIN_RUNS: '2' });
    psql.responder(JSON.stringify([{ Plan: { 'Actual Total Time': 0.4 }, 'Execution Time': 0.5 }]));
    const ok = await rodarTs('db-explain-analyze.ts', ['--out', path.join(fora, 'sub'), '--json'], { env });
    assert.equal(ok.status, 0, ok.tudo);
    const json = JSON.parse(ok.stdout);
    assert.equal(json.queries.length, explain.HOT_QUERIES.length);
    assert.ok(json.queries.every((q) => q.ok && q.runs.length === 2));
    const arquivos = readdirSync(path.join(fora, 'sub'));
    assert.equal(arquivos.length, 1);
    assert.match(arquivos[0], /^explain-\d{4}-\d{2}-\d{2}\.md$/);
    assert.match(psql.log(), /BEGIN TRANSACTION READ ONLY;[\s\S]*EXPLAIN \(ANALYZE, BUFFERS, FORMAT JSON\) SELECT/);

    const lenta = await rodarTs('db-explain-analyze.ts', ['--no-snapshot'], { env: { ...env, EXPLAIN_LIMIT_MS: '0.1' } });
    assert.equal(lenta.status, 1);
    assert.equal(readdirSync(fora).length, 1, '--no-snapshot não grava nada');

    psql.responder('', 3, 'psql:<stdin>:3: ERROR:  column "read_at" does not exist\n');
    const quebrada = await rodarTs('db-explain-analyze.ts', ['--no-snapshot'], { env });
    assert.equal(quebrada.status, 1);
    assert.match(quebrada.tudo, /ERRO — .*read_at/);

    assert.equal((await rodarTs('db-explain-analyze.ts', ['--no-snapshot'], { env: psql.env() })).status, 1, 'sem SUPABASE_DB_URL');
    assert.equal((await rodarTs('db-explain-analyze.ts', [], { env: { ...env, EXPLAIN_RUNS: 'abc' } })).status, 2);
    assert.equal((await rodarTs('db-explain-analyze.ts', ['--xyz'], { env })).status, 2);
  } finally {
    psql.apagar();
    rmSync(fora, { recursive: true, force: true });
  }
});

// ──────────────────────────── squash-migrations ────────────────────────────

function repoDeMigrations(arquivos) {
  const raiz = tmp('squash');
  mkdirSync(path.join(raiz, 'scripts'));
  mkdirSync(path.join(raiz, 'supabase', 'migrations'), { recursive: true });
  cpSync(SCRIPT('squash-migrations.sh'), path.join(raiz, 'scripts', 'squash-migrations.sh'));
  for (const [nome, sql] of Object.entries(arquivos)) writeFileSync(path.join(raiz, 'supabase', 'migrations', nome), sql);
  const git = (...args) => spawnSync('git', ['-C', raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  const dir = path.join(raiz, 'supabase', 'migrations');
  return {
    raiz,
    dir,
    git,
    listar: () => readdirSync(dir).sort(),
    squash: (...args) => spawnSync('bash', [path.join(raiz, 'scripts', 'squash-migrations.sh'), ...args], { encoding: 'utf8', env: ENV_BASE }),
    apagar: () => rmSync(raiz, { recursive: true, force: true }),
  };
}

const MIGRATIONS = {
  '20240101000000_a.sql': 'CREATE TABLE a();\n',
  '20240102000000_b com espaco.sql': 'CREATE TABLE b();',
  '20240103000000_c.sql': 'CREATE TABLE c();\n',
  '20240201120000_0a1b2c3d-1111-2222-3333-444455556666.sql': 'CREATE TABLE lovable1();\n',
  '20240301000000_d.sql': 'CREATE TABLE d();\n',
};

test('squash: baseline nunca repete a versão de uma migration que fica (antes: <CUTOFF>_squashed colidia com a 1ª UUID)', () => {
  const repo = repoDeMigrations(MIGRATIONS);
  try {
    const dry = repo.squash('--dry-run');
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /Auto-detected cutoff: 20240201120000/);
    assert.equal(repo.listar().length, 5, 'dry-run não muda nada');

    const r = repo.squash();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const depois = repo.listar();
    assert.deepEqual(depois, [
      '20240103000000_squashed_baseline.sql',
      '20240201120000_0a1b2c3d-1111-2222-3333-444455556666.sql',
      '20240301000000_d.sql',
    ]);
    const versoes = depois.map((n) => n.slice(0, 14));
    assert.equal(new Set(versoes).size, versoes.length, 'versão duplicada quebra o supabase migration');
    const sql = readFileSync(path.join(repo.dir, depois[0]), 'utf8');
    const ordem = ['CREATE TABLE a();', 'CREATE TABLE b();', 'CREATE TABLE c();'].map((t) => sql.indexOf(t));
    assert.ok(ordem.every((p) => p >= 0) && ordem[0] < ordem[1] && ordem[1] < ordem[2], 'conteúdo completo e na ordem');
    assert.doesNotMatch(sql, /lovable1/);
    assert.deepEqual(readdirSync(repo.dir, { withFileTypes: true }).filter((e) => e.name.startsWith('.')).length, 0, 'sem temporário');
  } finally {
    repo.apagar();
  }
});

test('squash: rodar de novo não perde o baseline — mesmo cutoff é no-op, cutoff maior incorpora', () => {
  const repo = repoDeMigrations(MIGRATIONS);
  try {
    assert.equal(repo.squash('--cutoff', '20240201120000').status, 0);
    repo.git('add', '-A');
    repo.git('commit', '-q', '-m', 'squash');
    const antes = readFileSync(path.join(repo.dir, '20240103000000_squashed_baseline.sql'), 'utf8');

    const repete = repo.squash('--cutoff', '20240201120000');
    assert.equal(repete.status, 0, repete.stderr);
    assert.match(repete.stdout, /already a squashed baseline/);
    assert.equal(readFileSync(path.join(repo.dir, '20240103000000_squashed_baseline.sql'), 'utf8'), antes);

    const maior = repo.squash('--cutoff', '20240301');
    assert.equal(maior.status, 0, maior.stdout + maior.stderr);
    assert.deepEqual(repo.listar(), ['20240201120000_squashed_baseline.sql', '20240301000000_d.sql']);
    const sql = readFileSync(path.join(repo.dir, '20240201120000_squashed_baseline.sql'), 'utf8');
    for (const trecho of ['CREATE TABLE a();', 'CREATE TABLE b();', 'CREATE TABLE c();', 'CREATE TABLE lovable1();']) assert.ok(sql.includes(trecho), trecho);
    assert.ok(sql.indexOf('CREATE TABLE c();') < sql.indexOf('CREATE TABLE lovable1();'));
  } finally {
    repo.apagar();
  }
});

test('squash: árvore suja, arquivo novo não versionado e argumento inválido são recusados sem apagar nada', () => {
  const repo = repoDeMigrations(MIGRATIONS);
  try {
    assert.equal(repo.squash('--cutoff').status, 1);
    assert.equal(repo.squash('--cutoff', '2024-02-01').status, 1);
    assert.equal(repo.squash('--cutoff', '202402').status, 1);
    assert.equal(repo.squash('--nada').status, 1);
    assert.equal(repo.squash('--help').status, 0);
    assert.doesNotMatch(repo.squash('--help').stdout, /Parse args|set -euo/, '--help mostra só o cabeçalho');

    writeFileSync(path.join(repo.dir, '20240101000001_nova.sql'), 'SELECT 1;\n');
    const naoVersionado = repo.squash();
    assert.equal(naoVersionado.status, 1);
    assert.match(naoVersionado.stderr, /uncommitted changes/);
    rmSync(path.join(repo.dir, '20240101000001_nova.sql'));

    writeFileSync(path.join(repo.dir, '20240101000000_a.sql'), 'ALTERADO\n');
    assert.equal(repo.squash().status, 1);
    assert.equal(repo.listar().length, 5);

    const nada = repo.squash('--dry-run', '--cutoff', '20200101');
    assert.equal(nada.status, 0);
    assert.match(nada.stdout, /nothing to squash/);
  } finally {
    repo.apagar();
  }
});

test('squash: arquivo sem prefixo de 14 dígitos é ignorado com aviso; sem UUID o cutoff tem de ser explícito', () => {
  const repo = repoDeMigrations({ '20240101000000_a.sql': 'A;\n', '20240102000000_b.sql': 'B;\n', 'seed.sql': 'SEED;\n' });
  try {
    const semUuid = repo.squash('--dry-run');
    assert.equal(semUuid.status, 1);
    assert.match(semUuid.stderr, /could not auto-detect cutoff/);
    const r = repo.squash('--cutoff', '20240102');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /ignoring file without a 14-digit timestamp prefix: seed\.sql/);
    assert.deepEqual(repo.listar(), ['20240101000000_squashed_baseline.sql', '20240102000000_b.sql', 'seed.sql']);
  } finally {
    repo.apagar();
  }
});

// ───────────────────────── deploy_edge_functions ───────────────────────────

function ambienteDeDeploy({ funcoes, comEnv = true } = {}) {
  const raiz = tmp('deploy');
  const bin = path.join(raiz, 'bin');
  mkdirSync(bin);
  cpSync(DEPLOY, path.join(raiz, 'deploy.sh'));
  const lista = funcoes ?? [...readFileSync(DEPLOY, 'utf8').match(/^FUNCTIONS=\(([\s\S]*?)^\)/m)[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const fn of [...lista, 'migrate-helper', 'fora-da-lista']) {
    mkdirSync(path.join(raiz, 'supabase', 'functions', fn), { recursive: true });
    writeFileSync(path.join(raiz, 'supabase', 'functions', fn, 'index.ts'), '// x\n');
  }
  mkdirSync(path.join(raiz, 'supabase', 'functions', '_shared'));
  if (comEnv) writeFileSync(path.join(raiz, '.env'), 'VITE_SUPABASE_PUBLISHABLE_KEY="chave-publica-do-env"\n');
  executavel(path.join(bin, 'supabase'), [
    '#!/bin/sh',
    'd="$(dirname "$0")"',
    'echo "$*" >> "$d/supabase.log"',
    'if [ "$1" = "functions" ] && grep -qx "$3" "$d/falhar" 2>/dev/null; then echo "erro de deploy"; exit 1; fi',
    'echo "Deployed $3"',
    '',
  ].join('\n'));
  executavel(path.join(bin, 'curl'), [
    '#!/bin/sh',
    'd="$(dirname "$0")"',
    'echo "$*" >> "$d/curl.log"',
    'for a in "$@"; do case "$a" in https://*) fn="${a##*/}" ;; esac; done',
    'codigo="$(sed -n "s/^$fn=//p" "$d/status" 2>/dev/null)"',
    'printf "%s" "${codigo:-401}"',
    '',
  ].join('\n'));
  const ler = (nome) => (existsSync(path.join(bin, nome)) ? readFileSync(path.join(bin, nome), 'utf8') : '');
  return {
    raiz,
    bin,
    lista,
    rodar: (args = [], cwd = raiz) => spawnSync('bash', [path.join(raiz, 'deploy.sh'), ...args], { cwd, encoding: 'utf8', env: { ...ENV_BASE, PATH: `${bin}${path.delimiter}${process.env.PATH}` } }),
    supabase: () => ler('supabase.log'),
    curl: () => ler('curl.log'),
    apagar: () => rmSync(raiz, { recursive: true, force: true }),
  };
}

test('deploy: a lista real só tem função que existe em disco, sem migrate-helper e sem chave embutida', () => {
  const fonte = readFileSync(DEPLOY, 'utf8');
  const lista = [...fonte.match(/^FUNCTIONS=\(([\s\S]*?)^\)/m)[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(lista.length >= 20);
  assert.equal(new Set(lista).size, lista.length, 'função repetida na lista');
  for (const fn of lista) assert.ok(existsSync(path.join(RAIZ, 'supabase/functions', fn, 'index.ts')), `${fn} está na lista e não existe em disco`);
  assert.ok(!lista.includes('migrate-helper'), 'migrate-helper devolve service_role e DB URL — nunca publicar');
  assert.match(fonte, /BLOCKED_FUNCTIONS=\("migrate-helper"\)/);
  assert.doesNotMatch(fonte, /eyJ[A-Za-z0-9_-]{10,}\./, 'JWT copiado dentro do script');
  for (const critica of [...fonte.match(/^CRITICAL_FNS=\(([\s\S]*?)^\)/m)[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1])) {
    assert.ok(lista.includes(critica), `${critica} é verificada mas não é publicada`);
  }
});

test('deploy: --dry-run não chama supabase nem rede; migrate-helper fica de fora mesmo existindo em disco', () => {
  const amb = ambienteDeDeploy();
  try {
    const r = amb.rodar(['--dry-run'], os.tmpdir()); // de outra pasta: o script se posiciona sozinho
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(amb.supabase(), '');
    assert.equal(amb.curl(), '');
    assert.match(r.stdout, /\[migrate-helper\] existe em disco e está BLOQUEADA/);
    assert.match(r.stdout, /fora da lista de deploy \(não serão publicadas\): fora-da-lista/);
    assert.doesNotMatch(r.stdout, /\[migrate-helper\] seria publicada/);
    assert.match(r.stdout, /\[telemetry\] seria publicada \(--no-verify-jwt\)/);
    assert.match(r.stdout, /\[workflow-engine\] seria publicada\n/);
  } finally {
    amb.apagar();
  }
});

test('deploy: tudo certo sai 0 — publica cada função uma vez, JWT desligado só nas previstas, chave vem do .env', () => {
  const amb = ambienteDeDeploy();
  try {
    const r = amb.rodar();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const deploys = amb.supabase().split('\n').filter((l) => l.startsWith('functions deploy '));
    assert.equal(deploys.length, amb.lista.length);
    assert.ok(!deploys.some((l) => l.includes('migrate-helper')));
    const semJwt = deploys.filter((l) => l.includes('--no-verify-jwt')).map((l) => l.split(' ')[2]).sort();
    assert.deepEqual(semJwt, ['dependency-health', 'punchout-receive', 'run-audit', 'system-simulation', 'telemetry', 'webauthn-authenticate']);
    assert.ok(deploys.every((l) => l.includes('--project-ref lmypcdfsrgfftzhxawao')));
    assert.match(amb.curl(), /Authorization: Bearer chave-publica-do-env/);
    assert.equal(amb.curl().trim().split('\n').length, 6, 'uma verificação por função crítica');
  } finally {
    amb.apagar();
  }
});

test('deploy: falha de deploy, 404/503/sem resposta na verificação e chave ausente saem 1 (antes: sempre 0)', () => {
  const amb = ambienteDeDeploy();
  try {
    writeFileSync(path.join(amb.bin, 'falhar'), 'erp-sync\n');
    const falhou = amb.rodar();
    assert.equal(falhou.status, 1);
    assert.match(falhou.stdout, /Falhas:\s+1 \//);
    assert.match(falhou.stdout, /- erp-sync/);
    assert.doesNotMatch(amb.curl(), /\/erp-sync/, 'função que não subiu não é "verificada"');
    rmSync(path.join(amb.bin, 'falhar'));

    for (const [codigo, texto] of [['404', /NÃO deployada/], ['503', /não inicializa/], ['000', /sem resposta/]]) {
      writeFileSync(path.join(amb.bin, 'status'), `telemetry=${codigo}\n`);
      const r = amb.rodar(['--only', 'telemetry,workflow-engine']);
      assert.equal(r.status, 1, `${codigo}\n${r.stdout}`);
      assert.match(r.stdout, texto);
    }
    writeFileSync(path.join(amb.bin, 'status'), 'telemetry=500\n');
    assert.equal(amb.rodar(['--only', 'telemetry']).status, 0, '500 é aviso: a função existe e respondeu');
  } finally {
    amb.apagar();
  }
  const semChave = ambienteDeDeploy({ comEnv: false });
  try {
    const r = semChave.rodar(['--only', 'telemetry']);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /NÃO VERIFICADO/);
    assert.equal(semChave.curl(), '');
  } finally {
    semChave.apagar();
  }
});

test('deploy: --only recusa função bloqueada ou fora da lista antes de publicar qualquer coisa', () => {
  const amb = ambienteDeDeploy();
  try {
    for (const args of [['--only', 'migrate-helper'], ['--only', 'telemetry,migrate-helper'], ['--only', 'fora-da-lista'], ['--only', ','], ['--only'], ['--xyz']]) {
      const r = amb.rodar(args);
      assert.equal(r.status, 2, `${args.join(' ')}\n${r.stdout}${r.stderr}`);
    }
    assert.equal(amb.supabase(), '', 'nada foi publicado');
    const so = amb.rodar(['--only', ' workflow-engine , workflow-engine']);
    assert.equal(so.status, 0, so.stdout + so.stderr);
    assert.equal(amb.supabase().split('\n').filter((l) => l.startsWith('functions deploy ')).length, 1);
    rmSync(path.join(amb.raiz, 'supabase', 'functions', 'scim-v2'), { recursive: true });
    const ausente = amb.rodar(['--only', 'scim-v2']);
    assert.equal(ausente.status, 1);
    assert.match(ausente.stdout, /scim-v2 \(diretório ausente\)/);
  } finally {
    amb.apagar();
  }
});
