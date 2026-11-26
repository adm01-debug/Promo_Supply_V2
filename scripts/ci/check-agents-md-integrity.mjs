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
 * Tambem afirma fatos do proprio checkout (etapa 271): numero de workflows e de migrations que o
 * AGENTS.md declara, workflow que existe e nao aparece na lista de docs/agentes/github-ci.md, e a
 * existencia de deploy de edge e de canal de apply de DDL -- as afirmacoes que mudam o que o
 * agente faz sozinho. Tudo offline; rodam sempre (nao dependem da base).
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

// Fatos verificaveis offline (etapa 264). A visibilidade do repositorio e PUBLICA e os
// documentos operacionais afirmavam "privado" em 6 linhas -- inclusive a frase que dizia
// que o `.env` estava comitado. Num repo publico esse par de mentiras convida a tratar
// segredo como seguro. A visibilidade em si nao e checavel aqui (guard offline, sem rede);
// o que este bloco afirma e a consistencia dos documentos com o fato e com o .gitignore.
// Se a visibilidade mudar, mude AGENTS.md + docs/agentes/github-ci.md e a constante
// VISIBILIDADE na MESMA PR -- e de proposito que o guard reprove a mudanca silenciosa.
export const VISIBILIDADE = 'publico';
export const ARQUIVOS_DE_VISIBILIDADE = ['AGENTS.md', 'docs/agentes/github-ci.md'];

/** Linha que afirma visibilidade contraria ao fato, ou null. */
export function linhaQueAlegaPrivado(texto) {
  const regra = /(repo|reposit[oó]rio|visibilidade)[^.\n]{0,40}privad/i;
  return texto.split('\n').find((l) => regra.test(l)) || null;
}

/** Linha de AGENTS.md que declara a visibilidade do repo, ou null. */
export function linhaDeVisibilidade(texto) {
  return texto.split('\n').find((l) => /`main`[^.\n]*p[uú]blico/i.test(l)) || null;
}

/** Lista de problemas de consistencia documental; vazia quando tudo bate. */
export function problemasDeVisibilidade({ agents, docVisibilidade, gitignore }) {
  const problemas = [];
  for (const [nome, texto] of [
    [AGENTS, agents],
    [ARQUIVOS_DE_VISIBILIDADE[1], docVisibilidade],
  ]) {
    const linha = linhaQueAlegaPrivado(texto);
    if (linha) {
      problemas.push(`${nome}: afirma que o repo e privado, mas ele e ${VISIBILIDADE}: ${linha.trim()}`);
    }
  }
  if (!linhaDeVisibilidade(agents)) {
    problemas.push(`${AGENTS}: a linha de visibilidade nao afirma que o repositorio e ${VISIBILIDADE}.`);
  }
  // AGENTS.md afirma que o `.env` nao e versionado; o fato mora no .gitignore.
  if (gitignore !== null && !/^\.env$/m.test(gitignore)) {
    problemas.push('.gitignore: `.env` nao esta ignorado, e AGENTS.md afirma que nao e versionado.');
  }
  return problemas;
}

// Fatos verificaveis offline (etapa 271). Ate aqui o guard provava que as secoes e o tamanho
// continuavam no lugar: o manual podia afirmar "Sao 7 workflows" (sao 15) ou "nenhum workflow
// publica edge" (ha um) e o guard dava OK. As afirmacoes abaixo sao as que mudam o que o agente
// faz sozinho, e todas sao checaveis no proprio checkout, sem rede.
export const WORKFLOWS_DIR = '.github/workflows';
export const MIGRATIONS_DIR = 'supabase/migrations';
export const DOC_CI = 'docs/agentes/github-ci.md';
export const TOOLCHAIN = '.github/toolchain.json';
export const WORKFLOWS_CITADOS_NO_AGENTS = ['deploy-edge-functions.yml', 'aplicar-migration-prod.yml'];

/** Nomes dos workflows (`.yml`/`.yaml`) do diretorio, ordenados; [] quando o diretorio nao existe. */
export function workflowsNoDiretorio(dir = WORKFLOWS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort();
}

/** N de workflows declarado em AGENTS.md (`Sao **15** workflows`), ou null se nao declara. */
export function workflowsAfirmados(agents) {
  const m = agents.match(/S[ãa]o\s+\*\*(\d+)\*\*\s*\n?\s*workflows/i);
  return m ? Number.parseInt(m[1], 10) : null;
}

/** N de migrations declarado em AGENTS.md (`338 migrations hoje`), ou null se nao declara. */
export function migrationsAfirmadas(agents) {
  const m = agents.match(/(\d+)\s+migrations\s+hoje/i);
  return m ? Number.parseInt(m[1], 10) : null;
}

/** Linha de um doc que afirma nao haver protecao em `main`, ou null. */
export function linhaQueNegaProtecao(texto) {
  return (
    texto
      .split('\n')
      .find((l) => /n[ãa]o h[áa]\s+(nenhuma\s+)?(branch protection|prote[çc][ãa]o)/i.test(l)) || null
  );
}

/** Problemas entre o que os docs afirmam e o que este checkout tem; vazio quando bate. */
export function problemasDeFatos({ agents, docCi, workflows, migrations, conteudosDeWorkflow = {}, toolchain = null }) {
  const problemas = [];
  const declarado = workflowsAfirmados(agents);
  if (declarado === null) {
    problemas.push(
      `${AGENTS}: nao declara o numero de workflows (esperado: "Sao **${workflows.length}** workflows").`,
    );
  } else if (declarado !== workflows.length) {
    problemas.push(
      `${AGENTS}: afirma ${declarado} workflows, mas ${WORKFLOWS_DIR} tem ${workflows.length} (${workflows.join(', ')}).`,
    );
  }
  for (const nome of workflows) {
    // A lista completa mora no doc de CI; workflow novo sem linha la fica invisivel para quem le.
    if (!docCi.includes(nome.replace(/\.ya?ml$/, ''))) {
      problemas.push(`${DOC_CI}: nao cita ${nome}; e a lista de referencia de ${WORKFLOWS_DIR}.`);
    }
  }
  for (const nome of WORKFLOWS_CITADOS_NO_AGENTS) {
    if (workflows.includes(nome) && !agents.includes(nome)) {
      problemas.push(`${AGENTS}: nao cita ${nome}, workflow que muda o que o agente pode fazer sozinho.`);
    }
  }
  // `deploy-edge-functions.yml` so muda o comportamento do agente se publicar de verdade.
  const deployEdge = conteudosDeWorkflow['deploy-edge-functions.yml'];
  if (deployEdge !== undefined && !/functions deploy/.test(deployEdge)) {
    problemas.push(
      `${WORKFLOWS_DIR}/deploy-edge-functions.yml: nao roda "functions deploy", e ${AGENTS} afirma que ele publica as edges.`,
    );
  }
  const migracoes = migrationsAfirmadas(agents);
  if (migracoes === null) {
    problemas.push(`${AGENTS}: nao declara o numero de migrations (esperado: "${migrations.length} migrations hoje").`);
  } else if (migracoes !== migrations.length) {
    problemas.push(`${AGENTS}: afirma ${migracoes} migrations, mas ${MIGRATIONS_DIR} tem ${migrations.length} arquivos .sql.`);
  }
  // A contagem tambem aparece na prosa do doc de CI, e foi la que apodreceu por ultimo
  // ("um dos sete workflows" com 15 no diretorio). So a forma em digitos e checavel aqui.
  const noDocCi = docCi.match(/`workflows\/`\s*\((\d+)\s+arquivos\)/);
  if (noDocCi && Number.parseInt(noDocCi[1], 10) !== workflows.length) {
    problemas.push(
      `${DOC_CI}: afirma ${noDocCi[1]} arquivos em ${WORKFLOWS_DIR}, mas ${WORKFLOWS_DIR} tem ${workflows.length}.`,
    );
  }
  // A nota do toolchain sobre o deno citou 'v1.x' por meses, depois de o main.yml virar v2.x
  // (o runtime das edges exige tipagem que o Deno 1.x rejeita). Comentario de versao tambem e fato.
  // A crase sai da classe: o cabecalho do main.yml cita a mesma linha entre crases.
  const deno = /deno-version:\s*['"]?([^\s'"`]+)/.exec(conteudosDeWorkflow['main.yml'] ?? '');
  if (toolchain !== null && deno && !toolchain.includes(`'${deno[1]}'`)) {
    problemas.push(
      `${TOOLCHAIN}: a nota sobre o deno nao cita a faixa de ${WORKFLOWS_DIR}/main.yml ('${deno[1]}').`,
    );
  }
  for (const [nome, texto] of [
    [AGENTS, agents],
    [DOC_CI, docCi],
  ]) {
    const linha = linhaQueNegaProtecao(texto);
    if (linha) {
      problemas.push(`${nome}: afirma que nao ha protecao em \`main\`, mas ha (check obrigatorio): ${linha.trim()}`);
    }
  }
  if (!/prote[çc][ãa]o de\s+`?main/i.test(agents)) {
    problemas.push(`${AGENTS}: nao declara que \`main\` tem protecao com check obrigatorio.`);
  }
  return problemas;
}

// Sem `docs/agentes/github-ci.md` este nao e o checkout deste projeto (a suite do guard usa
// repositorios sinteticos): nao ha fato a conferir, e reprovar ali seria falso positivo.
const docVisibilidade = existsSync(ARQUIVOS_DE_VISIBILIDADE[1])
  ? readFileSync(ARQUIVOS_DE_VISIBILIDADE[1], 'utf8')
  : null;
if (docVisibilidade !== null && process.env.AGENTS_MD_SKIP_FATOS !== '1') {
  const problemas = problemasDeVisibilidade({
    agents: content,
    docVisibilidade,
    gitignore: existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : null,
  });
  for (const p of problemas) console.error(`::error::${p}`);
  if (problemas.length > 0) {
    process.exitCode = 1;
    process.exit();
  }
}

// Fatos do proprio checkout (etapa 271). So rodam quando ha workflows para conferir -- os
// repositorios sinteticos da suite nao tem `.github/workflows`, e reprovar ali seria falso
// positivo. As assercoes de fato nao dependem da base: valem tambem no push da main, onde
// AGENTS_MD_BASE costuma estar ausente.
if (process.env.AGENTS_MD_SKIP_FATOS !== '1') {
  const workflows = workflowsNoDiretorio();
  if (workflows.length > 0) {
    const conteudosDeWorkflow = {};
    for (const nome of workflows) {
      try {
        conteudosDeWorkflow[nome] = readFileSync(join(WORKFLOWS_DIR, nome), 'utf8');
      } catch {
        /* ilegivel: o nome continua cobrado na lista do doc */
      }
    }
    const docCi = docVisibilidade ?? '';
    const problemas = problemasDeFatos({
      agents: content,
      docCi,
      workflows,
      migrations: existsSync(MIGRATIONS_DIR)
        ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
        : [],
      conteudosDeWorkflow,
      toolchain: existsSync(TOOLCHAIN) ? readFileSync(TOOLCHAIN, 'utf8') : null,
    });
    for (const p of problemas) console.error(`::error::${p}`);
    if (problemas.length > 0) {
      process.exitCode = 1;
      process.exit();
    }
  }
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
