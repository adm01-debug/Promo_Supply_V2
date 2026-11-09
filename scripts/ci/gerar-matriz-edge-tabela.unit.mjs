import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
