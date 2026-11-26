// scripts/types-sync/local-pg-proxy.mjs <diretorio-temporario-0700>
//
// Escreve a config de um pgbouncer LOCAL (bind 127.0.0.1) que repassa para o
// SUPABASE_DB_URL real, com TLS verify-full + CA Supabase pinada no trecho
// pgbouncer->producao. A credencial real fica apenas no arquivo pgbouncer.ini
// (modo 0600, dentro de um diretorio 0700); o --db-url que o chamador
// (gen-types.sh) passa ao `supabase` CLI usa uma credencial descartavel que
// nunca aponta pra producao.
//
// Motivo: `supabase gen types typescript --db-url` nao usa libpq — ele sobe um
// container Docker (postgres-meta) que recebe a --db-url em texto puro e
// conecta a ela diretamente, usando a rede do host. Sem esse proxy, a
// credencial de producao fica visivel via /proc a qualquer processo irmao no
// mesmo job (ex.: uma dependencia comprometida instalada por `bun install`
// mais adiante no mesmo workflow).
//
// Portado de Zapp_Web_V2/scripts/db-audit/local-pg-proxy.mjs. Diferencas:
// le SUPABASE_DB_URL (nao DESTINO_URL) e traz a guarda de caminho inline, em
// vez de importar scripts/lib/seguranca-processo.mjs.
//
// Imprime no stdout, sozinha, a porta local escolhida.
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  endurecerDestinoTls,
  parseConnection,
  SUPABASE_CA_PATH,
} from './identidade-banco.mjs';

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZES_PERMITIDAS = [RAIZ_REPO, path.resolve(os.tmpdir()), path.resolve('/tmp')];

function estaDentro(raiz, candidato) {
  const relativo = path.relative(raiz, candidato);
  return relativo === '' || (!relativo.startsWith('..') && !path.isAbsolute(relativo));
}

// O diretorio do proxy vem do argumento; nunca entra cru num fs.*.
// Fail-closed: fora das raizes permitidas encerra com exit 2 (mesmo codigo do
// uso invalido) antes de qualquer socket.
const proxyDirArg = process.argv[2];
if (!proxyDirArg) {
  console.error('uso: local-pg-proxy.mjs <diretorio-temporario-0700>');
  process.exit(2);
}
const proxyDir = path.resolve(proxyDirArg);
if (!RAIZES_PERMITIDAS.some((raiz) => estaDentro(raiz, proxyDir))) {
  console.error('ERRO: diretorio do proxy fora das raizes permitidas (repositorio ou temporario do sistema)');
  process.exit(2);
}

const destino = process.env.SUPABASE_DB_URL;
if (!destino) {
  console.error('Erro: SUPABASE_DB_URL nao definida no ambiente.');
  process.exit(1);
}

const tls = endurecerDestinoTls(destino);
if (tls.erros.length) {
  for (const erro of tls.erros) console.error('ERRO: ' + erro);
  process.exit(1);
}

const { fields, password } = parseConnection(tls.connectionString);

function escapeIniValue(value) {
  // Formato "connstring" da secao [databases] do pgbouncer.ini: NAO e
  // libpq-style apesar do que a doc do pgbouncer sugere.
  //   - barra invertida (\) NAO tem significado especial — nunca deve ser escapada.
  //   - espaco fora de aspas termina o valor (delimitador); dentro de aspas
  //     simples, passa liso.
  //   - aspa simples (') e o UNICO caractere que precisa de tratamento: dentro
  //     de um valor entre aspas simples, ela e representada dobrando-a ('' -> '),
  //     estilo string SQL (\' quebra o parser).
  if (/[\s']/.test(value)) {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const port = await freePort();
const caPath = path.resolve(RAIZ_REPO, SUPABASE_CA_PATH);

const iniLines = [
  '[databases]',
  `proxydb = host=${escapeIniValue(fields.PGHOST)} port=${escapeIniValue(fields.PGPORT)} `
    + `dbname=${escapeIniValue(fields.PGDATABASE)} user=${escapeIniValue(fields.PGUSER)} `
    + `password=${escapeIniValue(password)}`,
  '',
  '[pgbouncer]',
  'listen_addr = 127.0.0.1',
  `listen_port = ${port}`,
  'unix_socket_dir =',
  'auth_type = trust',
  `auth_file = ${path.join(proxyDir, 'userlist.txt')}`,
  `logfile = ${path.join(proxyDir, 'pgbouncer.log')}`,
  `pidfile = ${path.join(proxyDir, 'pgbouncer.pid')}`,
  'pool_mode = session',
  'max_client_conn = 10',
  'default_pool_size = 5',
  // O default do pgbouncer e 15s. Com o banco sob saturacao transitoria o
  // handshake demora e o pgbouncer desistia antes do cliente postgres-meta,
  // que reportava "timeout exceeded when trying to connect". 60s da folga.
  // NAO substitui o retry do gen-types.sh: o cliente postgres-meta tem
  // timeout proprio (~15-20s).
  'server_connect_timeout = 60',
  'server_tls_sslmode = verify-full',
  `server_tls_ca_file = ${caPath}`,
  '',
].join('\n');

fs.writeFileSync(path.join(proxyDir, 'userlist.txt'), '"proxy" "unused"\n', { mode: 0o600 });
fs.writeFileSync(path.join(proxyDir, 'pgbouncer.ini'), iniLines, { mode: 0o600 });

console.log(String(port));
