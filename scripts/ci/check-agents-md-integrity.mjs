#!/usr/bin/env node
/**
 * GA02: garante que as instrucoes para agentes nao foram apagadas ou esvaziadas por outra sessao.
 * Alvo: AGENTS.md (regras) + docs/agentes/*.md (referencia). CLAUDE.md e so `@AGENTS.md`.
 * Verifica: AGENTS.md existe, cabecalhos obrigatorios presentes, o conjunto
 * AGENTS.md + CLAUDE.md + docs/agentes/*.md nao encolheu >30% em bytes vs a base, e cada arquivo
 * vigiado (AGENTS.md e cada docs/agentes/*.md que exista na base) continua existindo com >=50% do
 * tamanho que tem na base (o limiar do conjunto sozinho nao pega o esvaziamento de 1 arquivo).
 * Base: AGENTS_MD_BASE (no CI, a main buscada; no checkout do CI o HEAD e o proprio arquivo
 * e a comparacao viraria no-op). Localmente, sem a variavel, compara com o HEAD.
 * Na base o conjunto e o que existir la.
 * Fail-closed: AGENTS_MD_BASE informada que nao resolve para um commit (ref nao buscada,
 * nome errado) reprova -- sem base nao ha comparacao, e o guard sairia OK sem ter comparado nada.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const AGENTS = 'AGENTS.md';
const DOCS_DIR = 'docs/agentes';
const CONJUNTO_RAIZ = ['AGENTS.md', 'CLAUDE.md'];
const REQUIRED_SECTIONS = [
  '## Postura',
  '## Bugs e funcionalidades',
  '## Comunicação',
  '## Fluxo Git',
  '## Banco',
  '## Serviços',
  '## Stack e comandos',
  '## Contexto gerado',
];
const SHRINK_THRESHOLD = 0.30;
const FILE_SHRINK_THRESHOLD = 0.50;

let content;
try {
  content = readFileSync(AGENTS, 'utf8');
} catch {
  console.error(`::error::${AGENTS} nao encontrado. Outra sessao pode ter apagado o arquivo.`);
  process.exitCode = 1;
  process.exit();
}

const missing = REQUIRED_SECTIONS.filter((s) => !content.includes(s));
if (missing.length > 0) {
  for (const s of missing) console.error(`::error::${AGENTS}: secao obrigatoria ausente: ${s}`);
  process.exitCode = 1;
  process.exit();
}

function bytesAtuais() {
  let total = 0;
  for (const f of CONJUNTO_RAIZ) {
    if (existsSync(f)) total += Buffer.byteLength(readFileSync(f, 'utf8'));
  }
  if (existsSync(DOCS_DIR)) {
    // Recursivo, como o `git ls-tree -r` da base: contando subpasta so de um lado, um
    // arquivo intacto em docs/agentes/<sub>/ aparecia como "encolheu".
    for (const f of readdirSync(DOCS_DIR, { recursive: true })) {
      if (f.endsWith('.md')) total += Buffer.byteLength(readFileSync(join(DOCS_DIR, f), 'utf8'));
    }
  }
  return total;
}

// Tamanho na base de cada arquivo do conjunto: { total, porArquivo: Map(path -> bytes) } ou null
// quando a base nao tem nenhum deles (ref inexistente, checkout raso sem a main).
// Sem shell: `base` vem de variavel de ambiente e os caminhos vem do repositorio. Com o
// comando montado em string, nome com espaco virava dois argumentos (o arquivo saia da
// vigilancia em silencio) e `;`/`$()` na ref eram executados.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function baseResolve(base) {
  try {
    git('rev-parse', '--verify', '--quiet', `${base}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

function bytesNaBase(base) {
  const porArquivo = new Map();
  const tamanho = (path) => {
    try {
      const out = git('cat-file', '-s', `${base}:${path}`);
      porArquivo.set(path, Number.parseInt(out.trim(), 10) || 0);
    } catch {
      /* nao existe na base */
    }
  };
  for (const f of CONJUNTO_RAIZ) tamanho(f);
  let lista = '';
  try {
    // `-z`: sem ele o git devolve nome com acento entre aspas e com escape octal
    // ("docs/agentes/comunica\303\247\303\243o.md"), que nao termina em `.md`.
    lista = git('ls-tree', '-r', '-z', '--name-only', base, '--', DOCS_DIR);
  } catch {
    lista = '';
  }
  for (const path of lista.split('\0').filter((l) => l.endsWith('.md'))) tamanho(path);
  if (porArquivo.size === 0) return null;
  let total = 0;
  for (const n of porArquivo.values()) total += n;
  return { total, porArquivo };
}

const BASE = process.env.AGENTS_MD_BASE || 'HEAD';
if (process.env.AGENTS_MD_BASE && !baseResolve(BASE)) {
  console.error(`::error::AGENTS_MD_BASE=${BASE} nao resolve para um commit deste repositorio (ref nao buscada ou nome errado). Sem base nao ha comparacao; o guard nao pode se declarar OK.`);
  process.exitCode = 1;
  process.exit();
}
const atual = bytesAtuais();
const base = bytesNaBase(BASE);

if (base) {
  const ratio = atual / base.total;
  if (ratio < (1 - SHRINK_THRESHOLD)) {
    console.error(`::error::Instrucoes para agentes (AGENTS.md + CLAUDE.md + ${DOCS_DIR}/*.md) encolheram ${Math.round((1 - ratio) * 100)}% vs ${BASE} (atual: ${atual} bytes, base: ${base.total} bytes). Possivel wipe por sessao paralela.`);
    process.exitCode = 1;
    process.exit();
  }
  // Por arquivo: AGENTS.md e cada docs/agentes/*.md que exista na base precisa continuar existindo
  // com >= 50% do tamanho de la. CLAUDE.md fica de fora: e so `@AGENTS.md` por design.
  let falhas = 0;
  for (const [path, naBase] of base.porArquivo) {
    if (path === 'CLAUDE.md' || naBase === 0) continue;
    if (!existsSync(path)) {
      console.error(`::error::${path} existia em ${BASE} (${naBase} bytes) e sumiu. Possivel wipe por sessao paralela.`);
      falhas += 1;
      continue;
    }
    const agora = Buffer.byteLength(readFileSync(path, 'utf8'));
    if (agora < naBase * FILE_SHRINK_THRESHOLD) {
      console.error(`::error::${path} encolheu ${Math.round((1 - agora / naBase) * 100)}% vs ${BASE} (atual: ${agora} bytes, base: ${naBase} bytes); limite por arquivo e ${Math.round(FILE_SHRINK_THRESHOLD * 100)}%.`);
      falhas += 1;
    }
  }
  if (falhas > 0) {
    process.exitCode = 1;
    process.exit();
  }
}

console.log(`${AGENTS} OK: ${REQUIRED_SECTIONS.length} secoes presentes; conjunto com ${DOCS_DIR}/: ${atual} bytes${base ? ` (base ${BASE}: ${base.total} bytes em ${base.porArquivo.size} arquivos, cada um >= ${Math.round(FILE_SHRINK_THRESHOLD * 100)}% do tamanho na base)` : ` (SEM comparacao de tamanho: ${BASE} nao tem nenhum destes arquivos)`}.`);
