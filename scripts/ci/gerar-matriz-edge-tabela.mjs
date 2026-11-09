#!/usr/bin/env node
// Inventário 23: matriz edge function x tabela. Escaneia supabase/functions/<funcao>/**/*.ts
// (sem testes, sem _shared) e anota cada tabela citada em `.from('tabela')`.
// Uso: node scripts/ci/gerar-matriz-edge-tabela.mjs [--check]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SAIDA = "docs/mapa/MATRIZ_EDGE_TABELA.md";
// `(?<!storage\s*)` evita casar `sb.storage.from('bucket')`: bucket de storage não é tabela.
// O lookbehind aceita espaço/quebra de linha porque `supabaseAdmin.storage\n  .from('x')` é
// a forma escrita em supabase/functions/process-invoice-idp/index.ts:44 — com o lookbehind
// ancorado só no caractere anterior, aquele bucket entrava na matriz como se fosse tabela.
// `[\w.-]` aceita hífen: nome de tabela com hífen existe em Postgres e era descartado em
// silêncio (o que, por acidente, era a única razão pela qual o bucket `fiscal-documents` não
// aparecia como tabela).
const PADRAO_FROM = /(?<!storage\s{0,40})\.from\(\s*(['"`])([A-Za-z_][\w.-]*)\1/g;

export function extrairTabelas(fonte) {
  const tabelas = new Set();
  for (const m of fonte.matchAll(PADRAO_FROM)) tabelas.add(m[2]);
  return tabelas;
}

/** Tabelas citadas em `supabase/functions/_shared/*.ts`, por arquivo de helper. */
export function tabelasDeShared(dirFuncoes) {
  const dir = path.join(dirFuncoes, '_shared');
  if (!existsSync(dir)) return new Map();
  const porHelper = new Map();
  for (const arq of listarTs(dir)) {
    const tabelas = [...extrairTabelas(readFileSync(arq, "utf8"))].sort();
    if (tabelas.length > 0) porHelper.set(path.relative(dirFuncoes, arq), tabelas);
  }
  return new Map([...porHelper.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function listarTs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listarTs(p);
    return e.name.endsWith(".ts") && !/\.(test|spec)\.ts$/.test(e.name) ? [p] : [];
  });
}

export function montarMatriz(dirFuncoes) {
  const matriz = new Map();
  const funcoes = readdirSync(dirFuncoes, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();
  for (const f of funcoes) {
    const tabelas = new Set();
    for (const arq of listarTs(path.join(dirFuncoes, f))) {
      for (const t of extrairTabelas(readFileSync(arq, "utf8"))) tabelas.add(t);
    }
    matriz.set(f, [...tabelas].sort());
  }
  return matriz;
}

export function renderizar(matriz, shared = new Map()) {
  const porTabela = new Map();
  for (const [f, ts] of matriz) for (const t of ts) porTabela.set(t, [...(porTabela.get(t) ?? []), f]);
  const linhas = [
    "# Matriz edge function x tabela",
    "",
    "> Gerado por `node scripts/ci/gerar-matriz-edge-tabela.mjs` — não editar à mão.",
    "> Fonte: chamadas `.from('tabela')` em `supabase/functions/<funcao>/**/*.ts` (sem testes e sem `_shared`).",
    ">",
    "> Não cobre: tabelas acessadas por `.rpc()` (chamada de função, não de tabela), por nome em variável",
    "> (`from(nome)`) nem por SQL cru. Chamadas `storage.from('bucket')` são bucket de storage, não tabela, e ficam de fora.",
    "> Também conta `.from()` que esteja dentro de código comentado — é varredura de texto, não AST.",
    "> As tabelas usadas por `_shared/` saem na última seção: elas valem para TODA função que importa o helper.",
    "",
    "## Por função",
    "",
    "| Função | Tabelas |",
    "|---|---|",
  ];
  for (const [f, ts] of matriz) linhas.push(`| \`${f}\` | ${ts.length ? ts.map((t) => `\`${t}\``).join(", ") : "—"} |`);
  linhas.push("", "## Por tabela", "", "| Tabela | Funções |", "|---|---|");
  for (const t of [...porTabela.keys()].sort()) {
    linhas.push(`| \`${t}\` | ${porTabela.get(t).map((f) => `\`${f}\``).join(", ")} |`);
  }
  // Sem esta seção, tabela tocada só por helper compartilhado (ex. `webhook_events` via
  // `_shared/idempotency.ts`) não aparecia em lugar nenhum e a pergunta "quem escreve nela?"
  // era respondida com "ninguém".
  linhas.push(
    "",
    "## Por helper de `_shared/` (herdado por quem importa)",
    "",
    "> Estas tabelas NÃO estão nas seções acima: o `.from()` está no helper, não na função.",
    "> Quem importa o helper toca a tabela.",
    "",
    "| Helper | Tabelas |",
    "|---|---|",
  );
  if (shared.size === 0) linhas.push("| — | — |");
  for (const [helper, tabelas] of shared) {
    linhas.push(`| \`${helper}\` | ${tabelas.map((t) => `\`${t}\``).join(", ")} |`);
  }
  return linhas.join("\n") + "\n";
}

export function main(argv = process.argv.slice(2)) {
  const dirFuncoes = path.join(RAIZ, "supabase/functions");
  const md = renderizar(montarMatriz(dirFuncoes), tabelasDeShared(dirFuncoes));
  const destino = path.join(RAIZ, SAIDA);
  if (argv.includes("--check")) {
    if (!existsSync(destino)) {
      console.error(`${SAIDA} não existe: rode node scripts/ci/gerar-matriz-edge-tabela.mjs`);
      return 1;
    }
    if (readFileSync(destino, "utf8") !== md) {
      console.error(`${SAIDA} desatualizado: rode node scripts/ci/gerar-matriz-edge-tabela.mjs`);
      return 1;
    }
    return 0;
  }
  // Pasta de destino pode nao existir neste repo (no Zapp_Web_V2 docs/migration/ ja existia).
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, md);
  console.log(`${SAIDA} gerado`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
