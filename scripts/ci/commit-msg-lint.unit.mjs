import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { TIPOS, validarMensagem } from "./commit-msg-lint.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(RAIZ, "scripts", "ci", "commit-msg-lint.mjs");
const WORKFLOW = path.join(RAIZ, ".github", "workflows", "guards.yml");

test("aceita as mensagens do padrao do repositorio", () => {
  const aceitas = [
    "feat(contatos): adiciona a coluna origem no cartao",
    "fix(hooks): mantem o carregando limpo na resposta obsoleta",
    "docs: plano de Contatos por jornada do vendedor",
    "chore(edge-deploy): regenera o manifesto de deploy",
    "feat(api)!: remove o campo legado do retorno",
    "ci: liga o gate de mensagem de commit",
    "fix(inbox/contato): rotulo de e-mail sem subtitulo",
  ];
  for (const mensagem of aceitas) {
    const { ok, problemas } = validarMensagem(`${mensagem}\n`);
    assert.equal(ok, true, `${mensagem} deveria passar: ${problemas.join("; ")}`);
  }
});

test("aceita os 12 tipos do padrao e recusa qualquer outro", () => {
  assert.deepEqual(TIPOS, [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "security",
    "revert",
  ]);
  for (const tipo of TIPOS) {
    const { ok, problemas } = validarMensagem(`${tipo}(escopo): assunto com tamanho suficiente`);
    assert.equal(ok, true, `${tipo} deveria passar: ${problemas.join("; ")}`);
  }
  for (const tipo of ["feature", "Fix", "FIX", "wip", "hotfix"]) {
    assert.equal(
      validarMensagem(`${tipo}: assunto com tamanho suficiente`).ok,
      false,
      `${tipo} deveria ser recusado`,
    );
  }
});

test("recusa cabecalho fora do formato", () => {
  const recusadas = [
    "adiciona a coluna origem no cartao",
    "feat adiciona a coluna origem no cartao",
    "feat(contatos) adiciona a coluna origem",
    "feat(contatos):assunto colado nos dois-pontos",
  ];
  for (const mensagem of recusadas) {
    const { ok, problemas } = validarMensagem(mensagem);
    assert.equal(ok, false, `${mensagem} deveria ser recusada`);
    assert.ok(problemas.length > 0);
  }
});

test("recusa assunto curto e assunto terminado em ponto final", () => {
  assert.equal(validarMensagem("fix(contatos): curto\n").ok, false);
  assert.equal(
    validarMensagem("fix(contatos): assunto com ponto no final.\n").ok,
    false,
    "config-conventional recusa ponto final no assunto",
  );
});

test("recusa escopo em maiuscula", () => {
  const { ok, problemas } = validarMensagem("fix(Contatos): assunto com tamanho suficiente\n");
  assert.equal(ok, false);
  assert.match(problemas.join("; "), /escopo/u);
});

test("ignora as mensagens que o proprio git cria", () => {
  const geradas = [
    'Merge branch "main" into dia/2026-10-08',
    'Revert "fix(contatos): assunto com tamanho suficiente"',
    "fixup! fix(contatos): assunto com tamanho suficiente",
    "squash! fix(contatos): assunto com tamanho suficiente",
    "amend! fix(contatos): assunto com tamanho suficiente",
  ];
  for (const mensagem of geradas) {
    assert.equal(validarMensagem(mensagem).ok, true, `${mensagem} deveria passar`);
  }
});

// So as formas que o git/GitHub geram passam direto. Medido: com o prefixo solto
// (`Merge `, `Revert `) qualquer frase iniciada por essas palavras furava o gate.
test("aceita as demais formas de merge geradas pelo git e pelo GitHub", () => {
  const geradas = [
    "Merge branch 'main' into claude/fix-x-261109-1010",
    "Merge branches 'a' and 'b'",
    "Merge remote-tracking branch 'origin/main' into claude/fix-x",
    "Merge tag 'v1.2.0'",
    "Merge commit '0a1b2c3'",
    "Merge pull request #12 from adm01-debug/claude/fix-x",
    "Merge 0a1b2c3d into 4d5e6f70",
  ];
  for (const mensagem of geradas) {
    assert.equal(validarMensagem(mensagem).ok, true, `${mensagem} deveria passar`);
  }
});

test('aceita o `Reapply "..."` que o git >= 2.43 escreve ao reverter um revert', () => {
  assert.equal(validarMensagem('Reapply "fix(contatos): assunto com tamanho suficiente"').ok, true);
});

test("frase escrita a mao que so comeca com Merge/Revert/Reapply nao fura o gate", () => {
  for (const mensagem of [
    "Merge do codigo do login sem padrao",
    "Merge login into main agora mesmo",
    "Revert tudo que foi feito ontem",
    "Reapply da correcao do login",
  ]) {
    const { ok, problemas } = validarMensagem(mensagem);
    assert.equal(ok, false, `${mensagem} deveria ser recusada`);
    assert.match(problemas.join("; "), /fora do padrao/u);
  }
});

test("le a mensagem com CRLF, acento, escopo composto e corpo fora do padrao", () => {
  assert.equal(validarMensagem("fix(cotação): corrige cálculo de preço\r\n\r\nCorpo livre.\r\n").ok, true);
  assert.equal(validarMensagem("fix(ci/guards): corrige a leitura do yaml\n\nQualquer corpo.").ok, true);
  assert.equal(validarMensagem("feat(api)!: remove o endpoint legado").ok, true);
  assert.equal(validarMensagem("fix(): corrige a leitura do yaml").ok, false);
  assert.equal(validarMensagem("fix(a b): corrige a leitura do yaml").ok, false);
});

test("usa a primeira linha util e ignora os comentarios do git", () => {
  const mensagem = [
    "",
    "# Por favor, digite a mensagem de commit para as suas alteracoes.",
    "feat(contatos): adiciona a coluna origem no cartao",
    "",
    "# Insira o corpo aqui",
  ].join("\n");
  assert.equal(validarMensagem(mensagem).ok, true);
});

test("arquivo so com comentarios nao bloqueia (quem aborta o commit vazio e o git)", () => {
  assert.equal(validarMensagem("\n# nada aqui\n").ok, true);
});

// Prova do canal real. No Zapp_Web_V2, de onde o script veio, o canal e o hook
// `.husky/commit-msg`; ESTE repo nao tem hook de git nenhum (sem `.husky/`, sem
// `"prepare"`, sem commitlint -- esta escrito no AGENTS.md), entao o canal e o passo do
// `guards.yml` que roda o CLI commit a commit na PR. A prova testa os dois lados: o CLI
// pelo mesmo caminho de execucao do workflow ($1 = arquivo de mensagem, codigo de saida)
// e o workflow invocando esse CLI de forma bloqueante.
test("o CLI recusa a mensagem fora do padrao e aceita a mensagem do padrao", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "promo-commit-msg-"));
  try {
    const rodar = (mensagem) => {
      const arquivo = path.join(raiz, "COMMIT_EDITMSG");
      writeFileSync(arquivo, mensagem);
      return spawnSync(process.execPath, [CLI, arquivo], { cwd: RAIZ, encoding: "utf8" });
    };

    const ruim = rodar("mensagem fora do padrao\n");
    assert.equal(ruim.status, 1, `o CLI deveria sair com 1: ${ruim.stdout}${ruim.stderr}`);
    assert.match(ruim.stderr, /fora do padrao/u);
    const bom = rodar("feat(cotacoes): adiciona a coluna origem no cartao\n");
    assert.equal(bom.status, 0, bom.stderr);
    // A mensagem de erro aponta para um documento que existe neste repo.
    assert.match(ruim.stderr, /AGENTS\.md > Fluxo Git/u);
    assert.ok(existsSync(path.join(RAIZ, "AGENTS.md")));

    // Chamado por link simbolico o CLI tem de rodar igual. Medido: a guarda de modulo
    // principal comparava texto, `main` nao rodava e o gate saia 0 sem ler a mensagem.
    const link = path.join(raiz, "lint-por-link.mjs");
    symlinkSync(CLI, link);
    const arquivo = path.join(raiz, "COMMIT_EDITMSG");
    writeFileSync(arquivo, "mensagem fora do padrao\n");
    const porLink = spawnSync(process.execPath, [link, arquivo], { cwd: RAIZ, encoding: "utf8" });
    assert.equal(porLink.status, 1, `por link o CLI deveria sair com 1: ${porLink.stdout}${porLink.stderr}`);
    // Sem argumento e com arquivo ilegivel: erro de uso (2), nunca 0.
    assert.equal(spawnSync(process.execPath, [CLI], { cwd: RAIZ, encoding: "utf8" }).status, 2);
    assert.equal(spawnSync(process.execPath, [CLI, path.join(raiz, "nao-existe")], { cwd: RAIZ, encoding: "utf8" }).status, 2);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("o guards.yml valida a mensagem de cada commit da PR com este CLI", () => {
  assert.ok(existsSync(WORKFLOW), `o workflow precisa existir: ${WORKFLOW}`);
  const yaml = readFileSync(WORKFLOW, "utf8");
  // O passo le os commits do intervalo da PR e chama o CLI uma vez por commit.
  assert.match(yaml, /git rev-list "\$BASE_SHA"\.\."\$HEAD_SHA"/u);
  assert.match(yaml, /node scripts\/ci\/commit-msg-lint\.mjs "\$mensagem"/u);
  // E bloqueante: sem o `exit 1` o passo viraria relatorio.
  assert.match(yaml, /^\s+exit 1$/mu);
});
