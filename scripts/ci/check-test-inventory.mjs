#!/usr/bin/env node
// Portado do Zapp_Web_V2 (E48/E49/R2-INF-013) e adaptado a este repo: verifica que todo
// teste no disco tem um passo que o execute em ALGUM workflow — os .test.ts das edges
// (supabase/functions/) e as suites Node de scripts/ (.test.mjs, .unit.mjs, .integration.mjs).
// Aqui o workflow de CI é main.yml e a suíte Deno é descoberta por pasta, não listada arquivo
// a arquivo; scripts/db-audit/ (suite shell de contrato de banco) não existe neste repo, então
// a varredura de `.test.sh` do original saiu junto.
// R2-INF-013: o inventário só olhava .test.ts e .test.sh — as suites Node de scripts/
// (.test.mjs, .unit.mjs, .integration.mjs) eram invisíveis. Quatro suites já existiam fora
// dos globos de CI e ninguém notava; uma suite nova nascia sem passo nenhum e este
// verificador continuava dizendo OK. Agora todo caminho/globo de suite Node citado em um
// bloco `run:` de QUALQUER workflow conta como coberto (linha comentada dentro do bloco não
// conta: passo desligado por comentário não executa), e o que não aparece em nenhum bloco
// `run:` precisa estar na ALLOWLIST_NODE com justificativa.

import { readFileSync, readdirSync, realpathSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, posix as pathPosix } from 'path';
import { resolverExecutavel } from '../lib/seguranca-processo.mjs';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '../../..');

export const RAIZ = root;

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function listarArquivosNoDisco(relDir) {
  const base = join(root, relDir);
  const out = [];
  function visitar(abs, rel) {
    for (const nome of readdirSync(abs).sort()) {
      const filhoAbs = join(abs, nome);
      const filhoRel = rel ? `${rel}/${nome}` : nome;
      // Link simbólico pendurado não é arquivo nem pasta: sem `throwIfNoEntry` o `stat`
      // lançava ENOENT e o inventário morria com stack trace em vez de inventariar.
      const st = statSync(filhoAbs, { throwIfNoEntry: false });
      if (!st) continue;
      if (st.isDirectory()) visitar(filhoAbs, filhoRel);
      else if (st.isFile()) out.push(filhoRel);
    }
  }
  visitar(base, relDir);
  return out;
}

function gitLsFilesOuDisco(relDir) {
  try {
    const resultado = spawnSync(resolverExecutavel('git'), ['ls-files', relDir], { cwd: root, encoding: 'utf8' });
    if (typeof resultado.stdout === 'string') {
      // Inclui arquivos ainda não adicionados ao índice. Sem a união com o disco, o
      // preflight local dizia OK e o mesmo commit falhava apenas no checkout limpo do CI.
      return [...new Set([
        ...resultado.stdout.split('\n').filter(Boolean),
        ...listarArquivosNoDisco(relDir),
      ])].sort();
    }
  } catch {
    // O CI também executa este arquivo via `deno test` sem --allow-sys/--allow-run.
    // Nesse modo o shim Node de Deno não deixa `fs.access(X_OK)`/child_process
    // observar o git; o checkout do runner é limpo, então a varredura do disco é
    // equivalente para este inventário.
  }
  return listarArquivosNoDisco(relDir);
}

// Testes conhecidos ainda fora do CI; remover linha quando a etapa correspondente mergear.
// Todos os testes shell de db-audit são executados no DB Guard; não há exceções.
// As quatro exceções históricas foram promovidas ao DB Guard offline; novas suítes
// Node sem bloco `run:` devem falhar no inventário em vez de entrar nesta lista.
export const ALLOWLIST_NODE = new Set();

// ── 1. .test.ts das edges: disco vs main.yml ──────────────────────────────────
// Neste repo o workflow de CI se chama `main.yml` (no Zapp_Web_V2, de onde o script veio,
// `ci.yml`) e ele NÃO lista os testes um a um: roda `deno test ... supabase/functions/`,
// que descobre todo `*.test.ts` sob a pasta. Esse comando é o equivalente do glob — e é o
// que conta como cobertura. Sem este reconhecimento, os 7 testes Deno do repo apareceriam
// como órfãos mesmo rodando no CI.

// `*_test.ts` também: é a outra convenção que o `deno test` descobre, e este repo tem
// arquivos nas duas (`run-audit/rls_test.ts`, `_shared/integrity_test.ts`).
const SUFIXO_TESTE_DENO = /[._]test\.ts$/;
const testTsOnDisk = gitLsFilesOuDisco('supabase/functions')
  .filter(f => SUFIXO_TESTE_DENO.test(f));

const ciYaml = read('.github/workflows/main.yml');

// Cobre todos os .test.ts: `deno test [flags] supabase/functions/` (pasta, não arquivo).
const CI_TS_GLOB = 'deno test ... supabase/functions/';
const COMANDO_DENO_EDGES = /deno test[^\n]*\bsupabase\/functions\/?(?:\s|$)/;

/**
 * O comando roda DE FATO neste YAML? Só conta dentro de um bloco `run:` e fora de linha
 * comentada — a mesma regra que `padroesNodeDeWorkflow` aplica às suites Node.
 * Medido: a versão anterior testava o regex contra o YAML cru, então comentar a linha do
 * `deno test` (que é como um passo é desligado na prática) mantinha o guard verde enquanto
 * os 7 testes das edges deixavam de rodar. Desligar o passo tem de reprovar igual a apagar.
 */
export function comandoExecutadoNoWorkflow(yaml, padrao) {
  return padrao.test(codigoExecutavelDeWorkflow(yaml));
}

const ciUsesGlob = comandoExecutadoNoWorkflow(ciYaml, COMANDO_DENO_EDGES);

// ── 3. Suites Node: disco vs passos de workflow ───────────────────────────────
// O caminho da suite conta como coberto quando aparece dentro de um bloco `run:` de algum
// workflow — exatamente onde o runner a executa (com `node --test` ou direto com `node`).
// Citação em comentário, nome de etapa ou `env:` NÃO conta: é o que separa registro de execução.

const SUFIXO_SUITE_NODE = /\.(?:test|unit|integration)\.mjs$/;
const CAMINHO_SUITE_NODE = /scripts\/[A-Za-z0-9_./*-]+\.(?:test|unit|integration)\.mjs/g;

/**
 * Só o que o runner executa: a concatenação dos blocos `run:` do workflow, sem as linhas
 * comentadas. Citação em nome de etapa, em `env:` ou atrás de `#` fica de fora — é o que
 * separa registro de execução.
 */
export function codigoExecutavelDeWorkflow(yaml) {
  // `\r?\n`: com CRLF o `\r` ficava no fim da linha, `(.*)$` não casava a abertura `run:` e
  // todo passo do workflow sumia — as suites viravam órfãs com o passo no lugar.
  const linhas = String(yaml).split(/\r?\n/);
  const blocos = [];
  for (let i = 0; i < linhas.length; i += 1) {
    // `- run: ...` (run como primeira chave do item) é YAML válido e tão executável quanto
    // `run:` indentado; sem o `-` opcional um passo escrito nessa forma ficava invisível.
    const abertura = /^(\s*(?:-\s+)?)run:\s*(.*)$/.exec(linhas[i]);
    if (!abertura) continue;
    const recuo = abertura[1].length;
    // A primeira linha também passa pelo filtro de comentário: `run: # node --test ...`
    // é um passo desligado, não um passo que executa.
    const bloco = abertura[2].trimStart().startsWith('#') ? [] : [semComentarioDeShell(abertura[2])];
    for (let j = i + 1; j < linhas.length; j += 1) {
      const linha = linhas[j];
      if (linha.trim() === '') continue; // linha vazia não fecha o bloco
      if (linha.length - linha.trimStart().length <= recuo) break;
      if (linha.trimStart().startsWith('#')) continue; // passo comentado não executa nada
      bloco.push(semComentarioDeShell(linha));
    }
    blocos.push(bloco.join('\n'));
  }
  return blocos.join('\n');
}

/**
 * Corta o comentário de fim de linha (`comando # comentário`). Para o shell o `#` só abre
 * comentário no início de uma palavra e fora de aspas; o resto da linha não executa, então
 * `echo ok # node --test scripts/x.test.mjs` não pode contar como passo que roda a suite.
 */
export function semComentarioDeShell(linha) {
  let aspas = null;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (aspas) {
      if (c === '\\' && aspas === '"') i += 1;
      else if (c === aspas) aspas = null;
    } else if (c === '\\') i += 1;
    else if (c === '"' || c === "'") aspas = c;
    else if (c === '#' && (i === 0 || /\s/.test(linha[i - 1]))) return linha.slice(0, i);
  }
  return linha;
}

/** Caminhos e globos de suites Node citados nos blocos `run:` de um workflow. */
export function padroesNodeDeWorkflow(yaml) {
  const padroes = new Set(codigoExecutavelDeWorkflow(yaml).match(CAMINHO_SUITE_NODE) ?? []);
  return [...padroes].sort();
}

/** Casa um caminho com um glob simples: `*` não atravessa `/`, `**` atravessa. */
export function casaPadrao(arquivo, padrao) {
  if (!padrao.includes('*')) return arquivo === padrao;
  const expressao = padrao
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${expressao}$`).test(arquivo);
}

/** Suites Node sem nenhum bloco `run:` que as execute (fora da ALLOWLIST_NODE). */
export function orfaosNode(suites, padroes, allowlist = ALLOWLIST_NODE) {
  return suites.filter(f => !padroes.some(p => casaPadrao(f, p)) && !allowlist.has(f));
}

/**
 * Suites alcançadas por imports estáticos de uma suite já coberta pelo workflow.
 * O fechamento transitivo permite agregadores em scripts/ci sem transformar a
 * ALLOWLIST_NODE em atalho: import dinâmico, comentário ou caminho inexistente não conta.
 */
export function suitesCobertasPorImport(suites, padroes, ler = read) {
  const existentes = new Set(suites);
  const cobertas = new Set(suites.filter(f => padroes.some(p => casaPadrao(f, p))));
  const pendentes = [...cobertas];
  const importEstatico = /(?:^|\n)\s*import\s+(?:[^'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/g;

  while (pendentes.length > 0) {
    const agregador = pendentes.pop();
    const fonte = ler(agregador);
    for (const [, especificador] of fonte.matchAll(importEstatico)) {
      if (!especificador.startsWith('.')) continue;
      const importada = pathPosix.normalize(
        pathPosix.join(pathPosix.dirname(agregador), especificador),
      );
      if (!existentes.has(importada) || cobertas.has(importada)) continue;
      cobertas.add(importada);
      pendentes.push(importada);
    }
  }

  return cobertas;
}

/** Suites Node versionadas em scripts/, do disco. */
export function suitesNodeNoDisco() {
  return gitLsFilesOuDisco('scripts')
    .filter(f => SUFIXO_SUITE_NODE.test(f));
}

/** Todo caminho/globo de suite Node declarado nos blocos `run:` dos workflows do repositório. */
export function padroesNodeDosWorkflows() {
  const dir = join(root, '.github/workflows');
  return readdirSync(dir)
    .filter(f => /\.ya?ml$/.test(f))
    .flatMap(f => padroesNodeDeWorkflow(readFileSync(join(dir, f), 'utf8')));
}

export function suitesNodeOrfas() {
  const suites = suitesNodeNoDisco();
  const padroes = padroesNodeDosWorkflows();
  const cobertas = suitesCobertasPorImport(suites, padroes);
  return orfaosNode(suites, padroes, new Set([...ALLOWLIST_NODE, ...cobertas]));
}

// ── 4. Detectar órfãos ────────────────────────────────────────────────────────

/**
 * Roda o inventário inteiro e devolve a lista de órfãos (`[]` = tudo coberto).
 * O teste importa esta função; o CI roda o arquivo direto (ver `principal`).
 */
export function orfaosDoInventario() {
  const orphans = [];

  if (!ciUsesGlob) {
    // Sem o comando por pasta: comparação individual de .test.ts contra a lista em main.yml.
    // Só o que está em bloco `run:` conta (mesma regra do comando por pasta): com o YAML cru,
    // um arquivo citado em comentário ou em nome de etapa passava por executado.
    const testTsInCi = new Set(
      [...codigoExecutavelDeWorkflow(ciYaml).matchAll(/\bsupabase\/functions\/\S+[._]test\.ts\b/g)].map(m => m[0])
    );
    for (const f of testTsOnDisk) {
      if (!testTsInCi.has(f)) {
        orphans.push({ file: f, yaml: 'main.yml' });
      }
    }
  }

  for (const f of suitesNodeOrfas()) {
    orphans.push({ file: f, yaml: 'nenhum bloco run: de workflow' });
  }

  return orphans;
}

// ── 5. Reportar ───────────────────────────────────────────────────────────────

function principal() {
  const orphans = orfaosDoInventario();

  if (orphans.length === 0) {
    const nodeMsg = `${suitesNodeNoDisco().length} suite(s) Node cobertas por bloco run: (${ALLOWLIST_NODE.size} na allowlist)`;
    if (ciUsesGlob) {
      console.log(`check-test-inventory: OK — main.yml cobre as edges por pasta (${CI_TS_GLOB}); ${nodeMsg}`);
    } else {
      console.log(`check-test-inventory: OK — todos os testes têm passo em workflow; ${nodeMsg}`);
    }
    return 0;
  }

  console.error('check-test-inventory: FALHOU — testes no disco sem correspondente no CI YAML:');
  for (const { file, yaml } of orphans) {
    console.error(`  ${file}  (não encontrado em ${yaml})`);
  }
  console.error(`\nTotal: ${orphans.length} teste(s) órfão(s).`);
  console.error('Registre a suite num bloco `run:` de workflow ou justifique-a na ALLOWLIST_NODE.');
  return 1;
}

// Comparação por caminho real: `file://${process.argv[1]}` não batia quando o caminho do
// repo tem espaço/acento (a URL vem codificada) nem quando o script é chamado por link
// simbólico — nos dois casos o inventário não rodava e o processo saía 0 sem imprimir nada.
function chamadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (chamadoDireto()) {
  process.exit(principal());
}
