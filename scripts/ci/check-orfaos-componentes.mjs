#!/usr/bin/env node
// Etapa 274 (achado HIG-03, parte 2 de 2). Nada no CI reprovava um componente de `src/`
// sem importador: o Console de Sourcing nasceu orfao em duas PRs mergeadas em producao
// (#304/#306, ~1.026 linhas) e so foi ligado na etapa 273 (PR #463). Este verificador
// compara o conjunto de orfaos com a baseline versionada — orfao NOVO reprova; orfao que
// ja estava na baseline passa, e sai da lista quando alguem o liga (a baseline encolhe).
//
// Orfao aqui = `.tsx` de `src/` (fora de `src/pages/`, sem `.test.`/`.spec.`) cujo nome de
// arquivo nao aparece em nenhum import, `export ... from` ou `import()` de outro arquivo de
// `src/`. O criterio e textual de proposito: alias `@/` e barrel `index.ts` carregam o
// nome do arquivo no texto do import de qualquer jeito, e o que se quer pegar e o arquivo
// que ninguem menciona em lugar nenhum.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

export const RAIZ = join(fileURLToPath(import.meta.url), '../../..');
export const BASELINE = 'docs/qa/baseline-orfaos-componentes.json';

const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORAR = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);

const normalizar = (p) => p.split(sep).join('/');

export function varrer(raiz, sub = 'src', acc = []) {
  let entradas;
  try {
    entradas = readdirSync(join(raiz, sub), { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entradas) {
    if (IGNORAR.has(e.name)) continue;
    const rel = `${sub}/${e.name}`;
    if (e.isDirectory()) varrer(raiz, rel, acc);
    else if (e.isFile()) acc.push(rel);
  }
  return acc;
}

// Componente = arquivo .tsx de `src/` que nao e rota, teste, nem algo dentro de src/tests.
export function ehComponente(rel) {
  if (!rel.endsWith('.tsx')) return false;
  if (/^src\/(pages|tests)\//.test(rel)) return false;
  if (/\.(test|spec)\.tsx$/.test(rel)) return false;
  return true;
}

const baseDoArquivo = (rel) => rel.slice(rel.lastIndexOf('/') + 1).replace(/\.tsx$/, '');

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `'.../Nome'`, `"../Nome"`, `'@/x/Nome.tsx'`: o nome do arquivo como ultimo segmento do
// especificador de modulo. Nao casa com `NomeAlgumaCoisa`.
function menciona(conteudo, base) {
  return new RegExp(`['"\`][^'"\`]*/${escapar(base)}(?:\\.(?:tsx|ts|jsx|js))?['"\`]`).test(conteudo);
}

export function analisar(raiz) {
  const arquivos = varrer(raiz);
  const conteudo = new Map();
  for (const rel of arquivos) {
    if (!EXTENSOES.has(rel.slice(rel.lastIndexOf('.')))) continue;
    conteudo.set(rel, readFileSync(join(raiz, rel), 'utf8'));
  }
  // Modulo sem `export` nao e componente reaproveitavel: e ponto de entrada (`src/main.tsx`).
  const exporta = (rel) => /(^|\n)\s*export[\s{]/.test(conteudo.get(rel) ?? '');
  const componentes = arquivos.filter((rel) => ehComponente(rel) && exporta(rel)).sort();
  const orfaos = componentes.filter((rel) => {
    const base = baseDoArquivo(rel);
    for (const [outro, texto] of conteudo) {
      if (outro === rel) continue;
      if (menciona(texto, base)) return false;
    }
    return true;
  });
  return { componentes, orfaos };
}

export function comparar(orfaos, baseline) {
  const conhecidos = new Set(baseline);
  const atuais = new Set(orfaos);
  return {
    novos: orfaos.filter((f) => !conhecidos.has(f)).sort(),
    resolvidos: baseline.filter((f) => !atuais.has(f)).sort(),
  };
}

export function lerBaseline(raiz) {
  try {
    return JSON.parse(readFileSync(join(raiz, BASELINE), 'utf8')).orfaos ?? [];
  } catch {
    return null;
  }
}

function principal(argv) {
  const { componentes, orfaos } = analisar(RAIZ);
  const escrever = argv.includes('--write-baseline');
  if (escrever) {
    const corpo = {
      // Gerado por `node scripts/ci/check-orfaos-componentes.mjs --write-baseline`.
      // Nao editar a mao: cada linha aqui e um componente que ninguem importa hoje.
      aviso: 'Baseline de componentes orfaos de src/. Orfao novo reprova o guard (etapa 274).',
      total_componentes: componentes.length,
      orfaos: [...orfaos].sort(),
    };
    writeFileSync(join(RAIZ, BASELINE), `${JSON.stringify(corpo, null, 2)}\n`);
    console.log(`check-orfaos-componentes: baseline escrita com ${orfaos.length} orfao(s) de ${componentes.length} componente(s).`);
    return 0;
  }
  const baseline = lerBaseline(RAIZ);
  if (baseline === null) {
    console.error(`check-orfaos-componentes: baseline ausente em ${BASELINE}. Rode com --write-baseline.`);
    return 1;
  }
  const { novos, resolvidos } = comparar(orfaos, baseline);
  if (resolvidos.length > 0) {
    console.log(`check-orfaos-componentes: ${resolvidos.length} orfao(s) da baseline agora estao ligados — remova da baseline:`);
    for (const f of resolvidos) console.log(`  - ${f}`);
  }
  if (novos.length === 0) {
    console.log(`check-orfaos-componentes: OK — ${componentes.length} componente(s), nenhum orfao novo (baseline: ${baseline.length}).`);
    return 0;
  }
  console.error(`check-orfaos-componentes: ${novos.length} componente(s) novo(s) sem importador:`);
  for (const f of novos) console.error(`  - ${f}`);
  console.error('\nLigue o componente (rota, aba ou import) ou registre-o na baseline com --write-baseline.');
  return 1;
}

const invocado = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invocado) {
  process.exitCode = principal(process.argv.slice(2));
}