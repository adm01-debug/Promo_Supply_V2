// SQL SOMENTE LEITURA via `psql`, para os scripts de auditoria que precisam do catálogo do Postgres.
//
// Por que existe: `scripts/rls-audit.ts` e `scripts/db-explain-analyze.ts` foram escritos para ler
// `pg_catalog` pelo PostgREST. Neste projeto isso não funciona — MEDIDO em 2026-11-09 contra
// `lmypcdfsrgfftzhxawao`: `GET /rest/v1/pg_policies` com `Accept-Profile: pg_catalog` responde
// `406 PGRST106 "Invalid schema: pg_catalog" — Only the following schemas are exposed: public,
// graphql_public`. O único caminho que enxerga política/plano sem criar função nova no banco é a
// conexão direta (`SUPABASE_DB_URL`, o mesmo secret do `types-sync.yml`).
//
// Garantias:
//   - a senha vai por `PGPASSWORD` no ambiente do filho, nunca em argv (não aparece em `ps`);
//   - o destino é conferido ANTES de conectar: só loopback (teste) ou o projeto oficial;
//   - tudo roda dentro de `BEGIN TRANSACTION READ ONLY ... ROLLBACK` com `statement_timeout`.
//     É a transação que impede escrita, não um regex sobre o SQL — vale inclusive para CTE com
//     DELETE/UPDATE e para pooler em modo transação (não depende de parâmetro de startup);
//   - nenhuma mensagem de erro carrega a senha.
//
// Importar não executa nada.

import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { extrairProjectRef, parseConnection, SUPABASE_CA_PATH } from '../types-sync/identidade-banco.mjs';
import { RAIZ_REPO, resolverExecutavel } from './seguranca-processo.mjs';

/** Projeto Supabase oficial (AGENTS.md → Banco). Qualquer outro ref é recusado. */
export const REF_OFICIAL = 'lmypcdfsrgfftzhxawao';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Converte a connection string no ambiente `PG*` do `psql`, recusando destino que não seja
 * loopback ou o projeto esperado. Lança `Error` sem credencial na mensagem.
 */
export function montarAmbientePsql(connectionString, { refEsperado = REF_OFICIAL } = {}) {
  if (!connectionString || !String(connectionString).trim()) {
    throw new Error('SUPABASE_DB_URL ausente');
  }
  const { fields, password } = parseConnection(String(connectionString).trim());
  const local = LOOPBACK.has(fields.PGHOST.toLowerCase());
  const env = { ...fields, PGCONNECT_TIMEOUT: '15', PGAPPNAME: 'promo-supply-scripts' };
  if (password) env.PGPASSWORD = password;

  if (!local) {
    const ref = extrairProjectRef(String(connectionString).trim());
    if (!ref) {
      throw new Error(
        'SUPABASE_DB_URL não identifica um projeto Supabase Cloud (esperado db.<ref>.supabase.co ou '
        + 'postgres.<ref>@*.pooler.supabase.com)',
      );
    }
    if (ref !== String(refEsperado).trim().toLowerCase()) {
      throw new Error('SUPABASE_DB_URL aponta para outro projeto que não o oficial — nada foi executado');
    }
    env.PGSSLMODE = 'verify-full';
    env.PGSSLROOTCERT = path.join(RAIZ_REPO, SUPABASE_CA_PATH);
  }

  return { env, local, mascarar: criarMascara(password) };
}

/** Devolve função que troca a senha (crua e url-encoded) por `***` em qualquer texto. */
export function criarMascara(password) {
  const segredos = [...new Set([password, encodeURIComponent(password ?? '')])].filter((s) => s && s.length >= 3);
  return (texto) => {
    let saida = String(texto ?? '');
    for (const segredo of segredos) saida = saida.split(segredo).join('***');
    return saida;
  };
}

/**
 * Recusa SQL que não seja UM comando de leitura. Defesa em profundidade: quem impede escrita de
 * verdade é a transação READ ONLY; isto só evita que um `;` feche a transação por engano.
 */
export function exigirComandoUnico(sql) {
  const limpo = String(sql ?? '').trim().replace(/;\s*$/, '').trim();
  if (!limpo) throw new Error('SQL vazio');
  if (limpo.includes(';')) throw new Error('SQL com mais de um comando (";" no meio) não é aceito');
  if (!/^(select|with|explain|show|values|table)\b/i.test(limpo)) {
    throw new Error('Somente comando de leitura (SELECT/WITH/EXPLAIN/SHOW/VALUES/TABLE) é aceito');
  }
  return limpo;
}

/**
 * Executa UM comando de leitura e devolve o stdout cru do `psql` (`-A -t`: sem cabeçalho/moldura).
 * Lança `Error` (sem senha) se o `psql` não existir, não conectar, estourar o tempo ou o SQL falhar.
 */
export function executarSqlLeitura(sql, ambiente, { timeoutMs = 90_000, statementTimeoutMs = 30_000 } = {}) {
  const comando = exigirComandoUnico(sql);
  const limite = Number.isInteger(statementTimeoutMs) && statementTimeoutMs > 0 ? statementTimeoutMs : 30_000;
  const psql = resolverExecutavel('psql');
  const roteiro = [
    'BEGIN TRANSACTION READ ONLY;',
    `SET LOCAL statement_timeout = ${limite};`,
    `${comando};`,
    'ROLLBACK;',
    '',
  ].join('\n');

  const resultado = spawnSync(psql, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    input: roteiro,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    // Ambiente mínimo: nada de PGSERVICE/PGHOST herdado do chamador desviando o destino já validado.
    env: { PATH: process.env.PATH ?? '', LC_ALL: 'C', ...ambiente.env },
  });

  if (resultado.error) {
    const motivo = resultado.error.code === 'ETIMEDOUT' ? `tempo esgotado (${timeoutMs} ms)` : resultado.error.code ?? 'erro';
    throw new Error(`psql não concluiu: ${motivo}`);
  }
  if (resultado.status !== 0) {
    const detalhe = ambiente.mascarar(resultado.stderr).trim().split('\n').slice(0, 6).join(' | ').slice(0, 1200);
    throw new Error(`psql saiu com código ${resultado.status ?? resultado.signal}: ${detalhe || 'sem mensagem'}`);
  }
  return resultado.stdout;
}

/** `executarSqlLeitura` + `JSON.parse`, com erro claro quando a saída não é JSON. */
export function consultarJson(sql, ambiente, opcoes) {
  const bruto = executarSqlLeitura(sql, ambiente, opcoes).trim();
  if (!bruto) throw new Error('psql não devolveu nenhuma linha (esperado um documento JSON)');
  try {
    return JSON.parse(bruto);
  } catch {
    throw new Error(`saída do psql não é JSON válido (${bruto.length} bytes)`);
  }
}
