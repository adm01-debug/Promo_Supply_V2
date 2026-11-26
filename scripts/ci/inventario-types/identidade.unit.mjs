// Cenarios de scripts/types-sync/identidade-banco.mjs, local-pg-proxy.mjs e do passo
// "Exigir credencial da Management API oficial" do types-sync.yml (o bloco run e extraido do YAML e executado).
// So node (o caso do umask 000 tambem usa bash e fica skip sem ele).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, FERRAMENTAS, acha, pastaNova, repoFalso, requer, rodar, importar } from './lib.mjs';

const ID = 'scripts/types-sync/identidade-banco.mjs';
const PROXY = 'scripts/types-sync/local-pg-proxy.mjs';
const CA = 'scripts/types-sync/certs/supabase-prod-ca-2021.crt';
const m = await importar(ID);
// Certificado descartavel (so a parte publica) de uma CA de teste qualquer: serve de "outra CA" no pin.
const CA_DE_TESTE = `-----BEGIN CERTIFICATE-----
MIIDEzCCAfugAwIBAgIUWizs65Xt3saxkSR2jPmvvB7M554wDQYJKoZIhvcNAQEL
BQAwGTEXMBUGA1UEAwwOVGVzdGUgTG9jYWwgQ0EwHhcNMjYxMTA5MjMxMDIzWhcN
MjYxMTExMjMxMDIzWjAZMRcwFQYDVQQDDA5UZXN0ZSBMb2NhbCBDQTCCASIwDQYJ
KoZIhvcNAQEBBQADggEPADCCAQoCggEBAL5sZCDdsRbV+D6Z2JjGqPdqv6GRczaV
JY4beN8GsEBII8M7mgq88Ib+OXu89Ql7yOUZgZd/RShJ3yhOUQkH0Ic9fFa+f9hn
WgCZXkGEBl2H4GXnND7Xd9aKunQyPW8H3QQQS7HK0oUlbu/rFNJ30zetsbB12OcE
bRn45bA9BRCMhA3b731jatK6djoabtGcY/mf09LIxsYJSfrlmYbYJVRmRqYif1NT
eWFxf07w8dLYeD/9V9PUrW58cCNysO/kRNIBfjwfec9Md7dMrewBiKaZw4dnNDcV
uh2HdGHpi2NE2mIvL0tbfUThOSCBcyrUZHNEqqRczGAZZgjAXeTqRn8CAwEAAaNT
MFEwHQYDVR0OBBYEFMmf0Ynkg5EjFEpitJZPiiEwDHtsMB8GA1UdIwQYMBaAFMmf
0Ynkg5EjFEpitJZPiiEwDHtsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEL
BQADggEBAKU5iVXu3c+ZEn+dJ9lVVDNOMiii613CenjBf+x6wPnt1SJPfvOAdq3B
M9JxI6QqrmejjWzr//Z3n9+YwnB2cMrJ1Nfd6N5ULu1KzaDlYPv7N7lnwSwxcrjo
IoZqjyoFXSLIkH160hDWDr3YDlqehiPk98TzQU1FHeZQjj6N5JMluZmLMUXqQ6cC
oFUhio+isD5EGngu+TOM41UKzvi5JtucnZHrA6Y3uAqg9oYALEkssnja2bHxnIlY
Z+8E2kl7p5EM3y8XYFlE7w9EnApe7mbP46Ik9QseOjuuKQHNrqzOsSEzn3+X7KUg
W5hWPcOG44/vRC55SACcbvJbrZQHKZA=
-----END CERTIFICATE-----
`;
const REF = 'abcdefghijklmnopqrst';
const OUTRO = 'zyxwvutsrqponmlkjihg';
const SENHAS = ['simples123', 'p@ss', 'a:b:c', '100%25certo', 'com espaco', "as'pas", 'barra\\invertida', 'igual=a', 'cerquilha#x', 'ponto;virgula', 'ação✓', 'bar/ra', 'inter?roga', '', "tudo junto ' \\ = # ; @ : % / ?"];
const cod = (s) => encodeURIComponent(s).replace(/'/g, '%27');
const direta = (senha, extra = '') => `postgresql://postgres:${cod(senha)}@db.${REF}.supabase.co:5432/postgres${extra}`;
const pooler = (senha, extra = '') => `postgres://postgres.${REF}:${cod(senha)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres${extra}`;

test('validarSupabaseCa: a CA versionada bate com o pin; arquivo adulterado/ausente/lixo reprova', () => {
  assert.deepEqual(m.validarSupabaseCa(), []);
  assert.deepEqual(m.validarSupabaseCa(path.join(REPO, CA)), []);
  const dir = pastaNova('ca');
  const pem = fs.readFileSync(path.join(REPO, CA), 'utf8');
  fs.writeFileSync(path.join(dir, 'crlf.crt'), pem.replace(/\n/g, '\r\n'));
  fs.writeFileSync(path.join(dir, 'lixo.crt'), 'nao e certificado');
  fs.writeFileSync(path.join(dir, 'vazio.crt'), '');
  fs.writeFileSync(path.join(dir, 'outra-ca.crt'), CA_DE_TESTE);
  assert.deepEqual(m.validarSupabaseCa(path.join(dir, 'crlf.crt')), ['CA Supabase versionada diverge do fingerprint pinado']);
  assert.deepEqual(m.validarSupabaseCa(path.join(dir, 'outra-ca.crt')), ['CA Supabase versionada diverge do fingerprint pinado']);
  assert.deepEqual(m.validarSupabaseCa(path.join(dir, 'lixo.crt')), ['CA Supabase versionada ausente ou invalida']);
  assert.deepEqual(m.validarSupabaseCa(path.join(dir, 'vazio.crt')), ['CA Supabase versionada ausente ou invalida']);
  assert.deepEqual(m.validarSupabaseCa(path.join(dir, 'nao-existe.crt')), ['CA Supabase versionada ausente ou invalida']);
});

test('extrairProjectRef: host direto e pooler, com toda senha esquisita, com e sem porta', () => {
  for (const s of SENHAS) {
    assert.equal(m.extrairProjectRef(direta(s)), REF, `direta ${s}`);
    assert.equal(m.extrairProjectRef(pooler(s)), REF, `pooler ${s}`);
  }
  assert.equal(m.extrairProjectRef(`postgresql://postgres:x@db.${REF}.supabase.co/postgres`), REF);
  assert.equal(m.extrairProjectRef(`postgresql://postgres:x@DB.${REF.toUpperCase()}.SUPABASE.CO:6543/postgres`), REF);
  assert.equal(m.extrairProjectRef(`postgresql://postgres%2E${REF}:x@aws-1-us-east-1.pooler.supabase.com/postgres`), REF);
  // o pooler aceita qualquer role com sufixo .<ref>; o CI usa um usuario dedicado de leitura
  for (const role of ['ci_snapshot', 'outro', 'leitor-ci']) {
    assert.equal(m.extrairProjectRef(`postgresql://${role}.${REF}:x@aws-1-us-west-2.pooler.supabase.com:5432/postgres`), REF, role);
  }
  assert.equal(m.extrairProjectRef(`postgresql://postgres:p@ss:w@rd@db.${REF}.supabase.co:5432/postgres`), REF, 'senha com @ e : crus');
});

test('extrairProjectRef: tudo que nao e Supabase Cloud suportado vira null', () => {
  const ruins = [
    '', null, undefined, 'nao e url', `https://db.${REF}.supabase.co/postgres`, `mysql://u:p@db.${REF}.supabase.co/x`,
    `postgresql://postgres:x@db.${REF}.supabase.co.evil.com/postgres`, `postgresql://postgres:x@evil.com/db.${REF}.supabase.co`,
    `postgresql://postgres:x@db.curto.supabase.co/postgres`, `postgresql://postgres.${REF}:x@evil.com/postgres`,
    `postgresql://postgres.${REF}:x@pooler.supabase.com.evil.com/postgres`, `postgresql://postgres.${REF}:x@xpooler.supabase.com/postgres`,
    `postgresql://semponto:x@aws.pooler.supabase.com/postgres`, 'postgresql://postgres:x@[::1]:5432/postgres',
    'postgresql://postgres:x@127.0.0.1:5432/postgres', `postgresql://postgres:pa#ss@db.${REF}.supabase.co/postgres`,
    `postgresql://postgres:pa/ss@db.${REF}.supabase.co/postgres`, `postgresql://postgres:pa?ss@db.${REF}.supabase.co/postgres`,
    `postgresql://post%ZZgres.${REF}:x@aws.pooler.supabase.com/postgres`,
  ];
  for (const r of ruins) assert.equal(m.extrairProjectRef(r), null, String(r));
});

test('validarDestino: confere, avisa, reprova — e nunca poe ref, usuario, host ou senha na mensagem', () => {
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  const url = pooler(SENHA);
  assert.deepEqual(m.validarDestino(url, REF), { erros: [], avisos: [] });
  assert.deepEqual(m.validarDestino(url, ` ${REF.toUpperCase()}\n`), { erros: [], avisos: [] });
  const semRef = m.validarDestino(url, '');
  assert.equal(semRef.erros.length, 0);
  assert.equal(semRef.avisos.length, 1);
  assert.equal(m.validarDestino(url, undefined).avisos.length, 1);
  const todos = [
    m.validarDestino(url, OUTRO), m.validarDestino(url, 'curto'), m.validarDestino('', REF), m.validarDestino(undefined, REF),
    m.validarDestino(`postgresql://u:${SENHA}@exemplo.com/db`, REF), m.validarDestino(`nao-url ${SENHA}`, REF), semRef,
  ];
  for (const r of todos.slice(0, 6)) assert.equal(r.erros.length, 1, JSON.stringify(r));
  const texto = JSON.stringify(todos);
  for (const proibido of [SENHA, REF, OUTRO, 'aws-0-sa-east-1', 'exemplo.com', `postgres.${REF}`]) assert.ok(!texto.includes(proibido), proibido);
});

test('endurecerDestinoTls: fixa verify-full + CA, e idempotente, preserva usuario/senha/host/porta/banco', () => {
  for (const s of SENHAS) {
    for (const u of [direta(s), pooler(s), direta(s, '?application_name=x'), direta(s, '?sslmode=verify-full'), direta(s, `?sslrootcert=${encodeURIComponent(m.SUPABASE_CA_PATH)}`)]) {
      const r = m.endurecerDestinoTls(u);
      assert.deepEqual(r.erros, [], u);
      const p = new URL(r.connectionString);
      assert.equal(p.searchParams.get('sslmode'), 'verify-full');
      assert.equal(p.searchParams.get('sslrootcert'), m.SUPABASE_CA_PATH);
      assert.equal(m.endurecerDestinoTls(r.connectionString).connectionString, r.connectionString, 'idempotente');
      const antes = m.parseConnection(u); const depois = m.parseConnection(r.connectionString);
      assert.deepEqual(depois, antes);
      assert.equal(depois.password, s);
      assert.ok(!/[\r\n]/.test(r.connectionString), 'vai para o GITHUB_ENV: nunca pode ter quebra de linha');
    }
  }
});

test('endurecerDestinoTls: recusa rebaixar sslmode ou trocar a CA; erro nunca carrega a credencial', () => {
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  const casos = [
    [direta(SENHA, '?sslmode=disable'), /reduzir sslmode/], [direta(SENHA, '?sslmode=require'), /reduzir sslmode/],
    [direta(SENHA, '?sslmode=verify-ca'), /reduzir sslmode/], [direta(SENHA, '?sslmode='), /reduzir sslmode/],
    [direta(SENHA, '?sslmode=disable&sslmode=verify-full'), /reduzir sslmode/],
    [direta(SENHA, '?sslrootcert=/tmp/minha-ca.crt'), /sslrootcert divergente/], [direta(SENHA, '?sslrootcert=system'), /sslrootcert divergente/],
    [`lixo ${SENHA}`, /invalida/], ['', /ausente/], [undefined, /ausente/],
  ];
  for (const [u, re] of casos) {
    const r = m.endurecerDestinoTls(u);
    assert.equal(r.connectionString, null, String(u));
    assert.match(r.erros[0], re);
    assert.ok(!JSON.stringify(r).includes(SENHA));
  }
  const dup = m.endurecerDestinoTls(direta(SENHA, '?sslmode=verify-full&sslmode=disable'));
  assert.deepEqual(new URL(dup.connectionString).searchParams.getAll('sslmode'), ['verify-full'], 'duplicata rebaixadora e removida');
});

test('parseConnection: campos, porta padrao, IPv6, usuario do pooler; recusa o que nao suporta sem detalhar', () => {
  assert.deepEqual(m.parseConnection(pooler('p@ss')), { fields: { PGHOST: 'aws-0-sa-east-1.pooler.supabase.com', PGPORT: '6543', PGUSER: `postgres.${REF}`, PGDATABASE: 'postgres' }, password: 'p@ss' });
  assert.equal(m.parseConnection(`postgresql://u:p@db.${REF}.supabase.co/postgres`).fields.PGPORT, '5432');
  assert.equal(m.parseConnection('postgresql://u:p@[2001:db8::1]:6543/meu%20banco').fields.PGHOST, '2001:db8::1');
  assert.equal(m.parseConnection('postgresql://u:p@[2001:db8::1]:6543/meu%20banco').fields.PGDATABASE, 'meu banco');
  assert.equal(m.parseConnection('postgresql://u@h/d').password, '');
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  const ruins = [`https://u:${SENHA}@h/d`, `postgresql://:${SENHA}@h/d`, `postgresql://u:${SENHA}@h/`, `postgresql://u:${SENHA}@h`, `postgresql://u:${SENHA}@h/d#frag`,
    `postgresql://u:${SENHA}%0Ax@h/d`, `postgresql://u:${SENHA}%00@h/d`, `postgresql://u%0D:${SENHA}@h/d`, `postgresql://u:${SENHA}%ZZ@h/d`, `postgresql://u:${SENHA}@h/d%0Aoutro`, `nada ${SENHA}`, '', undefined, null];
  for (const r of ruins) {
    assert.throws(() => m.parseConnection(r), (e) => /invalidos ou nao suportados/.test(e.message) && !e.message.includes(SENHA) && !String(e.stack).includes(SENHA), String(r));
  }
});

// ---------------- local-pg-proxy.mjs (CLI) ----------------
// O script so aceita diretorio dentro do repo ou do tmp do sistema; nos cenarios o "repo" e uma copia no tmp.
const arvore = () => repoFalso({}, { scripts: [ID, PROXY, CA] });
const proxy = (raiz, args, env = {}) => {
  const limpo = { ...process.env }; delete limpo.SUPABASE_DB_URL;
  return rodar(process.execPath, [path.join(raiz, PROXY), ...args], { cwd: raiz, env: { ...limpo, ...env } });
};
const lerIni = (dir) => fs.readFileSync(path.join(dir, 'pgbouncer.ini'), 'utf8');
const desescapar = (v) => (v.startsWith("'") ? v.slice(1, -1).replace(/''/g, "'") : v);
function camposDoIni(ini) {
  const linha = ini.split('\n').find((l) => l.startsWith('proxydb = ')).slice('proxydb = '.length);
  const campos = {}; // mesmo algoritmo do pgbouncer (cstr_get_pair): chave=valor; valor entre aspas simples com '' ou ate o proximo espaco
  let i = 0;
  while (i < linha.length) {
    while (linha[i] === ' ') i += 1;
    const ig = linha.indexOf('=', i); const chave = linha.slice(i, ig); i = ig + 1;
    let valor = '';
    if (linha[i] === "'") {
      i += 1;
      for (;;) { if (linha[i] === "'" && linha[i + 1] === "'") { valor += "'"; i += 2; } else if (linha[i] === "'") { i += 1; break; } else { valor += linha[i]; i += 1; } }
    } else { const fim = linha.indexOf(' ', i) < 0 ? linha.length : linha.indexOf(' ', i); valor = linha.slice(i, fim); i = fim; }
    campos[chave] = valor;
  }
  return campos;
}

test('proxy: uso invalido e diretorio fora das raizes permitidas = exit 2, antes de ler a credencial', () => {
  const raiz = arvore();
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  const env = { SUPABASE_DB_URL: pooler(SENHA) };
  // o que cair dentro do repo falso, do tmp do sistema ou de /tmp e permitido de proposito: fica fora da lista
  const permitido = (a) => a !== '' && [raiz, os.tmpdir(), '/tmp'].some((r) => {
    const rel = path.relative(r, path.resolve(raiz, a));
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
  for (const args of [[], [''], ['/etc/proxy-x'], ['/home/outro'], ['/tmp/../etc/x'], ['/var/tmp/x'], ['/'], ['../../../../../../../../../../etc']].filter((a) => a.length === 0 || !permitido(a[0]))) {
    const r = proxy(raiz, args, env);
    assert.equal(r.status, 2, `${JSON.stringify(args)} -> ${r.saida}`);
    assert.equal(r.stdout, '');
    assert.ok(!r.saida.includes(SENHA));
  }
});

test('proxy: sem SUPABASE_DB_URL = exit 1; URL que rebaixa TLS/invalida/nao suportada = exit 1; nada vaza', () => {
  const raiz = arvore();
  const dir = path.join(raiz, 'pd'); fs.mkdirSync(dir, { mode: 0o700 });
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  let r = proxy(raiz, [dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /SUPABASE_DB_URL nao definida/);
  r = proxy(raiz, [dir], { SUPABASE_DB_URL: '' });
  assert.equal(r.status, 1);
  for (const u of [direta(SENHA, '?sslmode=disable'), `lixo ${SENHA}`, `https://u:${SENHA}@h/d`, `postgresql://u:${SENHA}%ZZ@h/d`, `postgresql://u:${SENHA}@h/d#x`, `postgresql://u:${SENHA}%0Ax@h/d`]) {
    r = proxy(raiz, [dir], { SUPABASE_DB_URL: u });
    assert.equal(r.status, 1, `${u.replace(SENHA, '***')} -> ${r.saida.replace(SENHA, '<<VAZOU>>')}`);
    assert.equal(r.stdout, '', 'sem porta no stdout quando falha');
    assert.ok(!r.saida.includes(SENHA), 'senha na saida');
    assert.ok(!fs.existsSync(path.join(dir, 'pgbouncer.ini')), 'nao pode gravar ini');
  }
});

test('proxy: diretorio que nao existe = erro sem vazar', () => {
  const raiz = arvore();
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  const r = proxy(raiz, [path.join(raiz, 'nao-existe')], { SUPABASE_DB_URL: pooler(SENHA) });
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, '');
  assert.ok(!r.saida.includes(SENHA));
});

test('proxy: caminho feliz — stdout e so a porta; ini/userlist 0600 mesmo com umask 000; TLS verify-full + CA absoluta', { skip: requer(FERRAMENTAS.bash, 'bash ausente no PATH') }, () => {
  const raiz = arvore();
  const dir = path.join(raiz, 'pd'); fs.mkdirSync(dir, { mode: 0o700 });
  const SENHA = 'S3nh4-Sup3r-S3cr3t4';
  const r = rodar(FERRAMENTAS.bash, ['-c', `umask 000; exec "${process.execPath}" "${path.join(raiz, PROXY)}" pd`], { cwd: raiz, env: { ...process.env, SUPABASE_DB_URL: pooler(SENHA) } });
  assert.equal(r.status, 0, r.saida);
  assert.match(r.stdout, /^\d{4,5}\n$/);
  assert.equal(r.stderr, '');
  for (const f of ['pgbouncer.ini', 'userlist.txt']) assert.equal(fs.statSync(path.join(dir, f)).mode & 0o777, 0o600, f);
  const ini = lerIni(dir);
  assert.match(ini, new RegExp(`^listen_port = ${r.stdout.trim()}$`, 'm'));
  for (const l of ['listen_addr = 127.0.0.1', 'unix_socket_dir =', 'auth_type = trust', 'pool_mode = session', 'server_tls_sslmode = verify-full', `server_tls_ca_file = ${path.join(raiz, CA)}`, `auth_file = ${path.join(dir, 'userlist.txt')}`, `logfile = ${path.join(dir, 'pgbouncer.log')}`]) {
    assert.ok(ini.split('\n').includes(l), l);
  }
  assert.deepEqual(camposDoIni(ini), { host: 'aws-0-sa-east-1.pooler.supabase.com', port: '6543', dbname: 'postgres', user: `postgres.${REF}`, password: SENHA });
  assert.equal(fs.readFileSync(path.join(dir, 'userlist.txt'), 'utf8'), '"proxy" "unused"\n');
});

test('proxy: toda senha esquisita chega inteira ao ini (escape do connstring do pgbouncer) e nunca aparece em stdout/stderr', () => {
  const raiz = arvore();
  for (const [i, s] of SENHAS.entries()) {
    for (const [nome, url] of [['direta', direta(s)], ['pooler', pooler(s)], ['sem porta', `postgresql://postgres:${cod(s)}@db.${REF}.supabase.co/postgres`], ['ipv6', `postgresql://u:${cod(s)}@[2001:db8::1]:6543/postgres`]]) {
      const dir = path.join(raiz, `pd-${i}-${nome.replace(' ', '')}`); fs.mkdirSync(dir, { mode: 0o700 });
      const r = proxy(raiz, [dir], { SUPABASE_DB_URL: url });
      assert.equal(r.status, 0, `${nome} senha#${i}: ${r.stderr}`);
      const c = camposDoIni(lerIni(dir));
      assert.equal(c.password, s, `${nome} senha#${i}`);
      assert.equal(c.port, nome === 'sem porta' ? '5432' : (nome === 'direta' ? '5432' : '6543'));
      if (nome === 'ipv6') assert.equal(c.host, '2001:db8::1');
      if (s.length > 3) assert.ok(!r.saida.includes(s), `senha#${i} na saida`);
      assert.equal(lerIni(dir).split('\n').filter((l) => l.startsWith('proxydb')).length, 1, 'a linha do banco nao pode quebrar');
    }
  }
});

test('proxy: raiz permitida inclui o tmp do sistema (como o gen-types.sh usa: mktemp -d /tmp/pg-proxy.XXXXXX)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-proxy.cenario-'));
  try {
    const limpo = { ...process.env, SUPABASE_DB_URL: pooler('x1y2z3w4') };
    const r = rodar(process.execPath, [path.join(REPO, PROXY), dir], { cwd: REPO, env: limpo });
    assert.equal(r.status, 0, r.saida);
    assert.match(lerIni(dir), new RegExp(`server_tls_ca_file = ${path.join(REPO, CA).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}`));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------------- passo "Exigir credencial da Management API oficial" do workflow ----------------
// O bloco run do passo e extraido do YAML e executado de verdade, num repo de mentira com o
// supabase/config.toml que o cenario quiser.
const PASSO_YAML = (() => {
  const yaml = fs.readFileSync(path.join(REPO, '.github/workflows/types-sync.yml'), 'utf8').split('\n');
  const ini = yaml.findIndex((l) => l.includes('- name: Exigir credencial da Management API oficial'));
  if (ini < 0) throw new Error('passo "Exigir credencial da Management API oficial" ausente do types-sync.yml');
  const run = yaml.findIndex((l, i) => i > ini && l.trim() === 'run: |');
  if (run < 0) throw new Error('passo sem "run: |"');
  const resto = yaml.slice(run + 1);
  const depois = resto.findIndex((l) => /^ {6}- /.test(l));
  return resto.slice(0, depois < 0 ? undefined : depois).map((l) => l.replace(/^ {10}/, '')).join('\n');
})();
const SEM_BASH_PASSO = requer(FERRAMENTAS.bash, 'bash ausente no PATH');
const TOKEN_TESTE = 'sbp_t0k3n_d3_t3st3_na0_p0d3_v4z4r';

function passo({ refConfig = REF, refEsperado = REF, token = TOKEN_TESTE, evento = 'push', semConfig = false } = {}) {
  const raiz = pastaNova('cred');
  if (!semConfig) {
    fs.mkdirSync(path.join(raiz, 'supabase'), { recursive: true });
    fs.writeFileSync(path.join(raiz, 'supabase/config.toml'), 'project_id = "' + refConfig + '"\n');
  }
  const ghEnv = path.join(raiz, 'ghenv');
  fs.writeFileSync(ghEnv, '');
  const env = { ...process.env, GITHUB_ENV: ghEnv, EVENTO: evento, PROJECT_REF_ESPERADO: refEsperado };
  delete env.SUPABASE_ACCESS_TOKEN;
  if (token) env.SUPABASE_ACCESS_TOKEN = token;
  const r = rodar(FERRAMENTAS.bash, ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', PASSO_YAML], { cwd: raiz, env });
  return { ...r, ghEnv: fs.readFileSync(ghEnv, 'utf8') };
}

test('workflow/Exigir credencial: aprovado grava SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF no GITHUB_ENV e mascara o token', { skip: SEM_BASH_PASSO }, () => {
  const r = passo();
  assert.equal(r.status, 0, r.saida);
  const linhasEnv = r.ghEnv.trim().split('\n');
  assert.equal(linhasEnv.length, 2);
  assert.equal(linhasEnv[0], 'SUPABASE_ACCESS_TOKEN=' + TOKEN_TESTE);
  assert.equal(linhasEnv[1], 'SUPABASE_PROJECT_REF=' + REF);
  const saida = r.stdout.split('\n');
  assert.equal(saida[0], '::add-mask::' + TOKEN_TESTE);
  assert.match(saida[1], /^OK: identidade do projeto conferida \(abcdefghijklmnopqrst\)/);
  assert.equal(r.stdout.split(TOKEN_TESTE).length, 2, 'o token so aparece na linha do add-mask');
});

test('workflow/Exigir credencial: sem token -> SYNC_SKIPPED, verde no push e vermelho no dispatch; nada vaza', { skip: SEM_BASH_PASSO }, () => {
  const push = passo({ token: '' });
  assert.equal(push.status, 0, push.saida);
  assert.equal(push.ghEnv.trim(), 'SYNC_SKIPPED=1');
  assert.match(push.stdout, /^::warning::Secret SUPABASE_ACCESS_TOKEN nao definido/);

  const dispatch = passo({ token: '', evento: 'workflow_dispatch' });
  assert.equal(dispatch.status, 1, dispatch.saida);
  assert.equal(dispatch.ghEnv.trim(), 'SYNC_SKIPPED=1');
});

test('workflow/Exigir credencial: ref divergente, ref invalido ou config.toml ausente -> exit 1, GITHUB_ENV intacto, sem vazar', { skip: SEM_BASH_PASSO }, () => {
  const casos = [
    { refEsperado: OUTRO },
    // ref com formato invalido: o esperado acompanha para exercitar a checagem de formato
    { refConfig: 'curto', refEsperado: 'curto' },
    { refConfig: 'ABCDEFGHIJKLMNOPQRST', refEsperado: 'ABCDEFGHIJKLMNOPQRST' },
    { refConfig: '1' + REF.slice(1), refEsperado: '1' + REF.slice(1) },
    { semConfig: true },
  ];
  for (const caso of casos) {
    const r = passo(caso);
    assert.equal(r.status, 1, JSON.stringify(caso) + ': ' + r.saida.replace(TOKEN_TESTE, '<<VAZOU>>'));
    assert.equal(r.ghEnv, '', JSON.stringify(caso));
    assert.match(r.saida, /^::error::/);
    // o ref errado aparece na mensagem de erro de proposito; o token nunca pode aparecer
    assert.ok(!r.saida.includes(TOKEN_TESTE), 'token vazou');
  }
});

test('workflow/Exigir credencial: VITE_SUPABASE_PROJECT_ID ausente nao bloqueia (config.toml manda)', { skip: SEM_BASH_PASSO }, () => {
  const r = passo({ refEsperado: '' });
  assert.equal(r.status, 0, r.saida);
  assert.match(r.ghEnv, new RegExp('^SUPABASE_PROJECT_REF=' + REF + '$', 'm'));
});
