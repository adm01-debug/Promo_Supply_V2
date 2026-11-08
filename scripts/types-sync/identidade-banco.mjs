// scripts/types-sync/identidade-banco.mjs
//
// Identidade do banco + endurecimento de TLS, sem nunca exibir a credencial.
//
// Portado de Zapp_Web_V2/scripts/db-audit/database-identity.mjs, com UMA
// diferença deliberada: lá a identidade esperada vem de um arquivo versionado
// (database-identity.json) com o SHA-256 do project-ref. Aqui esse arquivo não
// existe, então o project-ref esperado vem do secret VITE_SUPABASE_PROJECT_ID
// — que é o mesmo valor que o front usa em runtime. Isso evita chumbar o ref
// no repositório (há divergência entre supabase/config.toml e .env; ver o
// cabeçalho de .github/workflows/types-sync.yml).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/** Caminho RELATIVO à raiz do repositório: entra literal na connection string. */
export const SUPABASE_CA_PATH = 'scripts/types-sync/certs/supabase-prod-ca-2021.crt';
export const SUPABASE_CA_FILE_SHA256 =
  '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
export const SUPABASE_CA_FINGERPRINT256 =
  '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA';

const PROJECT_REF = /^[a-z0-9]{20}$/;

/**
 * A CA versionada precisa ser exatamente a que foi pinada. Sem isso,
 * `sslmode=verify-full` passa a confiar em qualquer coisa que alguém troque
 * no arquivo, e o verify-full deixa de provar o endpoint.
 */
export function validarSupabaseCa(arquivo = path.join(AQUI, 'certs', 'supabase-prod-ca-2021.crt')) {
  try {
    const pem = fs.readFileSync(arquivo);
    const hash = crypto.createHash('sha256').update(pem).digest('hex');
    const certificado = new crypto.X509Certificate(pem);
    const valida = hash === SUPABASE_CA_FILE_SHA256
      && certificado.fingerprint256 === SUPABASE_CA_FINGERPRINT256
      && certificado.ca
      && certificado.subject === certificado.issuer
      && /CN=Supabase Root 2021 CA/.test(certificado.subject);
    return valida ? [] : ['CA Supabase versionada diverge do fingerprint pinado'];
  } catch {
    return ['CA Supabase versionada ausente ou invalida'];
  }
}

/**
 * Extrai o project-ref sem registrar URL, usuario ou senha.
 *
 * Supabase Cloud usa duas formas comuns de conexao:
 *   - host direto: db.<project-ref>.supabase.co
 *   - pooler: usuario postgres.<project-ref>@*.pooler.supabase.com
 */
export function extrairProjectRef(connectionString) {
  if (!connectionString) return null;

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    return null;
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return null;

  const hostDireto = url.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/i);
  if (hostDireto && PROJECT_REF.test(hostDireto[1].toLowerCase())) {
    return hostDireto[1].toLowerCase();
  }

  let usuario = '';
  try {
    usuario = decodeURIComponent(url.username);
  } catch {
    return null;
  }
  const usuarioPooler = usuario.match(/^postgres\.([a-z0-9]{20})$/i);
  if (
    usuarioPooler
    && PROJECT_REF.test(usuarioPooler[1].toLowerCase())
    && /(^|\.)pooler\.supabase\.com$/i.test(url.hostname)
  ) {
    return usuarioPooler[1].toLowerCase();
  }

  return null;
}

/**
 * Confere que a credencial aponta para o projeto esperado.
 * `refEsperado` vazio => identidade NAO comprovada (aviso, nao erro): o secret
 * VITE_SUPABASE_PROJECT_ID pode nao estar configurado.
 */
export function validarDestino(connectionString, refEsperado) {
  if (!connectionString) {
    return { erros: ['SUPABASE_DB_URL ausente; nao foi possivel provar a identidade do banco'], avisos: [] };
  }

  const erros = [];
  const avisos = [];
  const projectRef = extrairProjectRef(connectionString);
  if (!projectRef) {
    erros.push('SUPABASE_DB_URL nao identifica um projeto Supabase Cloud suportado (esperado db.<ref>.supabase.co ou postgres.<ref>@*.pooler.supabase.com)');
    return { erros, avisos };
  }

  const esperado = (refEsperado || '').trim().toLowerCase();
  if (!esperado) {
    avisos.push('VITE_SUPABASE_PROJECT_ID nao configurado: identidade do projeto NAO comprovada (apenas o formato da URL foi validado)');
  } else if (!PROJECT_REF.test(esperado)) {
    erros.push('VITE_SUPABASE_PROJECT_ID nao tem o formato de um project-ref Supabase (20 caracteres a-z0-9)');
  } else if (esperado !== projectRef) {
    // Nem o ref esperado nem o obtido entram na mensagem: um deles vem de
    // secret e o outro da credencial.
    erros.push('SUPABASE_DB_URL aponta para outro projeto que nao o de VITE_SUPABASE_PROJECT_ID');
  }

  return { erros, avisos };
}

/**
 * Produz uma URL de conexao que nao pode degradar a verificacao TLS.
 * A credencial nunca e incluida em mensagens de erro.
 */
export function endurecerDestinoTls(connectionString) {
  if (!connectionString) {
    return { connectionString: null, erros: ['SUPABASE_DB_URL ausente; TLS nao pode ser fixado'] };
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    return {
      connectionString: null,
      erros: ['SUPABASE_DB_URL invalida; TLS nao pode ser fixado e a credencial nao foi exibida'],
    };
  }

  const sslmode = url.searchParams.get('sslmode');
  if (sslmode !== null && sslmode !== 'verify-full') {
    return {
      connectionString: null,
      erros: ['SUPABASE_DB_URL tenta reduzir sslmode; apenas verify-full e permitido'],
    };
  }

  const sslrootcert = url.searchParams.get('sslrootcert');
  if (sslrootcert !== null && sslrootcert !== SUPABASE_CA_PATH) {
    return {
      connectionString: null,
      erros: ['SUPABASE_DB_URL tenta substituir a CA Supabase pinada; sslrootcert divergente'],
    };
  }

  url.searchParams.set('sslmode', 'verify-full');
  url.searchParams.set('sslrootcert', SUPABASE_CA_PATH);
  return { connectionString: url.toString(), erros: [] };
}

/**
 * Decompoe a connection string nos campos que o pgbouncer precisa, recusando
 * o que nao for suportado. Portado de scripts/db-audit/psql-environment.mjs
 * (apenas parseConnection; o transporte via PGPASSFILE nao e usado aqui).
 */
export function parseConnection(connectionString) {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !host || !user || !database
      || url.hash || [host, user, password, database].some((value) => /[\r\n\0]/.test(value))) {
      throw new Error();
    }
    return {
      fields: {
        PGHOST: host,
        PGPORT: url.port || '5432',
        PGUSER: user,
        PGDATABASE: database,
      },
      password,
    };
  } catch {
    throw new Error('Parametros de conexao PostgreSQL invalidos ou nao suportados (detalhes omitidos)');
  }
}
