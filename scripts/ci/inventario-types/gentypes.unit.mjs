// Cenarios de scripts/types-sync/gen-types.sh e dos install-*.sh, com binarios de mentira no PATH
// (supabase, apt-get, sudo, pgbouncer, pg_isready). Roda com bash/dash + coreutils, sem rede e sem banco:
// o PATH do script e um diretorio so de links para o nucleo POSIX, entao `supabase`, `pgbouncer` e `rg`
// do host nunca entram. Cada shell (bash, dash) ausente deixa seus casos `skip`.
// Os 4 casos de proxy ponta a ponta (pgbouncer REAL -> Postgres efemero com TLS verify-full) sao opt-in:
// exigem INVENTARIO_TEST_PG_BIN (ver pg.mjs), pgbouncer, pg_isready, openssl e ps; sem isso ficam `skip` e
// nenhum cluster sobe.
// "Sobrou temporario?" nao olha /tmp inteiro (outro processo mexendo la daria falso alarme): o `mktemp` do
// PATH de teste e um embrulho que anota cada caminho que o script criou, e os casos conferem so esses.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { REPO, FERRAMENTAS, acha, pastaNova, repoFalso, requer, rodar } from './lib.mjs';
import { pg, SENHA_TIPOS } from './pg.mjs';

const GEN = 'scripts/types-sync/gen-types.sh';
const ARQS = [GEN, 'scripts/types-sync/local-pg-proxy.mjs', 'scripts/types-sync/identidade-banco.mjs'];
const CA_REL = 'scripts/types-sync/certs/supabase-prod-ca-2021.crt';
const TIPOS = 'export type Json = string\n\nexport type Database = {\n  public: {\n    Tables: {\n      t: {\n      }\n    }\n  }\n}\n';
const URL_FALSA = 'postgresql://postgres.abcdefghijklmnopqrst:S3nh4-Sup3r-S3cr3t4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const SHELLS = ['bash', 'dash'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------- caixa de ferramentas de mentira ----------------
// Nucleo que o gen-types.sh e o `supabase` de mentira usam; o que faltar no host deixa os casos `skip`.
const NUCLEO = ['sh', 'bash', 'awk', 'cat', 'chmod', 'grep', 'head', 'mktemp', 'mv', 'rm', 'sleep', 'wc'];
const FALTAM = NUCLEO.filter((t) => !acha(t));
// kill/printf/echo sao builtins do shell; o resto e conforto para quem depurar um caso a mao
const OPCIONAIS = ['basename', 'dirname', 'env', 'kill', 'printf', 'sed', 'date', 'diff', 'id', 'ln', 'ls', 'tee', 'tr', 'dash'];
const escreverExe = (dir, nome, conteudo) => fs.writeFileSync(path.join(dir, nome), conteudo, { mode: 0o755 });

const FAKE = pastaNova('bin-fake');
const BASE = pastaNova('bin-base');
const STUBS = pastaNova('bin-stubs');
for (const dir of [FAKE, BASE, STUBS]) fs.chmodSync(dir, 0o755);
if (FALTAM.length === 0) {
  for (const t of [...NUCLEO, ...OPCIONAIS]) {
    const alvo = acha(t);
    if (alvo && !['mktemp', 'sleep'].includes(t)) fs.symlinkSync(alvo, path.join(BASE, t));
  }
  fs.symlinkSync(process.execPath, path.join(BASE, 'node'));
  // mktemp: o do host, mais uma linha no log com cada caminho criado (MKTEMP_LOG)
  escreverExe(BASE, 'mktemp', `#!/bin/sh\nr=$(${acha('mktemp')} "$@") || exit $?\nprintf '%s\\n' "$r" >> "\${MKTEMP_LOG:-/dev/null}"\nprintf '%s\\n' "$r"\n`);
  // sleep: com SLEEP_ESCALA=N as esperas viram 1/N (o laco de 50 x 0.2s do gen-types.sh deixa de custar 10 s); sem ela e o sleep do host
  escreverExe(BASE, 'sleep', `#!/bin/sh\nif [ -n "\${SLEEP_ESCALA:-}" ] && [ "$#" -eq 1 ]; then\n  d=$(${acha('awk')} -v d="$1" -v e="$SLEEP_ESCALA" 'BEGIN { printf "%.4f", d / e }')\n  exec ${acha('sleep')} "$d"\nfi\nexec ${acha('sleep')} "$@"\n`);

  // supabase de mentira: registra argv e se comporta conforme FAKE_SUPABASE (lista separada por virgula,
  // uma entrada por chamada; a ultima vale para as chamadas seguintes).
  escreverExe(FAKE, 'supabase', `#!/bin/bash
: "\${FAKE_DIR:?}"
n=$(( $(cat "$FAKE_DIR/chamadas" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$FAKE_DIR/chamadas"
printf '%s\\n' "$*" >> "$FAKE_DIR/argv.log"
IFS=, read -r -a modos <<< "\${FAKE_SUPABASE:-ok}"
modo="\${modos[$(( n <= \${#modos[@]} ? n - 1 : \${#modos[@]} - 1 ))]}"
tipos() { printf 'export type Json = string\\n\\nexport type Database = {\\n  public: {\\n    Tables: {\\n      t: {\\n      }\\n    }\\n  }\\n}\\n'; }
case "$modo" in
  ok) tipos ;;
  finais) tipos; printf '\\n\\n\\n' ;;
  semnl) tipos | head -c -1 ;;
  vazio) : ;;
  lixo) echo "Error: failed to connect to postgres" ;;
  falha) echo "parcial que nao pode ir pro arquivo"; echo "erro do supabase" >&2; exit 1 ;;
  dorme) tipos; sleep "\${FAKE_SLEEP:-30}" ;;
  psql)  # conecta de verdade na --db-url recebida
    url=""; while [ $# -gt 0 ]; do [ "$1" = "--db-url" ] && url="$2"; shift; done
    quem=$(psql -X -Atc "select current_user || '@' || current_database()" "$url") || exit 1
    tipos; echo "// conectado como $quem" ;;
  *) echo "modo desconhecido $modo" >&2; exit 9 ;;
esac
`);
  // pgbouncer/pg_isready de mentira: o pgbouncer anota que iniciou e morre (como numa config invalida);
  // o pg_isready nunca acha o proxy pronto.
  escreverExe(STUBS, 'pgbouncer', '#!/bin/sh\nprintf \'iniciou\\n\' >> "$FAKE_DIR/pgbouncer-iniciou"\necho "FATAL config invalida host=segredo" >&2\nexit 1\n');
  escreverExe(STUBS, 'pg_isready', '#!/bin/sh\nexit 2\n');
}

const shellDe = (sh) => FERRAMENTAS[sh];
const skipSh = (sh) => (FALTAM.length ? `ferramenta(s) ausente(s) no PATH: ${FALTAM.join(', ')}` : requer(FERRAMENTAS[sh], `${sh} ausente no PATH`));
const skipProxyReal = (sh) => skipSh(sh) || pg.skip || pg.proxySkip || requer(FERRAMENTAS.ps, 'ps ausente no PATH') || false;
const tsh = (sh, nome, fn, opts = {}) => test(`[${sh}] ${nome}`, { skip: skipSh(sh), ...opts }, fn);

function arvore({ ca = path.join(REPO, CA_REL) } = {}) {
  const raiz = repoFalso({}, { scripts: ARQS, nome: 'gt' });
  fs.mkdirSync(path.join(raiz, 'scripts/types-sync/certs'), { recursive: true });
  fs.copyFileSync(ca, path.join(raiz, CA_REL));
  for (const d of ['fake', 'saida']) {
    fs.mkdirSync(path.join(raiz, d));
    fs.chmodSync(path.join(raiz, d), 0o777);
  }
  return raiz;
}
/** Temporarios que o script criou (via o `mktemp` do PATH de teste) e que continuam no disco. */
const lixoDe = (raiz) => {
  const log = path.join(raiz, 'fake/mktemp.log');
  if (!fs.existsSync(log)) return [];
  return fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).flatMap((p) => [p, `${p}.normalized`]).filter((p) => fs.existsSync(p));
};
const proxyDirsDe = (raiz) => {
  const log = path.join(raiz, 'fake/mktemp.log');
  return fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter((p) => p.startsWith('/tmp/pg-proxy.')) : [];
};
/** pgbouncers ainda vivos que foram subidos por ESTA execucao do script. */
const pgbouncersVivos = (raiz) => {
  const dirs = proxyDirsDe(raiz);
  return rodar(FERRAMENTAS.ps, ['-eo', 'comm,args']).stdout.split('\n')
    .filter((l) => /^pgbouncer\s/.test(l) && dirs.some((d) => l.includes(d))).map((l) => l.slice(0, 80));
};
const ambiente = (raiz, { proxy = null, env = {}, path: caminho } = {}) => ({
  PATH: (caminho ?? [FAKE, ...(proxy === 'real' ? [pg.pgbDir] : proxy === 'stub' ? [STUBS] : []), BASE]).join(':'),
  HOME: raiz,
  FAKE_DIR: path.join(raiz, 'fake'),
  MKTEMP_LOG: path.join(raiz, 'fake/mktemp.log'),
  GEN_TYPES_RETRY_DELAY_S: '0',
  LANG: 'C.UTF-8',
  ...env,
});
function gen(raiz, sh, args, opts = {}) {
  const cmd = [shellDe(sh), GEN, ...args];
  // pgbouncer real: como root o processo roda como o usuario sem privilegio do harness (pg.mjs)
  const completo = opts.proxy === 'real' && pg.prefixoCaps?.length ? [...pg.prefixoCaps, ...cmd] : cmd;
  const r = rodar(completo[0], completo.slice(1), { cwd: raiz, env: ambiente(raiz, opts), timeout: 90_000 });
  const argvLog = path.join(raiz, 'fake/argv.log');
  return { ...r, lixo: lixoDe(raiz), argv: fs.existsSync(argvLog) ? fs.readFileSync(argvLog, 'utf8').trim().split('\n') : [] };
}
const chamadas = (raiz) => Number(fs.readFileSync(path.join(raiz, 'fake/chamadas'), 'utf8'));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
function iniciar(raiz, sh, out, env, opts = {}) {
  const p = spawn(shellDe(sh), [GEN, out], { cwd: raiz, env: ambiente(raiz, { env }), stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  const estado = { saida: '' };
  p.stdout.on('data', (d) => { estado.saida += d; });
  p.stderr.on('data', (d) => { estado.saida += d; });
  estado.fim = new Promise((r) => p.on('close', (status, sig) => r({ status, sig })));
  return { p, estado };
}

for (const sh of SHELLS) {
  tsh(sh, 'sem SUPABASE_DB_URL -> exit 1, mensagem, nada chamado, sem temporario', () => {
    const raiz = arvore();
    const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')]);
    assert.equal(r.status, 1, r.saida);
    assert.match(r.stderr, /SUPABASE_DB_URL nao definida/);
    assert.deepEqual(r.argv, []);
    assert.deepEqual(r.lixo, []);
    assert.ok(!fs.existsSync(path.join(raiz, 'saida/t.ts')));
  });

  tsh(sh, 'direto (sem pgbouncer, fora de CI): gera, avisa do --db-url exposto, normaliza o EOF, saida com espaco no nome', () => {
    const raiz = arvore();
    const out = path.join(raiz, 'saida/meus tipos.ts');
    const r = gen(raiz, sh, [out], { env: { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'finais' } });
    assert.equal(r.status, 0, r.saida);
    assert.match(r.stderr, /Aviso: pgbouncer ausente/);
    assert.deepEqual(r.argv, [`gen types typescript --db-url ${URL_FALSA} --schema public`]);
    assert.equal(fs.readFileSync(out, 'utf8'), TIPOS, 'linhas vazias finais removidas, internas preservadas');
    assert.match(r.stdout, new RegExp(`^types gerado: ${esc(out)} \\(${TIPOS.length} bytes\\)\\n$`));
    assert.ok(!r.stdout.includes('S3nh4'), 'a URL nao vai para o stdout');
    assert.deepEqual(r.lixo, []);
  });

  tsh(sh, 'saida sem newline final ganha um', () => {
    const raiz = arvore();
    const out = path.join(raiz, 'saida/t.ts');
    const r = gen(raiz, sh, [out], { env: { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'semnl' } });
    assert.equal(r.status, 0, r.saida);
    assert.equal(fs.readFileSync(out, 'utf8'), TIPOS);
  });

  tsh(sh, 'CI=true sem pgbouncer -> exit 1 e a credencial NAO vai ao --db-url', () => {
    const raiz = arvore();
    const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')], { env: { SUPABASE_DB_URL: URL_FALSA, CI: 'true' } });
    assert.equal(r.status, 1, r.saida);
    assert.match(r.stderr, /pgbouncer ausente em ambiente CI/);
    assert.deepEqual(r.argv, []);
    assert.deepEqual(r.lixo, []);
  });

  tsh(sh, 'supabase falha 3x -> exit 1 apos 3 tentativas; saida anterior intacta; parcial nao vaza', () => {
    const raiz = arvore();
    const out = path.join(raiz, 'saida/t.ts');
    fs.writeFileSync(out, 'ANTIGO');
    const r = gen(raiz, sh, [out], { env: { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'falha' } });
    assert.equal(r.status, 1, r.saida);
    assert.equal(r.argv.length, 3);
    assert.match(r.stderr, /falhou na tentativa 1\/3[\s\S]*falhou na tentativa 2\/3[\s\S]*falhou em 3 tentativas/);
    assert.equal(fs.readFileSync(out, 'utf8'), 'ANTIGO');
    assert.deepEqual(r.lixo, []);
  });

  tsh(sh, 'falha 2x e passa na 3a -> exit 0 com o conteudo da 3a (sem resto das tentativas anteriores)', () => {
    const raiz = arvore();
    const out = path.join(raiz, 'saida/t.ts');
    const r = gen(raiz, sh, [out], { env: { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'falha,falha,ok' } });
    assert.equal(r.status, 0, r.saida);
    assert.equal(r.argv.length, 3);
    assert.equal(fs.readFileSync(out, 'utf8'), TIPOS);
  });

  for (const modo of ['vazio', 'lixo']) {
    tsh(sh, `supabase sai 0 com saida ${modo} -> NAO pode declarar sucesso nem sobrescrever a saida`, () => {
      const raiz = arvore();
      const out = path.join(raiz, 'saida/t.ts');
      fs.writeFileSync(out, 'ANTIGO');
      const r = gen(raiz, sh, [out], { env: { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: modo } });
      assert.notEqual(r.status, 0, r.saida);
      assert.equal(fs.readFileSync(out, 'utf8'), 'ANTIGO');
      assert.ok(!/types gerado/.test(r.stdout));
      assert.deepEqual(r.lixo, []);
    });
  }

  tsh(sh, '--local: chama "gen types typescript --local --schema public" e nao exige SUPABASE_DB_URL; falha = exit != 0', () => {
    const raiz = arvore();
    const out = path.join(raiz, 'saida/t.ts');
    let r = gen(raiz, sh, ['--local', out]);
    assert.equal(r.status, 0, r.saida);
    assert.deepEqual(r.argv, ['gen types typescript --local --schema public']);
    assert.equal(fs.readFileSync(out, 'utf8'), TIPOS);
    fs.writeFileSync(out, 'ANTIGO');
    r = gen(raiz, sh, ['--local', out], { env: { FAKE_SUPABASE: 'falha' } });
    assert.notEqual(r.status, 0);
    assert.equal(fs.readFileSync(out, 'utf8'), 'ANTIGO');
    assert.deepEqual(r.lixo, []);
  });

  tsh(sh, 'diretorio de saida inexistente -> exit != 0 e sem temporario', () => {
    const raiz = arvore();
    const r = gen(raiz, sh, [path.join(raiz, 'nao/existe/t.ts')], { env: { SUPABASE_DB_URL: URL_FALSA } });
    assert.notEqual(r.status, 0);
    assert.deepEqual(r.lixo, []);
  });

  tsh(sh, 'supabase ausente do PATH -> exit != 0 depois das 3 tentativas, sem temporario', () => {
    const raiz = arvore();
    const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')], { path: [BASE], env: { SUPABASE_DB_URL: URL_FALSA } });
    assert.notEqual(r.status, 0);
    assert.ok(!fs.existsSync(path.join(raiz, 'saida/t.ts')));
    assert.deepEqual(r.lixo, []);
  });

  // Casos de sinal: todos assincronos (so esperam o processo), entao rodam juntos em vez de somar os
  // ~2 s de cada um; os casos que bloqueiam com spawnSync ficam fora do grupo para nao atrasar um kill.
  describe(`sinais [${sh}]`, { concurrency: true }, () => {
    for (const sinal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
      tsh(sh, `${sinal} no meio do gen types -> o script PARA (exit != 0), nao tenta de novo, nao grava saida, limpa temporario`, async () => {
        const raiz = arvore();
        const out = path.join(raiz, 'saida/t.ts');
        const { p, estado } = iniciar(raiz, sh, out, { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'dorme,ok', FAKE_SLEEP: '2' });
        for (let i = 0; i < 100 && !fs.existsSync(path.join(raiz, 'fake/chamadas')); i += 1) await espera(30);
        p.kill(sinal); // so o shell recebe (como `kill <pid>` ou o cancelamento do runner)
        const { status, sig } = await estado.fim;
        assert.ok(status !== 0 || sig, `terminou com status 0 depois de ${sinal}: ${estado.saida}`);
        assert.equal(chamadas(raiz), 1, 'nao pode iniciar outra tentativa depois do sinal');
        assert.ok(!fs.existsSync(out), 'nao pode gravar a saida depois do sinal');
        assert.ok(!/types gerado/.test(estado.saida));
        assert.deepEqual(lixoDe(raiz), []);
      });
    }

    tsh(sh, 'sinal durante a espera entre tentativas -> para; nao faz a tentativa seguinte nem declara sucesso', async () => {
      const raiz = arvore();
      const out = path.join(raiz, 'saida/t.ts');
      const { p, estado } = iniciar(raiz, sh, out, { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'falha,ok', GEN_TYPES_RETRY_DELAY_S: '2' });
      for (let i = 0; i < 200 && !/nova tentativa em/.test(estado.saida); i += 1) await espera(20);
      p.kill('SIGTERM');
      const { status, sig } = await estado.fim;
      assert.ok(status !== 0 || sig, `terminou com status 0 depois do SIGTERM: ${estado.saida}`);
      assert.equal(chamadas(raiz), 1, 'fez outra tentativa depois do sinal');
      assert.ok(!fs.existsSync(out));
      assert.deepEqual(lixoDe(raiz), []);
    });

    tsh(sh, 'Ctrl-C (SIGINT no grupo inteiro) durante o gen types -> para na hora, sem "nova tentativa"', async () => {
      const raiz = arvore();
      const out = path.join(raiz, 'saida/t.ts');
      const { p, estado } = iniciar(raiz, sh, out, { SUPABASE_DB_URL: URL_FALSA, FAKE_SUPABASE: 'dorme,ok', FAKE_SLEEP: '20', GEN_TYPES_RETRY_DELAY_S: '1' }, { detached: true });
      for (let i = 0; i < 100 && !fs.existsSync(path.join(raiz, 'fake/chamadas')); i += 1) await espera(30);
      await espera(150);
      process.kill(-p.pid, 'SIGINT'); // o terminal manda o SIGINT para o grupo: shell e supabase
      const { status, sig } = await estado.fim;
      assert.ok(status !== 0 || sig, `terminou com status 0 depois do Ctrl-C: ${estado.saida}`);
      assert.equal(chamadas(raiz), 1, `fez outra tentativa depois do Ctrl-C: ${estado.saida}`);
      assert.ok(!/nova tentativa/.test(estado.saida), estado.saida);
      assert.ok(!fs.existsSync(out));
      assert.deepEqual(lixoDe(raiz), []);
    });
  });
}

// ---------------- caminho do proxy ----------------
for (const sh of SHELLS) {
  // pgbouncer REAL -> Postgres efemero com TLS (opt-in; ver pg.mjs)
  test(`[${sh}] proxy ponta a ponta: pgbouncer real -> Postgres local (TLS verify-full, senha com ' \\ = # ; : % / ? e acento)`, { skip: skipProxyReal(sh) }, () => {
    const raiz = arvore({ ca: pg.caCrt });
    const out = path.join(raiz, 'saida/t.ts');
    const url = pg.urlTipos();
    // PGSSLMODE=verify-full no ambiente, como o workflow deixa depois do passo "Exigir credencial"
    const r = gen(raiz, sh, [out], { proxy: 'real', env: { SUPABASE_DB_URL: url, FAKE_SUPABASE: 'psql', CI: 'true', PGSSLMODE: 'verify-full' } });
    assert.equal(r.status, 0, r.saida.replaceAll(SENHA_TIPOS, '<<VAZOU>>'));
    assert.match(fs.readFileSync(out, 'utf8'), /\/\/ conectado como tipos@inv_ok\n$/, 'conectou no banco real pelo proxy com a credencial real');
    assert.equal(r.argv.length, 1);
    assert.match(r.argv[0], /^gen types typescript --db-url postgresql:\/\/proxy:proxy@127\.0\.0\.1:\d+\/proxydb\?sslmode=disable --network-id host --schema public$/);
    for (const proibido of [SENHA_TIPOS, encodeURIComponent(SENHA_TIPOS), 'tipos:', `localhost:${pg.porta}`]) {
      assert.ok(!r.argv[0].includes(proibido) && !r.saida.includes(proibido), `vazou: ${proibido === SENHA_TIPOS ? 'senha' : proibido}`);
    }
    assert.ok(!/pgbouncer|LOG |listening/.test(r.saida.replace(/Aviso.*\n/g, '')), 'log do pgbouncer nao pode ir para a saida do job');
    assert.deepEqual(r.lixo, [], 'PROXY_DIR e temporarios removidos');
    assert.deepEqual(pgbouncersVivos(raiz), [], 'pgbouncer encerrado');
  });

  test(`[${sh}] proxy: senha errada no destino -> gen types falha 3x, exit 1, limpeza completa, sem vazar`, { skip: skipProxyReal(sh) }, () => {
    const raiz = arvore({ ca: pg.caCrt });
    const errada = pg.urlTipos().replace(/:[^:@/]+@localhost/, ':senha-errada-123@localhost');
    // PGCONNECT_TIMEOUT: o psql do supabase de mentira desiste em 3 s em vez de esperar o pgbouncer repetir o login
    const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')], { proxy: 'real', env: { SUPABASE_DB_URL: errada, FAKE_SUPABASE: 'psql', CI: 'true', PGCONNECT_TIMEOUT: '3' } });
    assert.equal(r.status, 1, r.saida);
    assert.equal(r.argv.length, 3);
    assert.ok(!r.saida.includes('senha-errada-123'));
    assert.deepEqual(r.lixo, []);
    assert.deepEqual(pgbouncersVivos(raiz), []);
  });

  // daqui para baixo: pgbouncer/pg_isready de MENTIRA, roda sempre
  tsh(sh, 'proxy: URL invalida/TLS rebaixado -> exit != 0 antes de subir pgbouncer; limpeza; sem vazar', () => {
    const raiz = arvore();
    for (const u of [`${URL_FALSA}?sslmode=disable`, 'lixo S3nh4-Sup3r-S3cr3t4', 'postgresql://u:S3nh4-Sup3r-S3cr3t4%ZZ@h/d']) {
      const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')], { proxy: 'stub', env: { SUPABASE_DB_URL: u, CI: 'true' } });
      assert.notEqual(r.status, 0);
      assert.deepEqual(r.argv, []);
      assert.ok(!fs.existsSync(path.join(raiz, 'fake/pgbouncer-iniciou')), 'o pgbouncer nao pode ter sido iniciado');
      assert.ok(!r.saida.includes('S3nh4-Sup3r-S3cr3t4'));
      assert.deepEqual(r.lixo, []);
    }
  });

  tsh(sh, 'proxy: pgbouncer que morre na partida -> "nao subiu a tempo", exit 1, limpeza', () => {
    const raiz = arvore();
    const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')], { proxy: 'stub', env: { SUPABASE_DB_URL: URL_FALSA, CI: 'true', SLEEP_ESCALA: '20' } });
    assert.equal(r.status, 1, r.saida);
    assert.match(r.stderr, /proxy local \(pgbouncer\) nao subiu a tempo/);
    assert.ok(fs.existsSync(path.join(raiz, 'fake/pgbouncer-iniciou')), 'o pgbouncer de mentira chegou a ser chamado');
    assert.ok(!r.saida.includes('segredo'), 'a saida do pgbouncer fica no PROXY_DIR');
    assert.deepEqual(r.argv, []);
    assert.deepEqual(r.lixo, []);
  });

  tsh(sh, 'proxy: pg_isready ausente -> a mensagem diz que falta o pg_isready (nao "pgbouncer nao subiu")', () => {
    const raiz = arvore();
    const bin = pastaNova('bin-semready');
    fs.chmodSync(bin, 0o755);
    escreverExe(bin, 'pgbouncer', '#!/bin/sh\nexec sleep 30\n');
    const r = gen(raiz, sh, [path.join(raiz, 'saida/t.ts')], { path: [FAKE, bin, BASE], env: { SUPABASE_DB_URL: URL_FALSA, CI: 'true' } });
    assert.equal(r.status, 1, r.saida);
    assert.match(r.stderr, /pg_isready/);
    assert.deepEqual(r.lixo, []);
  });
}

// ---------------- install-*.sh ----------------
const FONTE_APT = fs.existsSync('/etc/apt/sources.list.d/ubuntu.sources') || fs.existsSync('/etc/apt/sources.list');
for (const [script, ferramenta, pacote] of [['scripts/types-sync/install-pgbouncer.sh', 'pgbouncer', 'pgbouncer'], ['scripts/types-sync/install-postgresql-client.sh', 'psql', 'postgresql-client']]) {
  const SKIP_INSTALL = requer(FERRAMENTAS.bash, 'bash ausente no PATH') || requer(acha('chmod'), 'chmod ausente no PATH')
    || requer(FONTE_APT, 'host sem /etc/apt/sources.list(.d/ubuntu.sources): o script sai antes de chamar o apt');
  const montar = ({ instalaDeVerdade }) => {
    const raiz = repoFalso({}, { scripts: [script], nome: 'inst' });
    const bin = path.join(raiz, 'bin'); fs.mkdirSync(bin);
    const base2 = path.join(raiz, 'base'); fs.mkdirSync(base2);
    for (const t of ['printf', 'cat', 'chmod', 'env']) if (acha(t)) fs.symlinkSync(acha(t), path.join(base2, t));
    fs.symlinkSync(FERRAMENTAS.bash, path.join(base2, 'bash'));
    fs.writeFileSync(path.join(bin, 'sudo'), '#!/bin/bash\nprintf "sudo %s\\n" "$*" >> "$LOG"\nexec "$@"\n', { mode: 0o755 });
    fs.writeFileSync(path.join(bin, 'apt-get'), `#!/bin/bash\nprintf '%s\\n' "$*" >> "$LOG"\ncase "$*" in *" install "*) ${instalaDeVerdade ? `printf '#!/bin/bash\\necho "${ferramenta} 9.9 (fake)"\\n' > "$BIN/${ferramenta}"; chmod +x "$BIN/${ferramenta}"` : ':'} ;; esac\nexit "\${APT_EXIT:-0}"\n`, { mode: 0o755 });
    return { raiz, env: { PATH: `${bin}:${base2}`, LOG: path.join(raiz, 'log'), BIN: bin } };
  };
  test(`${path.basename(script)}: instala so dos repositorios oficiais do Ubuntu e confere que o binario apareceu`, { skip: SKIP_INSTALL }, () => {
    const { raiz, env } = montar({ instalaDeVerdade: true });
    const r = rodar(FERRAMENTAS.bash, [script], { cwd: raiz, env });
    assert.equal(r.status, 0, r.saida);
    assert.match(r.stdout, new RegExp(`${ferramenta} 9\\.9 \\(fake\\)`));
    const log = fs.readFileSync(env.LOG, 'utf8').trim().split('\n').filter((l) => !l.startsWith('sudo '));
    const fonte = fs.existsSync('/etc/apt/sources.list.d/ubuntu.sources') ? 'sources.list.d/ubuntu.sources' : 'sources.list';
    const opcoes = `-o Dir::Etc::sourcelist=${fonte} -o Dir::Etc::sourceparts=- -o APT::Get::List-Cleanup=0 -o Acquire::Retries=3`;
    assert.deepEqual(log, [`${opcoes} update -qq`, `${opcoes} install -y -qq --no-install-recommends ${pacote}`]);
  });
  test(`${path.basename(script)}: ja instalado -> nao chama apt; apt falha -> exit != 0; apt "ok" mas binario ausente -> exit 1`, { skip: SKIP_INSTALL }, () => {
    let { raiz, env } = montar({ instalaDeVerdade: false });
    fs.writeFileSync(path.join(env.BIN, ferramenta), `#!/bin/bash\necho "${ferramenta} 1.0"\n`, { mode: 0o755 });
    let r = rodar(FERRAMENTAS.bash, [script], { cwd: raiz, env });
    assert.equal(r.status, 0, r.saida);
    assert.ok(!fs.existsSync(env.LOG), 'apt nao pode ser chamado');
    ({ raiz, env } = montar({ instalaDeVerdade: false }));
    r = rodar(FERRAMENTAS.bash, [script], { cwd: raiz, env: { ...env, APT_EXIT: '100' } });
    assert.equal(r.status, 100, r.saida);
    assert.equal(fs.readFileSync(env.LOG, 'utf8').split('\n').filter((l) => / install /.test(l) && !l.startsWith('sudo')).length, 0, 'update falhou: nao segue para o install');
    ({ raiz, env } = montar({ instalaDeVerdade: false }));
    r = rodar(FERRAMENTAS.bash, [script], { cwd: raiz, env });
    assert.equal(r.status, 1, r.saida);
    assert.match(r.stderr, new RegExp(`ERRO: ${ferramenta} continuou ausente apos a instalacao`));
  });
}
