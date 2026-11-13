#!/usr/bin/env node
/**
 * W96: gera `docs/ci/README.md` a partir dos blocos `# docs:` e `# nao-e-bug:` de cada workflow.
 *
 * Por que existe: um workflow de 900 linhas só conta o que faz e a quem avisa se
 * alguém escrever isso. Comentário solto no meio do arquivo não é lido, e um
 * README escrito à mão desatualiza no primeiro PR que mexe num gatilho.
 *
 * O contrato: cada YAML carrega, no topo, um bloco
 *
 *   # docs:
 *   #   gatilho: <quando roda>
 *   #   prova:   <o que ele prova>
 *   #   falha:   <o que acontece quando falha>
 *   #   avisa:   <quem é avisado>
 *
 * e opcionalmente:
 *
 *   # nao-e-bug:
 *   #   - <chave>: <descricao>
 *
 * O README é a projeção desses blocos. `--check` falha se divergir — é o que
 * trava a regressão no CI (a etapa pede `--check` verde).
 *
 * KPI opcional: se `docs/ci/kpi.json` existir, as colunas "custo/semana (min)"
 * e "taxa de falha (7 d)" são lidas de lá (chaves: `custo_semana_min` e
 * `taxa_falha_7d`, indexadas pelo nome do arquivo YAML). Sem o arquivo, "—".
 *
 * Uso:
 *   node scripts/ci/render-workflow-docs.mjs           # escreve o README
 *   node scripts/ci/render-workflow-docs.mjs --check   # falha se divergir
 */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
// RENDER_WF_RAIZ existe para a suite montar uma arvore minima em tmp e exercitar o gerador
// de verdade (mesmo padrao de MIGRATIONS_DIR/AI_CONTEXT_ROOT nos outros scripts do repo).
const RAIZ = process.env.RENDER_WF_RAIZ || join(AQUI, '..', '..');
const DIR_WF = join(RAIZ, '.github', 'workflows');
const README = join(RAIZ, 'docs', 'ci', 'README.md');
const KPI_PATH = join(RAIZ, 'docs', 'ci', 'kpi.json');

const CAMPOS = ['gatilho', 'prova', 'falha', 'avisa'];

// Argumento que nao e `--check` cai no modo de ESCRITA: um `--chek` digitado errado num
// workflow regeraria o README e sairia 0 em vez de conferir. Erro de uso reprova.
const ARGUMENTOS_DESCONHECIDOS = process.argv.slice(2).filter((a) => a !== '--check');
if (ARGUMENTOS_DESCONHECIDOS.length) {
  console.error(`ERRO: argumento desconhecido: ${ARGUMENTOS_DESCONHECIDOS.join(' ')}`);
  console.error('Uso: node scripts/ci/render-workflow-docs.mjs [--check]');
  process.exit(2);
}

/** Extrai o bloco `# docs:` do topo do arquivo. Devolve null se não houver. */
function extrairDocs(texto) {
  const linhas = texto.split('\n');
  const saida = {};
  let dentro = false;
  let anteriorEraCampo = false;

  for (const linha of linhas) {
    if (/^#\s*docs:\s*$/.test(linha)) {
      dentro = true;
      continue;
    }
    if (!dentro) continue;

    // Linha de comentário continua o bloco; qualquer outra coisa o encerra.
    const m = /^#\s+([a-z_]+):\s*(.+?)\s*$/.exec(linha);
    if (m) {
      // Campo repetido: o segundo valor apagava o primeiro sem aviso.
      if (Object.hasOwn(saida, m[1])) throw new Error(`campo repetido no bloco # docs: ${m[1]}`);
      saida[m[1]] = m[2];
      anteriorEraCampo = true;
      continue;
    }
    if (/^#\s*$/.test(linha) || linha.trim() === '') {
      anteriorEraCampo = false;
      continue;
    }
    // Comentario recuado LOGO abaixo de um campo, sem ser `campo: valor`, e a segunda linha
    // do valor (ou um campo vazio). Antes caia no `break`: o resto do texto sumia do README
    // e o CI seguia verde. Depois de uma linha vazia e comentario solto, e encerra o bloco.
    if (anteriorEraCampo && /^#\s{2,}\S/.test(linha)) {
      throw new Error(`linha nao reconhecida no bloco # docs: "${linha.trim()}" (cada campo ocupa UMA linha: "#   <campo>: <valor>")`);
    }
    break;
  }

  return Object.keys(saida).length ? saida : null;
}

/**
 * Extrai entradas do bloco `# nao-e-bug:` do topo do arquivo.
 * Cada item é uma linha `#   - <chave>: <descricao>`.
 * Devolve array de { chave, descricao } ou [] se não houver bloco.
 */
function extrairNaoEBug(texto) {
  const linhas = texto.split('\n');
  const itens = [];
  let dentro = false;
  let anteriorEraItem = false;

  for (const linha of linhas) {
    if (/^#\s*nao-e-bug:\s*$/.test(linha)) {
      dentro = true;
      continue;
    }
    if (!dentro) continue;

    const m = /^#\s+-\s+(.+?):\s*(.+?)\s*$/.exec(linha);
    if (m) {
      itens.push({ chave: m[1], descricao: m[2] });
      anteriorEraItem = true;
      continue;
    }
    // Item que PARECE item mas nao casa (`#   - sem dois pontos`) antes caia no `break`
    // abaixo: o item e todos os seguintes desapareciam do README e o CI seguia verde.
    if (/^#\s+-\s+/.test(linha)) {
      return { erro: `item malformado em # nao-e-bug: ${linha.trim()} (use "#   - <chave>: <descricao>")` };
    }
    // Linha de comentário vazia continua; qualquer outra coisa (inclusive docs:) encerra.
    if (/^#\s*$/.test(linha)) {
      anteriorEraItem = false;
      continue;
    }
    // Comentario recuado LOGO abaixo de um item, sem ser item, e a segunda linha da
    // descricao: antes encerrava o bloco e este item (cortado) e TODOS os seguintes sumiam
    // do README. Depois de uma linha vazia e comentario solto, e encerra o bloco.
    if (anteriorEraItem && /^#\s{2,}\S/.test(linha)) {
      return { erro: `linha nao reconhecida em # nao-e-bug: "${linha.trim()}" (cada item ocupa UMA linha: "#   - <chave>: <descricao>")` };
    }
    break;
  }

  return itens;
}

/** Nome amigável: `name:` do workflow, senão o nome do arquivo. */
function nomeDe(texto, arquivo) {
  const m = /^name:\s*(.+?)\s*$/m.exec(texto);
  if (!m) return arquivo.replace(/\.ya?ml$/, '');
  // `name: "CI" # principal`: o nome do workflow e CI -- sem as aspas e sem o comentario YAML.
  const entreAspas = /^(['"])(.*)\1\s*(?:#.*)?$/.exec(m[1]);
  return entreAspas ? entreAspas[2] : m[1].replace(/\s+#.*$/, '');
}

// KPI: tenta carregar docs/ci/kpi.json; ignora silenciosamente se não existir.
let kpi = {};
try {
  kpi = JSON.parse(await readFile(KPI_PATH, 'utf8'));
} catch (erro) {
  // sem KPI → colunas ficam "—". Arquivo que EXISTE e nao e JSON e outra coisa: engolir o
  // erro publicava "—" nas duas colunas como se nao houvesse medicao.
  if (erro.code !== 'ENOENT') {
    console.error(`ERRO: docs/ci/kpi.json existe mas nao pode ser lido como JSON: ${erro.message}`);
    process.exit(1);
  }
}
if (kpi === null || typeof kpi !== 'object' || Array.isArray(kpi)) {
  console.error('ERRO: docs/ci/kpi.json precisa ser um objeto indexado pelo nome do arquivo YAML.');
  process.exit(1);
}

const arquivos = (await readdir(DIR_WF)).filter((f) => /\.ya?ml$/.test(f)).sort();
// Fail-closed: sem nenhum workflow lido, o gerador escrevia "0 workflows" e o --check
// aprovava um README vazio.
if (arquivos.length === 0) {
  console.error(`ERRO: nenhum workflow (.yml/.yaml) em ${DIR_WF} — nada foi lido.`);
  process.exit(1);
}

const docs = [];
const semBloco = [];
const naoEBugGlobal = [];

for (const arquivo of arquivos) {
  const texto = await readFile(join(DIR_WF, arquivo), 'utf8');
  let bloco;
  try {
    bloco = extrairDocs(texto);
  } catch (erro) {
    console.error(`ERRO: ${arquivo}: ${erro.message}`);
    process.exit(1);
  }
  if (!bloco) {
    semBloco.push(arquivo);
    continue;
  }
  const faltando = CAMPOS.filter((c) => !bloco[c]);
  if (faltando.length) {
    console.error(`ERRO: ${arquivo} tem bloco # docs: sem ${faltando.join(', ')}`);
    process.exit(1);
  }
  // Campo fora dos quatro nao vai para parte nenhuma do README; aceitar em silencio era
  // perder o texto que alguem escreveu achando que seria publicado.
  const desconhecidos = Object.keys(bloco).filter((c) => !CAMPOS.includes(c));
  if (desconhecidos.length) {
    console.error(`ERRO: ${arquivo} tem campo nao reconhecido no bloco # docs:: ${desconhecidos.join(', ')}`);
    console.error(`Campos aceitos: ${CAMPOS.join(', ')}.`);
    process.exit(1);
  }
  const nome = nomeDe(texto, arquivo);
  const naoEBug = extrairNaoEBug(texto);
  if (!Array.isArray(naoEBug)) {
    console.error(`ERRO: ${arquivo}: ${naoEBug.erro}`);
    process.exit(1);
  }
  for (const item of naoEBug) {
    naoEBugGlobal.push({ workflow: nome, arquivo, ...item });
  }
  docs.push({ arquivo, nome, ...bloco });
}

if (semBloco.length) {
  console.error(`ERRO: workflow sem bloco '# docs:' no topo: ${semBloco.join(', ')}`);
  console.error('Cada workflow precisa declarar gatilho, prova, falha e avisa.');
  process.exit(1);
}

const linhas = [
  '# Workflows de CI — o que cada um faz',
  '',
  '> **Gerado por `scripts/ci/render-workflow-docs.mjs`.** Não edite à mão: o CI roda',
  '> `--check` e falha se este arquivo divergir do bloco `# docs:` de cada workflow.',
  '> Para mudar o que está aqui, mude o bloco no YAML.',
  '',
  `**${docs.length} workflows.**`,
  '',
  '| Workflow | Arquivo | Gatilho | O que prova | Quando falha | Quem é avisado | Custo/sem (min) | Falha (7 d) |',
  '|---|---|---|---|---|---|---|---|',
  ...docs.map((d) => {
    const custo = kpi[d.arquivo]?.custo_semana_min ?? '—';
    const falha7d = kpi[d.arquivo]?.taxa_falha_7d ?? '—';
    // `|` no texto de um campo abriria uma coluna nova e desalinharia a tabela inteira.
    const c = (v) => String(v).replaceAll('|', '\\|');
    return `| ${c(d.nome)} | [\`${d.arquivo}\`](../../.github/workflows/${d.arquivo}) | ${c(d.gatilho)} | ${c(d.prova)} | ${c(d.falha)} | ${c(d.avisa)} | ${c(custo)} | ${c(falha7d)} |`;
  }),
  '',
  '## Detalhe',
  '',
  ...docs.flatMap((d) => [
    `### ${d.nome} (\`${d.arquivo}\`)`,
    '',
    `- **Gatilho:** ${d.gatilho}`,
    `- **O que prova:** ${d.prova}`,
    `- **Quando falha:** ${d.falha}`,
    `- **Quem é avisado:** ${d.avisa}`,
    '',
  ]),
];

if (naoEBugGlobal.length > 0) {
  linhas.push(
    '## O que NÃO é bug',
    '',
    '> Comportamentos que parecem erros mas são design intencional.',
    '> Cada item vem do bloco `# nao-e-bug:` do YAML do workflow.',
    '',
    '| Workflow | Situação | Por quê não é bug |',
    '|---|---|---|',
    ...naoEBugGlobal.map(
      (i) =>
        `| [\`${i.arquivo}\`](../../.github/workflows/${i.arquivo}) | **${String(i.chave).replaceAll('|', '\\|')}** | ${String(i.descricao).replaceAll('|', '\\|')} |`,
    ),
    '',
  );
}

const conteudo = linhas.join('\n');

if (process.argv.includes('--check')) {
  let atual = '';
  try {
    atual = await readFile(README, 'utf8');
  } catch {
    console.error('ERRO: docs/ci/README.md não existe. Rode sem --check para gerar.');
    process.exit(1);
  }
  if (atual !== conteudo) {
    console.error('ERRO: docs/ci/README.md divergiu dos blocos `# docs:` dos workflows.');
    console.error('Rode `node scripts/ci/render-workflow-docs.mjs` e commite o resultado.');
    process.exit(1);
  }
  console.log(`OK: docs/ci/README.md bate com os ${docs.length} workflows.`);
  process.exit(0);
}

await mkdir(dirname(README), { recursive: true });
await writeFile(README, conteudo, 'utf8');
console.log(`docs/ci/README.md gerado a partir de ${docs.length} workflows.`);
