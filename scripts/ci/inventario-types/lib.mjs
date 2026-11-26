// Apoio das suítes de scripts/ci/inventario-types/ (testam scripts/inventario/* e scripts/types-sync/*).
//
// Cada suíte monta um "repo" de mentira em um diretório temporário (mkdtemp em os.tmpdir(), removido
// quando o processo termina) e copia para dentro dele o script sob teste: vários scripts resolvem a raiz
// do repo a partir do próprio caminho, então rodá-los de dentro da árvore falsa é o que isola o teste.
// A raiz do repo REAL (REPO) só é lida — nunca escrita — e vem de import.meta.url, sem caminho fixo.
//
// Recurso externo ausente (rg, git, typescript, bash/dash, psql/Postgres, pgbouncer) vira `skip` com o
// motivo escrito; nenhuma suíte instala nem baixa nada. O que usa só node + bash + coreutils roda sempre.
// Variáveis de ambiente opcionais (todas desligadas por padrão; ver pg.mjs para as do Postgres):
//   INVENTARIO_TEST_TYPESCRIPT  pasta do pacote `typescript` (padrão: node_modules/typescript do repo)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const WORK = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'inventario-types-')));

const aoEncerrar = [];
/** Registra uma limpeza a rodar (em ordem inversa) quando o processo de teste terminar. */
export const aoSair = (fn) => { aoEncerrar.push(fn); };
process.on('exit', () => {
  for (const fn of aoEncerrar.reverse()) { try { fn(); } catch { /* limpeza best-effort */ } }
  try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* idem */ }
});
// Ctrl-C / kill do runner: sem isto o Node morre sem emitir 'exit' e o diretório temporário fica.
for (const [sinal, codigo] of [['SIGINT', 130], ['SIGTERM', 143]]) process.on(sinal, () => process.exit(codigo));

let n = 0;
/** Pasta nova e vazia dentro do diretório de trabalho. */
export function pastaNova(prefixo = 'tmp') {
  n += 1;
  return fs.mkdtempSync(path.join(WORK, `${prefixo}-${n}-`));
}

/** Caminho absoluto do executável `cmd` no PATH do processo, ou null. */
export function acha(cmd) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const p = path.join(dir, cmd);
    try {
      if (fs.statSync(p).isFile()) { fs.accessSync(p, fs.constants.X_OK); return p; }
    } catch { /* não é executável aqui */ }
  }
  return null;
}

/** Valor para a opção `skip` do node:test: false quando o recurso existe, o motivo quando falta. */
export const requer = (ok, motivo) => (ok ? false : motivo);

export function repoFalso(arquivos = {}, { scripts = [], nome = 'repo' } = {}) {
  const dir = pastaNova(nome);
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, conteudo);
  }
  for (const rel of scripts) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), abs);
  }
  return dir;
}

export function rodar(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 60_000, ...opts });
  return { status: r.status, signal: r.signal, stdout: r.stdout ?? '', stderr: r.stderr ?? '', saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

export const importar = (rel) => import(pathToFileURL(path.join(REPO, rel)).href);

/** Ambiente sem as variáveis GIT_* herdadas (um hook ou um `git rebase` em volta faria o git dos cenários olhar o repo errado). */
export const envSemGit = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

/** Pacote `typescript` utilizável (tem bin/tsc), ou null. Nunca instala nada. */
export function achaTypescript() {
  for (const dir of [process.env.INVENTARIO_TEST_TYPESCRIPT, path.join(REPO, 'node_modules', 'typescript')]) {
    if (dir && fs.existsSync(path.join(dir, 'bin', 'tsc'))) return fs.realpathSync(dir);
  }
  return null;
}

export const FERRAMENTAS = {
  rg: acha('rg'),
  git: acha('git'),
  bash: acha('bash'),
  dash: acha('dash'),
  ps: acha('ps'),
  typescript: achaTypescript(),
};
