// Postgres efemero LOCAL (opt-in) para os casos que rodam o banco.sql de verdade (banco.unit.mjs) e o
// caminho pgbouncer -> Postgres do gen-types.sh (gentypes.unit.mjs).
//
// DESLIGADO por padrao: sem INVENTARIO_TEST_PG_BIN nenhum cluster sobe, nada e baixado e os casos ficam
// `skip` com o motivo. Variaveis de ambiente (todas opcionais, so lidas aqui):
//   INVENTARIO_TEST_PG_BIN     pasta com initdb, pg_ctl, postgres e psql (ex.: /usr/lib/postgresql/16/bin). LIGA o harness.
//   INVENTARIO_TEST_PG_USER    como root o Postgres recusa subir: usuario sem privilegio a usar (ex.: postgres); exige `setpriv`.
//   INVENTARIO_TEST_PGBOUNCER  caminho do pgbouncer (padrao: o do PATH); sem ele so os casos de proxy REAL ficam skip.
//   `openssl` no PATH          gera a CA e o certificado de servidor de teste (TLS verify-full); sem ele idem.
// O cluster mora em mkdtemp (os.tmpdir()), escuta so em 127.0.0.1 numa porta livre, usa auth trust e e
// parado e apagado quando o processo termina. Nunca ha conexao com banco real: o unico destino e o cluster
// que este arquivo cria.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { REPO, WORK, acha, aoSair, rodar } from './lib.mjs';

// Senha com todo caractere que costuma quebrar parser de URL/connstring (usada pelo role `tipos`).
export const SENHA_TIPOS = "S3nh@ ' \\ = # ; : % / ? ção";
const cod = (s) => encodeURIComponent(s).replace(/'/g, '%27');

// Banco de mentira com a forma minima que o banco.sql le (pg_cron e ledger simulados por tabelas).
const MONTAR_BANCO = `
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, schedule text, command text, jobname text, active boolean DEFAULT true);
CREATE TABLE cron.job_run_details (jobid bigint, runid bigserial, status text, return_message text, start_time timestamptz, end_time timestamptz);
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);

CREATE TABLE public.pedidos (id int PRIMARY KEY, nome text);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY p1 ON public.pedidos FOR SELECT USING (true);
CREATE POLICY p2 ON public.pedidos FOR INSERT WITH CHECK (true);
INSERT INTO public.pedidos SELECT g, 'n' || g FROM generate_series(1, 7) g;
CREATE TABLE public.sem_rls (id int);
CREATE TABLE public.cofre (id int);
ALTER TABLE public.cofre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofre FORCE ROW LEVEL SECURITY;
CREATE TABLE public."Tabela Estranha" (id int);
CREATE TABLE public.citada_so_no_banco (id int);
CREATE TABLE public.particionada (id int, d date) PARTITION BY RANGE (d);
CREATE TABLE public.particionada_2026 PARTITION OF public.particionada FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
INSERT INTO public.particionada VALUES (1, '2026-05-05');
CREATE VIEW public.v_cit AS SELECT * FROM public.citada_so_no_banco;
CREATE FUNCTION public.fn_x() RETURNS int LANGUAGE sql AS $$ SELECT count(*)::int FROM public.pedidos $$;
CREATE FUNCTION public.trg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER t1 BEFORE INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.trg();

INSERT INTO cron.job (schedule, command, jobname, active) VALUES
  ('*/5 * * * *', $c$SELECT net.http_post(url := 'https://x.supabase.co/functions/v1/y', headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijklmnop"}'::jsonb); SELECT public.fn_x();$c$, 'job-ok', true),
  ('0 3 * * *', 'CALL public.limpa ()', 'job-falhando', true),
  ('30 seconds', 'select 1', 'job-mudo', true),
  ('0 0 1 * *', 'select cron.unschedule(1)', 'job-mensal-inativo', false);
INSERT INTO cron.job_run_details (jobid, status, return_message, start_time, end_time)
  SELECT 1, 'succeeded', 'ok', now() - (g || ' hours')::interval, now() - (g || ' hours')::interval + interval '2 seconds' FROM generate_series(1, 30) g;
INSERT INTO cron.job_run_details (jobid, status, return_message, start_time, end_time)
  SELECT 2, CASE WHEN g % 2 = 0 THEN 'failed' ELSE 'succeeded' END, CASE WHEN g % 2 = 0 THEN 'job startup timeout' ELSE 'ok' END,
         now() - (g || ' days')::interval, now() - (g || ' days')::interval + interval '90 seconds' FROM generate_series(1, 6) g;
INSERT INTO cron.job_run_details (jobid, status, return_message, start_time, end_time) VALUES (1, 'succeeded', 'velho', now() - interval '30 days', now() - interval '30 days');
ANALYZE;
`;

const executavel = (p) => {
  try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; }
};
const portaLivre = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function subir() {
  const bin = process.env.INVENTARIO_TEST_PG_BIN;
  if (!bin) return { skip: 'Postgres efemero desligado (opt-in: INVENTARIO_TEST_PG_BIN=<pasta com initdb, pg_ctl, postgres e psql>)' };
  const ferr = Object.fromEntries(['initdb', 'pg_ctl', 'postgres', 'psql'].map((f) => [f, path.join(bin, f)]));
  const falta = Object.entries(ferr).find(([, p]) => !executavel(p));
  if (falta) return { skip: `INVENTARIO_TEST_PG_BIN (${bin}) sem ${falta[0]} executavel` };

  let prefixo = [];
  let prefixoCaps = [];
  let dono = null;
  if (process.getuid?.() === 0) {
    const usuario = process.env.INVENTARIO_TEST_PG_USER;
    if (!usuario) return { skip: 'processo e root e o Postgres recusa subir como root (defina INVENTARIO_TEST_PG_USER=<usuario sem privilegio>)' };
    const setpriv = acha('setpriv');
    if (!setpriv) return { skip: 'INVENTARIO_TEST_PG_USER exige setpriv no PATH' };
    const uid = rodar('id', ['-u', usuario]);
    const gid = rodar('id', ['-g', usuario]);
    if (uid.status !== 0 || gid.status !== 0) return { skip: `INVENTARIO_TEST_PG_USER=${usuario}: usuario inexistente` };
    dono = { uid: Number(uid.stdout), gid: Number(gid.stdout) };
    prefixo = [setpriv, `--reuid=${dono.uid}`, `--regid=${dono.gid}`, '--clear-groups'];
    // o repo falso mora num diretorio 0700 do root: o usuario sem privilegio so o atravessa com estas capabilities
    prefixoCaps = [...prefixo, '--inh-caps=+dac_override,+dac_read_search', '--ambient-caps=+dac_override,+dac_read_search'];
  }
  const exec = (cmd, args, opts) => (prefixo.length ? rodar(prefixo[0], [...prefixo.slice(1), cmd, ...args], opts) : rodar(cmd, args, opts));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventario-types-pg-'));
  aoSair(() => fs.rmSync(dir, { recursive: true, force: true }));
  if (dono) { fs.chmodSync(dir, 0o755); fs.chownSync(dir, dono.uid, dono.gid); }
  const data = path.join(dir, 'data');
  const porta = await portaLivre();

  // ---- TLS de teste (CA + servidor com SAN localhost/127.0.0.1) ----
  const openssl = acha('openssl');
  let tls = false;
  if (openssl) {
    const ssl = (...args) => rodar(openssl, args, { cwd: dir });
    fs.writeFileSync(path.join(dir, 'ext.cnf'), 'subjectAltName=DNS:localhost,IP:127.0.0.1\n');
    const passos = [
      ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', 'ca.key', '-out', 'ca.crt', '-subj', '/CN=inventario-types-ca', '-days', '2'],
      ['req', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', 'server.key', '-out', 'server.csr', '-subj', '/CN=localhost'],
      ['x509', '-req', '-in', 'server.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'server.crt', '-days', '2', '-extfile', 'ext.cnf'],
    ];
    tls = passos.every((a) => ssl(...a).status === 0);
    if (tls) {
      fs.chmodSync(path.join(dir, 'server.key'), 0o600);
      fs.chmodSync(path.join(dir, 'ca.crt'), 0o644);
      if (dono) for (const f of ['server.key', 'server.crt']) fs.chownSync(path.join(dir, f), dono.uid, dono.gid);
    }
  }

  const init = exec(ferr.initdb, ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C'], { timeout: 120_000 });
  if (init.status !== 0) return { skip: `FALHOU initdb (${init.saida.trim().slice(-300)})` };
  fs.appendFileSync(path.join(data, 'postgresql.conf'), [
    "listen_addresses = '127.0.0.1'", `port = ${porta}`, "unix_socket_directories = ''",
    'fsync = off', 'synchronous_commit = off', 'full_page_writes = off',
    ...(tls ? ['ssl = on', `ssl_cert_file = '${path.join(dir, 'server.crt')}'`, `ssl_key_file = '${path.join(dir, 'server.key')}'`] : []),
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(data, 'pg_hba.conf'), [
    'hostssl all tipos 127.0.0.1/32 scram-sha-256', 'hostnossl all tipos 127.0.0.1/32 reject', 'host all all 127.0.0.1/32 trust', '',
  ].join('\n'));
  const parar = () => exec(ferr.pg_ctl, ['-D', data, '-m', 'immediate', '-w', 'stop'], { timeout: 60_000 });
  const start = exec(ferr.pg_ctl, ['-D', data, '-l', path.join(dir, 'pg.log'), '-w', '-t', '60', 'start'], { timeout: 90_000 });
  if (start.status !== 0) {
    parar();
    return { skip: `FALHOU pg_ctl start (${start.saida.trim().slice(-300)})` };
  }
  aoSair(parar);

  const PSQL = ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', String(porta), '-U', 'postgres', '-At'];
  const psql = (db, input) => rodar(ferr.psql, [...PSQL, '-d', db], { input });

  // ---- bancos de teste ----
  const versoes = fs.readdirSync(path.join(REPO, 'supabase/migrations')).map((f) => /^(\d{14})_.*\.sql$/.exec(f)?.[1]).filter(Boolean);
  const etapas = [
    ['postgres', 'CREATE DATABASE inv_ok;'],
    ['inv_ok', MONTAR_BANCO],
    // o ledger espelha as migrations do repo: o gerar-banco compara as duas contagens
    ['inv_ok', `INSERT INTO supabase_migrations.schema_migrations(version) VALUES ${versoes.map((v) => `('${v}')`).join(',')};`],
    ['postgres', 'CREATE DATABASE inv_sem_ledger TEMPLATE inv_ok; CREATE DATABASE inv_ledger_vazio TEMPLATE inv_ok; CREATE DATABASE inv_regex TEMPLATE inv_ok;'],
    ['inv_sem_ledger', 'DROP SCHEMA supabase_migrations CASCADE;'],
    ['inv_ledger_vazio', 'DELETE FROM supabase_migrations.schema_migrations;'],
    ['inv_regex', 'CREATE TABLE public."a(b" (id int);'],
    ['postgres', `DROP ROLE IF EXISTS tipos; CREATE ROLE tipos LOGIN PASSWORD $pw$${SENHA_TIPOS}$pw$; GRANT CONNECT ON DATABASE inv_ok TO tipos;`],
  ];
  for (const [db, sql] of etapas) {
    const r = psql(db, sql);
    if (r.status !== 0) { parar(); return { skip: `FALHOU ao montar os bancos de teste (${r.stderr.trim().slice(-300)})` }; }
  }

  // ---- PATH com pgbouncer + pg_isready + psql do cluster (so para os casos de proxy real) ----
  const pgbouncer = process.env.INVENTARIO_TEST_PGBOUNCER || acha('pgbouncer');
  const pgIsready = executavel(path.join(bin, 'pg_isready')) ? path.join(bin, 'pg_isready') : acha('pg_isready');
  const pgbDir = path.join(WORK, 'pgb');
  fs.mkdirSync(pgbDir, { recursive: true });
  for (const [nome, alvo] of [['pgbouncer', pgbouncer], ['pg_isready', pgIsready], ['psql', ferr.psql]]) {
    if (alvo && executavel(alvo)) fs.symlinkSync(alvo, path.join(pgbDir, nome));
  }
  const proxySkip = !fs.existsSync(path.join(pgbDir, 'pgbouncer')) ? 'pgbouncer ausente (INVENTARIO_TEST_PGBOUNCER ou PATH)'
    : !fs.existsSync(path.join(pgbDir, 'pg_isready')) ? 'pg_isready ausente'
      : !tls ? 'openssl ausente ou falhou (sem CA de teste para o TLS verify-full)' : null;

  return {
    skip: null, porta, dir, proxySkip, pgbDir, prefixoCaps, psql,
    caCrt: path.join(dir, 'ca.crt'),
    urlTipos: (db = 'inv_ok') => `postgresql://tipos:${cod(SENHA_TIPOS)}@localhost:${porta}/${db}`,
  };
}

/** `{ skip: <motivo> }` quando o Postgres efemero nao esta disponivel; o objeto pronto caso contrario. */
export const pg = await subir().catch((e) => ({ skip: `FALHOU ao preparar o Postgres efemero: ${e.message}` }));
/** Roda `sql` (stdin do psql) no banco `db` do cluster efemero. So chamar com `pg.skip` falso. */
export const rodarPsql = (db, sql) => pg.psql(db, sql);
