import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { extrairTabelas, main, montarMatriz, renderizar, tabelasDeShared } from "./gerar-matriz-edge-tabela.mjs";

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SAIDA_REL = "docs/mapa/MATRIZ_EDGE_TABELA.md";

function criarFuncoesFalsas() {
  const dir = mkdtempSync(path.join(tmpdir(), "edge-matriz-"));
  mkdirSync(path.join(dir, "fn-a"));
  mkdirSync(path.join(dir, "fn-b"));
  mkdirSync(path.join(dir, "_shared"));
  writeFileSync(
    path.join(dir, "fn-a", "index.ts"),
    [
      "await sb.from('contacts').select();",
      'await sb\n  .from("messages").insert({});',
      // Bucket na MESMA linha e bucket QUEBRADO em duas: a segunda forma é a que existe em
      // supabase/functions/process-invoice-idp/index.ts e passava como tabela.
      "await sb.storage.from('storage_bucket').upload('k', new Blob());",
      "await sb.storage\n  .from('bucket_quebrado')\n  .list();",
      // Nome com hífen tem de ser lido como tabela (antes era descartado em silêncio).
      "await sb.from('tabela-com-hifen').select();",
      "",
    ].join("\n"),
  );
  writeFileSync(path.join(dir, "fn-a", "index.test.ts"), "sb.from('ignorada')");
  writeFileSync(path.join(dir, "fn-b", "index.ts"), "sb.from('contacts'); sb.from('profiles');");
  writeFileSync(path.join(dir, "_shared", "x.ts"), "sb.from('shared_nao_conta')");
  return dir;
}

test("matriz de 2 funções falsas lista as tabelas certas", () => {
  const matriz = montarMatriz(criarFuncoesFalsas());
  assert.deepEqual([...matriz], [
    ["fn-a", ["contacts", "messages", "tabela-com-hifen"]],
    ["fn-b", ["contacts", "profiles"]],
  ]);
});

test("markdown cruza função x tabela nos dois sentidos", () => {
  const md = renderizar(montarMatriz(criarFuncoesFalsas()));
  assert.match(md, /\| `fn-a` \| `contacts`, `messages`, `tabela-com-hifen` \|/);
  assert.match(md, /\| `contacts` \| `fn-a`, `fn-b` \|/);
  assert.doesNotMatch(md, /ignorada|storage_bucket|bucket_quebrado/);
});

test("bucket de storage nao e tabela, nas duas formas de escrita", () => {
  assert.deepEqual([...extrairTabelas("await sb.storage.from('b1').list();")], []);
  assert.deepEqual([...extrairTabelas("await sb.storage\n  .from('b2')\n  .list();")], []);
  assert.deepEqual([...extrairTabelas("await supabaseAdmin.storage\n      .from('b3')\n      .download(p);")], []);
  // `.from()` de cliente normal continua contando mesmo quebrado em linhas.
  assert.deepEqual([...extrairTabelas("await sb\n  .from('t1')\n  .select();")], ["t1"]);
});

test("tabelas de _shared/ saem em secao propria, nao como funcao", () => {
  const dir = criarFuncoesFalsas();
  const shared = tabelasDeShared(dir);
  assert.deepEqual([...shared], [["_shared/x.ts", ["shared_nao_conta"]]]);
  const md = renderizar(montarMatriz(dir), shared);
  assert.match(md, /## Por helper de `_shared\/` \(herdado por quem importa\)/u);
  assert.match(md, /\| `_shared\/x\.ts` \| `shared_nao_conta` \|/u);
  // e nao vaza para a tabela de funcoes
  assert.doesNotMatch(md, /\| `_shared\/x\.ts` \| `shared_nao_conta` \|\n[\s\S]*## Por função/u);
});

test("--check reprova arquivo ausente e arquivo divergente, e aprova o commitado", () => {
  // Roda contra o repo real: e o mesmo caminho que o guards.yml executa.
  assert.equal(main(["--check"]), 0, "o .md commitado tem de bater com o gerador");

  const destino = path.join(RAIZ_REPO, SAIDA_REL);
  assert.ok(existsSync(destino), "o .md gerado precisa estar commitado");
  const original = readFileSync(destino, "utf8");
  try {
    writeFileSync(destino, `${original}\nlinha intrusa\n`);
    assert.equal(main(["--check"]), 1, "divergencia tem de reprovar");
  } finally {
    writeFileSync(destino, original);
  }
  assert.equal(main(["--check"]), 0, "restaurado, volta a bater");
});

// ── Regressao ─────────────────────────────────────────────────────────────────
test("teste Deno nomeado `*_test.ts` fica fora da matriz, como o `*.test.ts`", () => {
  // Medido: so `.test.ts`/`.spec.ts` eram excluidos; este repo tem `run-audit/rls_test.ts` e
  // `_shared/integrity_test.ts`, e um `.from()` neles entrava como tabela da funcao.
  const dir = mkdtempSync(path.join(tmpdir(), "edge-matriz-"));
  try {
    mkdirSync(path.join(dir, "fn-a"));
    mkdirSync(path.join(dir, "_shared"));
    writeFileSync(path.join(dir, "fn-a", "index.ts"), "sb.from('real')");
    writeFileSync(path.join(dir, "fn-a", "rls_test.ts"), "sb.from('so_no_teste_deno')");
    writeFileSync(path.join(dir, "fn-a", "x.spec.ts"), "sb.from('so_no_spec')");
    writeFileSync(path.join(dir, "fn-a", "contest.ts"), "sb.from('nao_e_teste')");
    writeFileSync(path.join(dir, "_shared", "integrity_test.ts"), "sb.from('so_no_teste_shared')");
    assert.deepEqual(montarMatriz(dir).get("fn-a"), ["nao_e_teste", "real"]);
    assert.equal(tabelasDeShared(dir).size, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("extrairTabelas: aspas, template string, quebra de linha, CRLF e o que fica de fora", () => {
  const tabelas = (fonte) => [...extrairTabelas(fonte)].sort();
  assert.deepEqual(tabelas("sb.from('a'); sb.from(\"b\"); sb.from(`c`)"), ["a", "b", "c"]);
  assert.deepEqual(tabelas("sb\r\n  .from(\r\n    'quebrada'\r\n  )"), ["quebrada"]);
  assert.deepEqual(tabelas("sb.schema('audit').from('logs'); sb.from('pedidos' as any)"), ["logs", "pedidos"]);
  // Nome dinamico nao e tabela conhecida: variavel, template com interpolacao, aspas trocadas.
  assert.deepEqual(tabelas("sb.from(nome); sb.from(`pedidos_${ano}`); sb.from('x\")"), []);
  assert.deepEqual(tabelas("import x from 'modulo'"), []);
});

test("matriz e deterministica e independe da ordem de criacao dos arquivos", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "edge-matriz-"));
  try {
    for (const funcao of ["zeta", "alfa"]) {
      mkdirSync(path.join(dir, funcao, "sub"), { recursive: true });
      writeFileSync(path.join(dir, funcao, "sub", "b.ts"), "sb.from('z_tabela'); sb.from('a_tabela')");
      writeFileSync(path.join(dir, funcao, "a.ts"), "sb.from('m_tabela')");
    }
    mkdirSync(path.join(dir, "vazia"));
    const md = renderizar(montarMatriz(dir), tabelasDeShared(dir));
    assert.equal(renderizar(montarMatriz(dir), tabelasDeShared(dir)), md);
    assert.ok(md.indexOf("| `alfa` |") < md.indexOf("| `zeta` |"));
    assert.match(md, /\| `alfa` \| `a_tabela`, `m_tabela`, `z_tabela` \|/u);
    assert.match(md, /\| `vazia` \| — \|/u);
    assert.ok(md.endsWith("\n") && !md.includes("\r"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("argumento desconhecido reprova e NAO regera o arquivo", () => {
  // Medido: `--chek` (erro de digitacao) caia no modo de escrita e saia 0.
  const destino = path.join(RAIZ_REPO, SAIDA_REL);
  const antes = statSync(destino).mtimeMs;
  assert.equal(main(["--chek"]), 2);
  assert.equal(main(["--check", "--outro"]), 2);
  assert.equal(statSync(destino).mtimeMs, antes, "o arquivo gerado nao pode ter sido reescrito");
});

test("CLI roda de verdade quando chamado por link simbolico", () => {
  // Medido: a guarda de modulo principal comparava texto; por link `main` nao rodava e o
  // processo saia 0 sem comparar nada (nem o erro de uso aparecia).
  const dir = mkdtempSync(path.join(tmpdir(), "edge-matriz-link-"));
  try {
    const link = path.join(dir, "matriz-por-link.mjs");
    symlinkSync(path.join(RAIZ_REPO, "scripts", "ci", "gerar-matriz-edge-tabela.mjs"), link);
    const uso = spawnSync(process.execPath, [link, "--chek"], { encoding: "utf8" });
    assert.equal(uso.status, 2, `por link o CLI deveria sair com 2: ${uso.stdout}${uso.stderr}`);
    assert.equal(spawnSync(process.execPath, [link, "--check"], { encoding: "utf8" }).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
