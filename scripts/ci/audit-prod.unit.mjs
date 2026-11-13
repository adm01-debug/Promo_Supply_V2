import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluate, main, parseAuditText } from "./audit-prod.mjs";

const sample = [
  "picomatch  <2.3.2",
  "  vite › tinyglobby › fdir › picomatch",
  "  tailwindcss › fast-glob › micromatch › picomatch",
  "  high: Picomatch has a ReDoS vulnerability via extglob quantifiers - https://github.com/advisories/GHSA-c2c7-rcm5-vvqj",
  "",
  "@remix-run/router  <=1.23.1",
  "  react-router-dom › react-router › @remix-run/router",
  "  high: React Router allows XSS via open redirects - https://github.com/advisories/GHSA-2w69-qvjg-hvjx",
  "",
  "dompurify  <3.2.4",
  "  dompurify",
  "  moderate: DOMPurify allows Cross-site Scripting (XSS) - https://github.com/advisories/GHSA-vhxf-7vqr-mrjg",
  "",
  "3 vulnerabilities (2 high, 1 moderate)",
].join("\n");

// Saida real do bun 1.4.0 (o CI pina `bun-version: '1.4.0'`), capturada com a
// versao instalada no WSL. O formato do bun e' `pacote@versao` + cadeia com
// ` > ` e a linha final de resumo com as contagens por severidade.
const realBun = [
  "bun audit v1.4.0 (34cbb9a40)",
  "",
  "brace-expansion@1.1.18, 5.0.12",
  "  eslint > @eslint/eslintrc > minimatch > brace-expansion",
  "  high: brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion (<1.1.19) - https://github.com/advisories/GHSA-6j4f-fj2g-mc7p",
  "  moderate: brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service (<1.1.21) - https://github.com/advisories/GHSA-q2hr-2g5m-vwhr",
  "",
  "dompurify@3.4.16, 3.4.14, 3.4.13",
  "  (direct dependency)",
  "  low: DOMPurify: IN_PLACE: node-removing afterSanitize hook leaves detached subtree event handlers armed, causing DOM XSS (>=3.4.13 <=3.4.15) - https://github.com/advisories/GHSA-p98j-92pf-mc4p",
  "",
  "3 vulnerabilities (1 high, 1 moderate, 1 low)",
  "",
  "  bun audit fix           upgrade the vulnerable packages within their ranges",
  "  bun audit fix --latest  also cross major versions",
].join("\n");

test("parse agrupa pacote, cadeias e advisories", () => {
  const findings = parseAuditText(sample);
  assert.equal(findings.length, 3);
  assert.deepEqual(findings[0].chains, [
    ["vite", "tinyglobby", "fdir", "picomatch"],
    ["tailwindcss", "fast-glob", "micromatch", "picomatch"],
  ]);
  assert.equal(findings[0].advisories[0].severity, "high");
  assert.deepEqual(findings[2].chains, [["dompurify"]]);
});

test("bloqueia so cadeias que comecam em dependencia de producao", () => {
  const findings = parseAuditText(sample);
  const prod = ["react-router-dom", "dompurify"];
  const blocking = evaluate(findings, prod, "high");
  assert.deepEqual(blocking.map((b) => b.package), ["@remix-run/router"]);
  assert.deepEqual(blocking[0].chains, ["react-router-dom › react-router › @remix-run/router"]);
  // moderate so bloqueia se o nivel for moderate
  assert.deepEqual(evaluate(findings, prod, "moderate").map((b) => b.package), ["@remix-run/router", "dompurify"]);
  // Se vite fosse dependencia de producao, picomatch bloquearia — main() filtra
  // devDependencies antes de chamar evaluate, por isso no repo real ele nunca bloqueia.
  assert.deepEqual(evaluate(findings, ["vite"], "high").map((b) => b.package), ["picomatch"]);
});

test("main le --input e falha/passa conforme package.json", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  writeFileSync(path.join(dir, "audit.txt"), sample);
  writeFileSync(path.join(dir, "prod.json"), JSON.stringify({ dependencies: { "react-router-dom": "^6" }, devDependencies: { vite: "^8" } }));
  writeFileSync(path.join(dir, "dev.json"), JSON.stringify({ dependencies: { react: "^19" }, devDependencies: { vite: "^8", "react-router-dom": "^6" } }));
  assert.equal(main(["--input", "audit.txt", "--package-json", "prod.json"], dir), 1);
  assert.equal(main(["--input", "audit.txt", "--package-json", "dev.json"], dir), 0);
});

test("main falha fechado quando a saida nao e um relatorio e passa com 'No vulnerabilities found'", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
    writeFileSync(path.join(dir, "broken.txt"), "error: failed to fetch https://registry.npmjs.org/-/npm/v1/security/advisories/bulk\n");
    writeFileSync(path.join(dir, "clean.txt"), "No vulnerabilities found\n");
    assert.equal(main(["--level", "high", "--input", "broken.txt"], dir), 2);
    assert.equal(main(["--level", "high", "--input", "clean.txt"], dir), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// R2-INF-009: o reconhecimento do relatorio nao pode aceitar qualquer texto que
// fale em "vulnerability" — a falha operacional do registry virava exit 0.
test("main falha fechado para erro operacional mesmo contendo a palavra vulnerability", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
    // Prova sintetica da reauditoria (probe invalid_audit_report_passes).
    writeFileSync(path.join(dir, "erro-db.txt"), "error: Could not retrieve the vulnerability database.\n");
    // Erro real do bun 1.4.0 com registry inalcancavel.
    writeFileSync(
      path.join(dir, "erro-registry.txt"),
      "bun audit v1.4.0 (34cbb9a40)\n\nerror: POST https://127.0.0.1:1/-/npm/v1/security/advisories/bulk - ConnectionRefused\n",
    );
    assert.equal(main(["--level", "high", "--input", "erro-db.txt"], dir), 2);
    assert.equal(main(["--level", "high", "--input", "erro-registry.txt"], dir), 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// R2-INF-009: relatorio parcial (advisory sumido) ou resumo que nao fecha com as
// contagens nao e relatorio completo.
test("main falha fechado para relatorio parcial ou com contagem inconsistente", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
    writeFileSync(
      path.join(dir, "parcial.txt"),
      ["react-router-dom@6.0.0", "  high: XSS via open redirects - https://github.com/advisories/GHSA-1", "", "3 vulnerabilities (2 high, 1 moderate)"].join("\n"),
    );
    writeFileSync(
      path.join(dir, "sem-resumo.txt"),
      ["react-router-dom@6.0.0", "  high: XSS via open redirects - https://github.com/advisories/GHSA-1"].join("\n"),
    );
    writeFileSync(
      path.join(dir, "soma-errada.txt"),
      ["react-router-dom@6.0.0", "  high: XSS via open redirects - https://github.com/advisories/GHSA-1", "", "5 vulnerabilities (2 high, 1 moderate)"].join("\n"),
    );
    assert.equal(main(["--level", "high", "--input", "parcial.txt"], dir), 2);
    assert.equal(main(["--level", "high", "--input", "sem-resumo.txt"], dir), 2);
    assert.equal(main(["--level", "high", "--input", "soma-errada.txt"], dir), 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// R2-INF-009: o CI neutraliza o `|| true` do passo do coletor; o status preservado
// chega pelo --status e crash/abort nao pode passar como verde.
test("main consome o status do coletor preservado pelo CI", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
    writeFileSync(path.join(dir, "limpo.txt"), "No vulnerabilities found (checked 812 packages)\n");
    writeFileSync(path.join(dir, "status-0.txt"), "0\n");
    writeFileSync(path.join(dir, "status-1.txt"), "1\n");
    writeFileSync(path.join(dir, "status-crash.txt"), "139\n");
    writeFileSync(path.join(dir, "status-lixo.txt"), "nao-numero\n");
    assert.equal(main(["--level", "high", "--input", "limpo.txt", "--status", "status-0.txt"], dir), 0);
    assert.equal(main(["--level", "high", "--input", "limpo.txt", "--status", "status-1.txt"], dir), 0);
    assert.equal(main(["--level", "high", "--input", "limpo.txt", "--status", "status-crash.txt"], dir), 2);
    assert.equal(main(["--level", "high", "--input", "limpo.txt", "--status", "status-lixo.txt"], dir), 2);
    assert.equal(main(["--level", "high", "--input", "limpo.txt", "--status", "status-ausente.txt"], dir), 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("main aceita o relatorio real do bun 1.4.0 quando as contagens fecham", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "real.txt"), realBun);
    writeFileSync(path.join(dir, "prod.json"), JSON.stringify({ dependencies: { dompurify: "^3" }, devDependencies: { eslint: "^9" } }));
    // dompurify e' dependencia de producao, mas o advisory real e' `low`: com
    // --level high o gate nao bloqueia — o que importa aqui e' o relatorio ser
    // reconhecido (sem ele o exit seria 2).
    assert.equal(main(["--level", "high", "--input", "real.txt", "--package-json", "prod.json"], dir), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// refazer 1 (R2-INF-009): um cabecalho de pacote que comeca por `error-` e dado
// valido do relatorio. A regex anterior `/^error\b/` casava tambem antes do
// hifen (`\b` entre `r` e `-`), entao `error-ex@1.2.3` era classificado como
// erro operacional e derrubava o gate com exit 2 num relatorio completo.
test("main aceita relatorio completo com pacote error-ex (nao confunde cabecalho com erro operacional)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { "react-dev-utils": "^12" } }));
    writeFileSync(
      path.join(dir, "error-ex.txt"),
      [
        "bun audit v1.4.0 (34cbb9a40)",
        "",
        "error-ex@1.2.3, 1.2.4",
        "  react-dev-utils > error-ex",
        "  moderate: error-ex: prototype pollution - https://github.com/advisories/GHSA-1",
        "",
        "1 vulnerability (1 moderate)",
      ].join("\n"),
    );
    // O advisory e' `moderate`: com --level high nao bloqueia, mas o relatorio
    // tem de ser reconhecido — com o falso positivo o exit seria 2.
    assert.equal(main(["--level", "high", "--input", "error-ex.txt"], dir), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Regressao: o formato que o bun 1.4.0 imprime DE VERDADE ───────────────────
// Linhas reais do binario 1.4.0 (o pinado no guards.yml), capturadas em projetos sinteticos
// com pacotes publicos e recortadas; so a linha de resumo foi recalculada para o recorte.
// Medido antes da correcao: a faixa `bun audit v1.4.0 (...)` virava o
// pacote "bun", nenhum cabecalho `nome@versao` casava, todo advisory ia para esse pacote
// fantasma e o gate saia 0 -- inclusive com HIGH em dependencia direta de producao. No
// run 42702120276 da main o relatorio tinha 178 advisories (zod direto, ws via
// @supabase/supabase-js) e o passo imprimiu "OK".
const capturaBun140 = [
  "bun audit v1.4.0 (34cbb9a40)",
  "",
  "body-parser@1.19.0",
  "  express > body-parser",
  "  low: body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement (<1.20.6) - https://github.com/advisories/GHSA-v422-hmwv-36x6",
  "  high: body-parser vulnerable to denial of service when url encoding is enabled (<1.20.3) - https://github.com/advisories/GHSA-qwcr-r2fm-qrc7",
  "",
  "lodash@4.17.20",
  "  (direct dependency)",
  "  high: Command Injection in lodash (<4.17.21) - https://github.com/advisories/GHSA-35jh-r3h4-6jhm",
  "  moderate: Regular Expression Denial of Service (ReDoS) in lodash (>=4.0.0 <4.17.21) - https://github.com/advisories/GHSA-29mw-wpgm-hmr9",
  "",
  "minimist@1.2.5",
  "  mkdirp > minimist",
  "  rc > minimist",
  "  critical: Prototype Pollution in minimist (>=1.0.0 <1.2.6) - https://github.com/advisories/GHSA-xvch-5gv4-984h",
  "",
  "@babel/traverse@7.23.0",
  "  (direct dependency)",
  "  critical: Babel vulnerable to arbitrary code execution when compiling specifically crafted malicious code (<7.23.2) - https://github.com/advisories/GHSA-67hx-6x53-jw92",
  "",
  "uuid@11.1.1, 8.3.2",
  "  artillery > artillery-plugin-publish-metrics > uuid",
  "  moderate: uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided (<11.1.1) - https://github.com/advisories/GHSA-w5hq-g745-h8pq",
  "",
  "7 vulnerabilities (2 critical, 2 high, 2 moderate, 1 low)",
  "",
  "  bun audit fix           upgrade the vulnerable packages within their ranges",
  "  bun audit fix --latest  also cross major versions",
].join("\n");

function comRelatorio(texto, deps, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-prod-"));
  try {
    writeFileSync(path.join(dir, "relatorio.txt"), texto);
    writeFileSync(path.join(dir, "package.json"), JSON.stringify(deps));
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("parse do formato real do bun 1.4.0: pacote@versao, ` > `, (direct dependency), faixa e rodape", () => {
  const findings = parseAuditText(capturaBun140);
  assert.deepEqual(
    findings.map((f) => f.package),
    ["body-parser", "lodash", "minimist", "@babel/traverse", "uuid"],
    "a faixa `bun audit v...` e o resumo nao sao pacotes",
  );
  const porNome = Object.fromEntries(findings.map((f) => [f.package, f]));
  assert.deepEqual(porNome["body-parser"].chains, [["express", "body-parser"]]);
  assert.deepEqual(porNome.lodash.chains, [["lodash"]], "(direct dependency) vira a cadeia do proprio pacote");
  assert.deepEqual(porNome.minimist.chains, [["mkdirp", "minimist"], ["rc", "minimist"]]);
  assert.equal(porNome["@babel/traverse"].range, "7.23.0");
  assert.equal(porNome.uuid.range, "11.1.1, 8.3.2");
  // O rodape recuado (`  bun audit fix ...`) vem depois do resumo e nao pertence a pacote nenhum.
  assert.deepEqual(porNome.uuid.chains, [["artillery", "artillery-plugin-publish-metrics", "uuid"]]);
  assert.equal(findings.reduce((n, f) => n + f.advisories.length, 0), 7);
});

test("main bloqueia HIGH/CRITICAL de producao no relatorio real do bun 1.4.0 (direta, transitiva e cadeia dupla)", () => {
  const rodar = (deps) => comRelatorio(capturaBun140, deps, (dir) => main(["--level", "high", "--input", "relatorio.txt"], dir));
  // Dependencia DIRETA de producao com HIGH: era o caso que mais importava e saia 0.
  assert.equal(rodar({ dependencies: { lodash: "4.17.20" } }), 1);
  // Transitiva alcancada por dependencia de producao (cadeia com ` > `).
  assert.equal(rodar({ dependencies: { express: "4.17.1" } }), 1);
  // Mesma vulnerabilidade por uma cadeia de dev (mkdirp) e uma de producao (rc): bloqueia.
  assert.equal(rodar({ dependencies: { rc: "1.2.8" }, devDependencies: { mkdirp: "0.5.5" } }), 1);
  // Tudo so em devDependencies: informativo, nao bloqueia.
  assert.equal(
    rodar({
      dependencies: { "is-number": "7.0.0" },
      devDependencies: { lodash: "1", express: "1", mkdirp: "1", rc: "1", "@babel/traverse": "1", artillery: "1" },
    }),
    0,
  );
});

test("evaluate nao trata dependencia direta de dev como producao", () => {
  const findings = parseAuditText(capturaBun140);
  const bloqueios = evaluate(findings, ["@babel/traverse"], "critical");
  assert.deepEqual(bloqueios.map((b) => b.package), ["@babel/traverse"]);
  assert.deepEqual(evaluate(findings, ["uuid"], "high"), [], "uuid so tem advisory moderate");
});

test("main aceita a linha limpa real do bun 1.4.0, que vem com o tempo no fim", () => {
  // Medido: `No vulnerabilities found (checked 1 package) [101.00ms]` -- sem aceitar o
  // sufixo de tempo o gate saia 2 justamente no repositorio sem advisory.
  const limpo = ["bun audit v1.4.0 (34cbb9a40)", "", "No vulnerabilities found (checked 1 package) [101.00ms]", ""].join("\n");
  assert.equal(comRelatorio(limpo, { dependencies: { "is-number": "7.0.0" } }, (dir) => main(["--input", "relatorio.txt"], dir)), 0);
  const crlf = limpo.replaceAll("\n", "\r\n");
  assert.equal(comRelatorio(crlf, { dependencies: {} }, (dir) => main(["--input", "relatorio.txt"], dir)), 0);
});

test("main falha fechado para a saida real de falha do coletor (registry fora do ar, sem lockfile)", () => {
  const semRegistry = ["bun audit v1.4.0 (34cbb9a40)", "", "error: POST http://127.0.0.1:9/-/npm/v1/security/advisories/bulk - ConnectionRefused"].join("\n");
  const semLockfile = ["bun audit v1.4.0 (34cbb9a40)", "", "error: missing lockfile, nothing to audit", "note: run 'bun install' first"].join("\n");
  for (const texto of [semRegistry, semLockfile, "", "bun audit v1.4.0 (34cbb9a40)\n"]) {
    assert.equal(comRelatorio(texto, { dependencies: {} }, (dir) => main(["--input", "relatorio.txt"], dir)), 2);
  }
});

test("main trata argumento invalido, package.json ilegivel e relatorio ilegivel como falha operacional (2)", () => {
  // Medido: saiam com stack trace e status 1 -- o codigo de "advisory encontrado".
  comRelatorio("No vulnerabilities found\n", { dependencies: {} }, (dir) => {
    assert.equal(main(["--nao-existe"], dir), 2);
    assert.equal(main(["--level"], dir), 2);
    assert.equal(main(["--level", "urgente", "--input", "relatorio.txt"], dir), 2);
    // `--status` sem valor nao pode pular a conferencia do status em silencio.
    assert.equal(main(["--input", "relatorio.txt", "--status"], dir), 2);
    assert.equal(main(["--input", "relatorio.txt", "--package-json", "nao-existe.json"], dir), 2);
    writeFileSync(path.join(dir, "quebrado.json"), "{ nao e json");
    assert.equal(main(["--input", "relatorio.txt", "--package-json", "quebrado.json"], dir), 2);
    assert.equal(main(["--input", "."], dir), 2, "--input apontando para diretorio");
    assert.equal(main(["--input", "relatorio.txt"], dir), 0);
  });
});

test("CLI roda de verdade quando chamado por link simbolico", () => {
  // Medido: a guarda de modulo principal comparava texto; por link `main` nao rodava e o
  // processo saia 0 sem ler relatorio nenhum.
  const cli = fileURLToPath(new URL("./audit-prod.mjs", import.meta.url));
  comRelatorio(capturaBun140, { dependencies: { lodash: "4.17.20" } }, (dir) => {
    const link = path.join(dir, "audit-por-link.mjs");
    symlinkSync(cli, link);
    const direto = spawnSync(process.execPath, [cli, "--input", "relatorio.txt"], { cwd: dir, encoding: "utf8" });
    assert.equal(direto.status, 1, direto.stdout + direto.stderr);
    assert.match(direto.stderr, /lodash 4\.17\.20 \[high\]/u);
    const porLink = spawnSync(process.execPath, [link, "--input", "relatorio.txt"], { cwd: dir, encoding: "utf8" });
    assert.equal(porLink.status, 1, `por link o CLI deveria sair com 1: ${porLink.stdout}${porLink.stderr}`);
  });
});
