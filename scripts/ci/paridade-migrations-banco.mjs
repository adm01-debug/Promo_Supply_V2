#!/usr/bin/env node
// Paridade entre o que as migrations DECLARAM e o que o banco de producao TEM.
//
// Motivo: em 17/11/2026 uma varredura manual comparando `supabase/migrations/`
// com o banco real achou 91 objetos declarados que nunca chegaram a producao
// (indices, triggers de compliance, funcoes de cron). Nada no CI olhava para
// isso porque `supabase db push` e' aplicado fora do repositorio. Este script
// transforma aquela varredura em verificacao automatica.
//
// Entrada: o JSON de uma linha produzido por paridade-migrations-banco.sql
//          (`psql "$SUPABASE_DB_URL" -tAf scripts/ci/paridade-migrations-banco.sql`).
// Saida:   lista de objetos ausentes por tipo; exit 1 se sobrar algum fora da
//          allowlist. Objeto que a migration cria e depois remove NAO e' cobrado.
//
//          Alem do schema public, confere os JOBS de `cron.job` na direcao
//          inversa: job ATIVO no banco que nenhuma migration declara via
//          cron.schedule. Motivo (JOB-07): 5 jobs de manutencao e o vigia da
//          integracao XBZ existiam so em producao porque alguem os criou a mao -
//          invisiveis ao CI e ausentes de qualquer restore. A direcao declarado
//          -> banco NAO e' cobrada para jobs: ha dezenas declarados e desligados
//          de proposito por decisao documentada (retencao, particionamento), e
//          allowlist de dezenas de nomes deixaria de ser sinal e viraria ruido.
//
// Uso: node scripts/ci/paridade-migrations-banco.mjs --banco <arquivo.json> [--json]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(fileURLToPath(import.meta.url), '../../..');
const DIR_MIGRATIONS = join(RAIZ, 'supabase', 'migrations');
const ARQ_ALLOWLIST = join(RAIZ, 'scripts', 'ci', 'paridade-migrations-banco.allowlist.json');

export const TIPOS = ['tabelas', 'views', 'matviews', 'funcoes', 'indices', 'triggers', 'politicas'];

// Corpo de funcao vem entre dollar-quotes e costuma conter `CREATE TABLE ...` em
// texto (DDL dinamico, EXECUTE format). Sem apagar o corpo antes, o parser
// contava esses nomes como objetos declarados e gerava falso positivo.
export function limparSql(sql) {
  let s = sql.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1?\$/g, ' $BODY$ ');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/--[^\n]*/g, ' ');
  return s;
}

// Para jobs NAO serve o `limparSql`: ele apaga corpos dollar-quoted, e o padrao
// antigo do repositorio agenda dentro de `DO $do$ ... $do$` com `PERFORM
// cron.schedule(...)` (ex.: 20261121225000_versiona_job_spot_sync_orders_30min.sql).
// Apagar o bloco esconderia jobs realmente declarados. Aqui saem so os comentarios.
export function semComentarios(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

// Jobs declarados por uma migration: `cron.schedule('nome', ...)` adiciona e
// `cron.unschedule('nome')` remove, na ordem textual do arquivo (o padrao
// idempotente do repositorio e' unschedule + schedule no mesmo bloco).
// Nome vindo de variavel (`cron.schedule(v_nome, ...)`) NAO casa: nao da para
// saber o texto em tempo de leitura, e inventar um nome seria pior que ignorar.
// Comparacao e' case-sensitive de proposito: pg_cron trata 'Job' e 'job' como
// jobs diferentes, entao diferenca de caixa e' divergencia real.
// O repositorio tambem agenda jobs por laco, com o nome chegando por variavel:
//   FOR r IN SELECT * FROM (VALUES ('spot-api-sync-catalog', '10 3 * * *', ...))
//   LOOP PERFORM cron.schedule(r.jobname, r.schedule, format(...)); END LOOP;   (DO $do$)
// O regex literal nao ve esses nomes, e sem isto dois jobs VIVOS e corretamente
// versionados apareceriam como "criados a mao". Resolve so' a forma que existe no
// repo: primeiro literal de cada tupla do VALUES quando o `cron.schedule` do mesmo
// arquivo recebe argumento nao-literal.
function jobsDeLaco(sql) {
  if (!/cron\s*\.\s*(?:schedule|unschedule)\s*\(\s*[A-Za-z_]/i.test(sql)) return [];
  const nomes = [];
  for (const bloco of casar(sql, `VALUES([\\s\\S]*?)LOOP`)) {
    for (const tupla of casar(bloco[1], `\\(\\s*'([^']+)'`)) nomes.push(tupla[1]);
  }
  return nomes;
}

export function aplicarJobsDeclarados(estado, sqlBruto) {
  const sql = semComentarios(sqlBruto);
  const ops = [];
  for (const m of casar(sql, `cron\\s*\\.\\s*(schedule|unschedule)\\s*\\(\\s*'([^']+)'`)) {
    ops.push({ pos: m.index, seq: ops.length, nome: m[2], remove: m[1].toLowerCase() === 'unschedule' });
  }
  ops.sort((a, b) => a.pos - b.pos || a.seq - b.seq);
  for (const op of ops) {
    if (op.remove) estado.jobs.delete(op.nome);
    else estado.jobs.add(op.nome);
  }
  for (const nome of jobsDeLaco(sql)) estado.jobs.add(nome);
}

const PREFIXO = '(?:"?([a-z0-9_]+)"?\\s*\\.\\s*)?';
const NOME = '(?:"([^"]+)"|([a-z0-9_]+))';

function* casar(sql, padrao) {
  const re = new RegExp(padrao, 'gi');
  let m;
  while ((m = re.exec(sql)) !== null) yield m;
}

// Objeto fora do schema public (auth., storage., cron., extensions.) nao e'
// responsabilidade deste repositorio e nao entra na comparacao.
function ehPublic(schema) {
  return schema === undefined || schema === null || schema.toLowerCase() === 'public';
}

// O Postgres trunca identificador em NAMEDATALEN-1 = 63 BYTES (nao caracteres).
// Sem replicar isso, toda politica de nome longo aparecia como "ausente" porque
// o banco guarda a versao cortada. MEDIDO: a politica declarada "Buyers ...
// repurchase suggestions within tenant" existe no banco como "... suggestions wi".
const LIMITE_IDENTIFICADOR = 63;
export function truncarIdentificador(nome) {
  const bytes = Buffer.from(nome, 'utf8');
  if (bytes.length <= LIMITE_IDENTIFICADOR) return nome;
  // `toString` em corte no meio de um caractere multibyte produz U+FFFD; o
  // Postgres tambem nao parte caractere, entao o resto invalido sai fora.
  return bytes.subarray(0, LIMITE_IDENTIFICADOR).toString('utf8').replace(/\uFFFD+$/u, '');
}

function nomeDe(m, i) {
  return truncarIdentificador((m[i] ?? m[i + 1] ?? '').toLowerCase());
}

// Cada migration e' aplicada em ordem cronologica sobre o mesmo estado: CREATE
// adiciona, DROP remove, ALTER ... RENAME TO move. Assim um objeto criado na
// migration de marco e removido na de maio nao e' cobrado do banco de hoje.
//
// Dentro de um arquivo a ordem que vale e' a textual (e' a ordem que o Postgres
// executa). Por isso cada operacao entra numa fila com a posicao do match e a
// fila e' aplicada no fim. Antes, todos os CREATEs eram aplicados e so depois
// todos os DROPs: no padrao idempotente do repositorio (`DROP POLICY IF EXISTS x`
// seguido de `CREATE POLICY x`) o DROP vinha depois e apagava do estado a policy
// recem-criada, que passava a nunca ser cobrada do banco. MEDIDO com o snapshot
// real: 209 policies declaradas pela logica antiga contra 313 pela logica correta.
export function aplicarMigration(estado, sqlBruto) {
  const sql = limparSql(sqlBruto);

  const ops = [];
  const add = (pos, tipo, nome) => {
    if (nome) ops.push({ pos, seq: ops.length, aplica: () => estado[tipo].add(nome) });
  };
  const del = (pos, tipo, nome) => {
    if (nome) ops.push({ pos, seq: ops.length, aplica: () => estado[tipo].delete(nome) });
  };

  for (const m of casar(sql, `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) add(m.index, 'tabelas', nomeDe(m, 2));
  }
  for (const m of casar(sql, `drop\\s+table\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) del(m.index, 'tabelas', nomeDe(m, 2));
  }
  for (const m of casar(sql, `alter\\s+table\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}\\s+rename\\s+to\\s+${NOME}`)) {
    if (!ehPublic(m[1])) continue;
    del(m.index, 'tabelas', nomeDe(m, 2));
    add(m.index, 'tabelas', nomeDe(m, 4));
  }

  for (const m of casar(sql, `create\\s+(?:or\\s+replace\\s+)?(?:materialized\\s+)?view\\s+(?:if\\s+not\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (!ehPublic(m[1])) continue;
    const materializada = /materialized/i.test(m[0]);
    add(m.index, materializada ? 'matviews' : 'views', nomeDe(m, 2));
  }
  for (const m of casar(sql, `drop\\s+(?:materialized\\s+)?view\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (!ehPublic(m[1])) continue;
    del(m.index, 'views', nomeDe(m, 2));
    del(m.index, 'matviews', nomeDe(m, 2));
  }

  for (const m of casar(sql, `create\\s+(?:or\\s+replace\\s+)?function\\s+${PREFIXO}${NOME}\\s*\\(`)) {
    if (ehPublic(m[1])) add(m.index, 'funcoes', nomeDe(m, 2));
  }
  for (const m of casar(sql, `drop\\s+function\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) del(m.index, 'funcoes', nomeDe(m, 2));
  }

  // O nome do indice nao carrega schema: quem decide o schema e' a tabela do ON.
  for (const m of casar(sql, `create\\s+(?:unique\\s+)?index\\s+(?:concurrently\\s+)?(?:if\\s+not\\s+exists\\s+)?${NOME}\\s+on\\s+(?:only\\s+)?${PREFIXO}`)) {
    if (ehPublic(m[3])) add(m.index, 'indices', nomeDe(m, 1));
  }
  for (const m of casar(sql, `drop\\s+index\\s+(?:concurrently\\s+)?(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) del(m.index, 'indices', nomeDe(m, 2));
  }

  // O nome do trigger nao carrega schema: quem decide e' a tabela do ON. Trigger
  // criado em auth.users (`on_auth_user_created`) existe no banco, mas o
  // inventario de paridade so lista o schema public - olhando so o nome ele
  // aparecia como ausente.
  for (const m of casar(sql, `create\\s+(?:or\\s+replace\\s+)?(?:constraint\\s+)?trigger\\s+${NOME}[^;]*?\\bon\\s+(?:only\\s+)?${PREFIXO}`)) {
    if (ehPublic(m[3])) add(m.index, 'triggers', nomeDe(m, 1));
  }
  for (const m of casar(sql, `drop\\s+trigger\\s+(?:if\\s+exists\\s+)?${NOME}\\s+on\\s+(?:only\\s+)?${PREFIXO}`)) {
    if (ehPublic(m[3])) del(m.index, 'triggers', nomeDe(m, 1));
  }

  for (const m of casar(sql, `create\\s+policy\\s+${NOME}\\s+on\\s+${PREFIXO}`)) {
    if (ehPublic(m[3])) add(m.index, 'politicas', nomeDe(m, 1));
  }
  for (const m of casar(sql, `drop\\s+policy\\s+(?:if\\s+exists\\s+)?${NOME}\\s+on\\s+${PREFIXO}`)) {
    if (ehPublic(m[3])) del(m.index, 'politicas', nomeDe(m, 1));
  }

  ops.sort((a, b) => a.pos - b.pos || a.seq - b.seq);
  for (const op of ops) op.aplica();
  aplicarJobsDeclarados(estado, sqlBruto);

  return estado;
}

export function estadoVazio() {
  const e = {};
  for (const t of TIPOS) e[t] = new Set();
  // `jobs` fica FORA de TIPOS de proposito: a comparacao direta (declarado mas
  // ausente no banco) nao vale para cron.job - ver `compararJobs`.
  e.jobs = new Set();
  return e;
}

export function declaradoPorMigrations(arquivos) {
  const estado = estadoVazio();
  for (const { nome, sql } of [...arquivos].sort((a, b) => a.nome.localeCompare(b.nome))) {
    aplicarMigration(estado, sql);
  }
  return estado;
}

export function comparar(declarado, real, allowlist = []) {
  const liberados = new Set(
    allowlist.map((i) => `${i.tipo}:${truncarIdentificador(String(i.nome).toLowerCase())}`),
  );
  const ausentes = {};
  for (const tipo of TIPOS) {
    const presentes = new Set((real[tipo] ?? []).map((n) => String(n).toLowerCase()));
    ausentes[tipo] = [...(declarado[tipo] ?? [])]
      .filter((n) => !presentes.has(n) && !liberados.has(`${tipo}:${n}`))
      .sort();
  }
  return ausentes;
}

// Job ATIVO no banco que nenhuma migration declara: o inverso que o incidente
// JOB-07 exigia. Job criado e depois retirado por uma migration posterior NAO
// aparece aqui - `aplicarJobsDeclarados` ja resolveu a sequencia dentro do estado.
export function compararJobs(declarado, real, allowlist = []) {
  const liberados = new Set(
    allowlist.filter((i) => i.tipo === 'jobs').map((i) => String(i.nome)),
  );
  const declarados = declarado.jobs ?? new Set();
  return [...new Set((real ?? []).map(String))]
    .filter((n) => n && !declarados.has(n) && !liberados.has(n))
    .sort();
}

export function lerMigrations(dir = DIR_MIGRATIONS) {
  return readdirSync(dir)
    .filter((n) => n.endsWith('.sql'))
    .map((nome) => ({ nome, sql: readFileSync(join(dir, nome), 'utf8') }));
}

function lerAllowlist() {
  if (!existsSync(ARQ_ALLOWLIST)) return [];
  const doc = JSON.parse(readFileSync(ARQ_ALLOWLIST, 'utf8'));
  return doc.excecoes ?? [];
}

function principal(argv) {
  const iBanco = argv.indexOf('--banco');
  if (iBanco === -1 || !argv[iBanco + 1]) {
    console.error('uso: node scripts/ci/paridade-migrations-banco.mjs --banco <arquivo.json> [--json]');
    return 2;
  }
  const bruto = readFileSync(argv[iBanco + 1], 'utf8').trim();
  if (!bruto) {
    console.error('ERRO: inventario do banco veio vazio (psql falhou?). Nao da para afirmar paridade.');
    return 2;
  }
  const real = JSON.parse(bruto);
  // Falha fechada: inventario sem `cron_jobs` significa SQL de coleta desatualizado,
  // e "nao ha jobs" nao pode ser confundido com "nao olhei os jobs".
  if (!Array.isArray(real.cron_jobs)) {
    console.error('ERRO: inventario sem a chave cron_jobs. Rode o SQL atualizado de scripts/ci/paridade-migrations-banco.sql.');
    return 2;
  }
  const allowlist = lerAllowlist();
  const declarado = declaradoPorMigrations(lerMigrations());
  const ausentes = comparar(declarado, real, allowlist);
  const jobsSemDeclaracao = compararJobs(declarado, real.cron_jobs, allowlist);
  const total = TIPOS.reduce((acc, t) => acc + ausentes[t].length, 0) + jobsSemDeclaracao.length;

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ total, ausentes, jobsSemDeclaracao }, null, 2));
  } else {
    for (const tipo of TIPOS) {
      const n = declarado[tipo].size;
      const faltam = ausentes[tipo];
      console.log(`${tipo}: ${n} declarados, ${faltam.length} ausentes no banco`);
      for (const nome of faltam) console.log(`  - ${nome}`);
    }
    console.log(`jobs: ${declarado.jobs.size} declarados nas migrations, ${real.cron_jobs.length} ativos no banco, ${jobsSemDeclaracao.length} ativos sem declaracao`);
    for (const nome of jobsSemDeclaracao) console.log(`  - ${nome}`);
    console.log(total === 0
      ? '\nOK: tudo que as migrations declaram existe no banco, e todo job ativo esta declarado em migration.'
      : `\nFALHA: ${total} divergencia(s) - objeto declarado ausente no banco ou job ativo sem declaracao nas migrations.`);
  }
  return total === 0 ? 0 : 1;
}

// `file://${process.argv[1]}` nao casa no Windows (barra invertida e drive): o
// script saia com 0 sem verificar nada, um verde falso para quem roda local.
// `pathToFileURL` monta a mesma URL que o Node usa no import.meta.url.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(principal(process.argv.slice(2)));
}