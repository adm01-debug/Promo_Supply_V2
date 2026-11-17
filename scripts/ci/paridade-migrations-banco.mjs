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
// Uso: node scripts/ci/paridade-migrations-banco.mjs --banco <arquivo.json> [--json]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
export function aplicarMigration(estado, sqlBruto) {
  const sql = limparSql(sqlBruto);

  const add = (tipo, nome) => { if (nome) estado[tipo].add(nome); };
  const del = (tipo, nome) => { if (nome) estado[tipo].delete(nome); };

  for (const m of casar(sql, `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) add('tabelas', nomeDe(m, 2));
  }
  for (const m of casar(sql, `drop\\s+table\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) del('tabelas', nomeDe(m, 2));
  }
  for (const m of casar(sql, `alter\\s+table\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}\\s+rename\\s+to\\s+${NOME}`)) {
    if (!ehPublic(m[1])) continue;
    del('tabelas', nomeDe(m, 2));
    add('tabelas', nomeDe(m, 4));
  }

  for (const m of casar(sql, `create\\s+(?:or\\s+replace\\s+)?(?:materialized\\s+)?view\\s+(?:if\\s+not\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (!ehPublic(m[1])) continue;
    const materializada = /materialized/i.test(m[0]);
    add(materializada ? 'matviews' : 'views', nomeDe(m, 2));
  }
  for (const m of casar(sql, `drop\\s+(?:materialized\\s+)?view\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (!ehPublic(m[1])) continue;
    del('views', nomeDe(m, 2));
    del('matviews', nomeDe(m, 2));
  }

  for (const m of casar(sql, `create\\s+(?:or\\s+replace\\s+)?function\\s+${PREFIXO}${NOME}\\s*\\(`)) {
    if (ehPublic(m[1])) add('funcoes', nomeDe(m, 2));
  }
  for (const m of casar(sql, `drop\\s+function\\s+(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) del('funcoes', nomeDe(m, 2));
  }

  // O nome do indice nao carrega schema: quem decide o schema e' a tabela do ON.
  for (const m of casar(sql, `create\\s+(?:unique\\s+)?index\\s+(?:concurrently\\s+)?(?:if\\s+not\\s+exists\\s+)?${NOME}\\s+on\\s+(?:only\\s+)?${PREFIXO}`)) {
    if (ehPublic(m[3])) add('indices', nomeDe(m, 1));
  }
  for (const m of casar(sql, `drop\\s+index\\s+(?:concurrently\\s+)?(?:if\\s+exists\\s+)?${PREFIXO}${NOME}`)) {
    if (ehPublic(m[1])) del('indices', nomeDe(m, 2));
  }

  for (const m of casar(sql, `create\\s+(?:or\\s+replace\\s+)?(?:constraint\\s+)?trigger\\s+${NOME}`)) {
    add('triggers', nomeDe(m, 1));
  }
  for (const m of casar(sql, `drop\\s+trigger\\s+(?:if\\s+exists\\s+)?${NOME}`)) {
    del('triggers', nomeDe(m, 1));
  }

  for (const m of casar(sql, `create\\s+policy\\s+${NOME}\\s+on\\s+${PREFIXO}`)) {
    if (ehPublic(m[3])) add('politicas', nomeDe(m, 1));
  }
  for (const m of casar(sql, `drop\\s+policy\\s+(?:if\\s+exists\\s+)?${NOME}\\s+on\\s+${PREFIXO}`)) {
    if (ehPublic(m[3])) del('politicas', nomeDe(m, 1));
  }

  return estado;
}

export function estadoVazio() {
  const e = {};
  for (const t of TIPOS) e[t] = new Set();
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
  const declarado = declaradoPorMigrations(lerMigrations());
  const ausentes = comparar(declarado, real, lerAllowlist());
  const total = TIPOS.reduce((acc, t) => acc + ausentes[t].length, 0);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ total, ausentes }, null, 2));
  } else {
    for (const tipo of TIPOS) {
      const n = declarado[tipo].size;
      const faltam = ausentes[tipo];
      console.log(`${tipo}: ${n} declarados, ${faltam.length} ausentes no banco`);
      for (const nome of faltam) console.log(`  - ${nome}`);
    }
    console.log(total === 0
      ? '\nOK: tudo que as migrations declaram existe no banco.'
      : `\nFALHA: ${total} objeto(s) declarado(s) nas migrations nao existem no banco.`);
  }
  return total === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(principal(process.argv.slice(2)));
}