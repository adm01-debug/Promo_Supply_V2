// scripts/types-sync/check-remocoes-destrutivas.mjs
//   node scripts/types-sync/check-remocoes-destrutivas.mjs <types-antigo.ts> <types-novo.ts>
//
// Gate 2 do types-sync: bloqueia a remocao de tabela/view/funcao/enum que o
// codigo em src/ AINDA consome.
//
// Portado de Zapp_Web_V2/scripts/db-audit/check-remocoes-destrutivas.mjs. Lá o
// inventario de objetos vem de supabase/schema-catalog.json; aqui esse catalogo
// nao existe, entao o inventario e lido do proprio types.ts — que lista
// exatamente os mesmos objetos (Tables, Views, Functions, Enums,
// CompositeTypes do schema public).
//
// Nao conta LINHAS: linha removida nao diz nada sobre o banco (renomear um
// campo gera dezenas de linhas e nao remove objeto nenhum, enquanto um
// `DROP TABLE` de tabela consumida cabe em poucas linhas).
//
// Saida:
//   exit 0 — nenhuma remocao consumida (pode ter remocao sem consumidor: aviso)
//   exit 1 — objeto removido com call-site em src/
//   exit 2 — uso invalido / arquivo ilegivel
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(RAIZ, 'src');
const SECOES = ['Tables', 'Views', 'Functions', 'Enums', 'CompositeTypes'];
const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']);

/**
 * Inventario de objetos do schema public a partir do types.ts gerado.
 * A saida do `supabase gen types typescript` tem indentacao fixa de 2 espacos:
 *   `  public: {` -> `    Tables: {` -> `      nome_do_objeto: {`
 * So o bloco `export type Database = {` e lido: o `export const Constants`
 * no fim do arquivo repete `public:`/`Enums:` e nao faz parte do inventario.
 */
function inventario(arquivo) {
  const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');
  const objetos = new Map(); // nome -> secao
  let dentroDatabase = false;
  let dentroPublic = false;
  let secao = null;

  for (const linha of linhas) {
    if (!dentroDatabase) {
      if (/^export type Database = \{/.test(linha)) dentroDatabase = true;
      continue;
    }
    if (/^\}/.test(linha)) break; // fim do bloco Database

    if (/^ {2}\S/.test(linha)) {
      dentroPublic = /^ {2}public: \{/.test(linha);
      secao = null;
      continue;
    }
    if (!dentroPublic) continue;

    if (/^ {4}\S/.test(linha)) {
      const cabecalho = linha.match(/^ {4}([A-Za-z]+): \{/);
      secao = cabecalho && SECOES.includes(cabecalho[1]) ? cabecalho[1] : null;
      continue;
    }
    if (!secao) continue;

    // `      nome: {` (tabelas/views/funcoes/composites) ou
    // `      nome: "a" | "b"` (enums).
    const objeto = linha.match(/^ {6}("?)([A-Za-z_][A-Za-z0-9_]*)\1\??:/);
    if (objeto) objetos.set(objeto[2], secao);
  }

  if (objetos.size === 0) {
    throw new Error(`nenhum objeto reconhecido em ${arquivo}; formato inesperado`);
  }
  return objetos;
}

function arquivosDeCodigo(dir) {
  const encontrados = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
      encontrados.push(...arquivosDeCodigo(completo));
    } else if (EXTENSOES.has(path.extname(entrada.name))) {
      // O proprio types.ts nao e call-site: ele e o artefato sincronizado.
      if (completo.endsWith(path.join('src', 'integrations', 'supabase', 'types.ts'))) continue;
      encontrados.push(completo);
    }
  }
  return encontrados;
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Padroes de consumo do objeto, por secao. */
function padroes(nome, secao) {
  const n = escaparRegex(nome);
  const q = `['"\`]`;
  const comuns = [
    // helpers exportados pelo types.ts: Tables<'x'>, TablesInsert<'x'>, Enums<'x'>...
    new RegExp(`\\b(Tables|TablesInsert|TablesUpdate|Enums|CompositeTypes)<\\s*${q}${n}${q}`),
    // acesso indexado: Database['public']['Tables']['x'], ['Enums']['x'] etc.
    new RegExp(`\\[\\s*${q}(${SECOES.join('|')})${q}\\s*\\]\\s*\\[\\s*${q}${n}${q}`),
  ];
  if (secao === 'Tables' || secao === 'Views') {
    comuns.push(new RegExp(`\\.from\\(\\s*${q}${n}${q}`));
    comuns.push(new RegExp(`\\.(channel|on)\\([^)]*${q}${n}${q}`));
  }
  if (secao === 'Functions') {
    comuns.push(new RegExp(`\\.rpc\\(\\s*${q}${n}${q}`));
  }
  return comuns;
}

const [antigoArg, novoArg] = process.argv.slice(2);
if (!antigoArg || !novoArg) {
  console.error('uso: check-remocoes-destrutivas.mjs <types-antigo.ts> <types-novo.ts>');
  process.exit(2);
}

let antes;
let depois;
try {
  antes = inventario(antigoArg);
  depois = inventario(novoArg);
} catch (erro) {
  console.error('ERRO: ' + erro.message);
  process.exit(2);
}

const removidos = [...antes.entries()].filter(([nome]) => !depois.has(nome));
if (removidos.length === 0) {
  console.log(`OK: nenhum objeto removido (${antes.size} -> ${depois.size}).`);
  process.exit(0);
}

const arquivos = fs.existsSync(SRC) ? arquivosDeCodigo(SRC) : [];
const conteudos = arquivos.map((arquivo) => ({
  arquivo: path.relative(RAIZ, arquivo),
  linhas: fs.readFileSync(arquivo, 'utf8').split('\n'),
}));

const bloqueios = [];
const livres = [];
for (const [nome, secao] of removidos) {
  const regexes = padroes(nome, secao);
  const achados = [];
  for (const { arquivo, linhas } of conteudos) {
    linhas.forEach((linha, indice) => {
      if (regexes.some((regex) => regex.test(linha))) {
        achados.push(`${arquivo}:${indice + 1}: ${linha.trim().slice(0, 160)}`);
      }
    });
  }
  if (achados.length > 0) bloqueios.push({ nome, secao, achados });
  else livres.push(`${secao}/${nome}`);
}

if (livres.length > 0) {
  console.log(`Aviso: objeto(s) removido(s) sem consumidor em src/ (permitido): ${livres.join(', ')}`);
}

if (bloqueios.length === 0) {
  console.log('OK: nenhuma remocao com call-site em src/.');
  process.exit(0);
}

console.error('ERRO: o types.ts candidato remove objeto(s) ainda consumido(s) pelo codigo:');
for (const { nome, secao, achados } of bloqueios) {
  console.error(`- ${secao}/${nome}`);
  for (const achado of achados.slice(0, 5)) console.error(`    ${achado}`);
  if (achados.length > 5) console.error(`    ... e ${achados.length - 5} outro(s) call-site(s).`);
}
console.error('Causa provavel: DROP no banco sem o ajuste correspondente no codigo. Os candidatos seguem publicados como artifact para aplicacao com revisao humana.');
process.exit(1);
