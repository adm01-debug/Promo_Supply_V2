#!/usr/bin/env node
// Bloqueia o CI quando `bun audit` reporta advisory HIGH/CRITICAL alcancavel a
// partir de uma dependencia de PRODUCAO (package.json#dependencies). Advisories
// cujas cadeias comecam so em devDependencies (vite, vitest, eslint, babel...)
// seguem informativas: nao chegam ao bundle nem as edges.
//
// `bun audit` nao tem --prod e o --json devolve o bulk de advisories sem filtrar
// pela versao instalada; por isso o parse e feito na saida de texto, que ja vem
// filtrada e traz a cadeia de dependencia de cada ocorrencia. Formato MEDIDO com o
// bun 1.4.0 (a versao pinada no CI) -- `pacote@versao`, cadeia com ` > ` e
// `(direct dependency)` quando o pacote esta no proprio package.json:
//
//   bun audit v1.4.0 (34cbb9a40)
//
//   minimist@1.2.5
//     mkdirp > minimist
//     rc > minimist
//     critical: Prototype Pollution in minimist (>=1.0.0 <1.2.6) - https://github.com/advisories/GHSA-...
//
//   lodash@4.17.20
//     (direct dependency)
//     high: Command Injection in lodash (<4.17.21) - https://github.com/advisories/GHSA-...
//
//   2 vulnerabilities (1 critical, 1 high)
//
// O formato antigo (`picomatch  <2.3.2` + cadeia com ` › `) continua aceito.
//
// R2-INF-009: `bun audit` sai com 1 tanto para advisory quanto para falha de
// registry, e o passo do CI neutraliza esse status. Por isso o gate NAO aceita
// "texto que fala em vulnerability": exige o relatorio completo (linha de resumo
// no formato do bun, com as contagens fechando com os advisories lidos) e falha
// fechado para qualquer erro operacional — mesmo que a mensagem contenha a
// palavra "vulnerability" (ex.: "Could not retrieve the vulnerability database").
// O status do coletor chega pelo --status (gravado pelo CI), para crash/abort
// nao passar como verde.
//
// Uso: node scripts/ci/audit-prod.mjs [--level high|critical] [--input arquivo] [--status arquivo]

import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolverExecutavel } from "../lib/seguranca-processo.mjs";

const SEVERITIES = ["low", "moderate", "high", "critical"];

// `bun audit` usa 0 (nada no nivel) e 1 (advisory OU falha de registry: os dois
// casos sao indistinguiveis pelo status, por isso o relatorio e' quem decide).
const STATUS_COLETOR_VALIDOS = new Set([0, 1]);

// Resumo que o bun 1.4.0 (versao pinada no CI) imprime — nada mais e' relatorio.
// Medido: a linha limpa vem com o tempo no fim, mesmo redirecionada para arquivo
// (`No vulnerabilities found (checked 1 package) [101.00ms]`). Sem o sufixo opcional o
// gate saia 2 justamente no repositorio SEM advisory.
const RESUMO_LIMPO = /^No vulnerabilities found(?: \(checked \d+ packages?\))?\.?(?: \[[\d.]+\s*m?s\])?$/iu;
const RESUMO_CONTADO = /^(\d+)\s+vulnerabilit(?:y|ies)\s*\(([^)]*)\)\.?$/iu;
// Erro operacional do coletor: o bun escreve "error: ..." no proprio fluxo.
// A forma reconhecida como erro operacional e' exatamente uma linha iniciada
// por "error:". O  anterior casava antes do hifen e confundia cabecalhos de
// pacote como error-ex@1.2.3 (dados validos do relatorio) com erro operacional.
const LINHA_ERRO = /^error:/iu;
// Primeira linha da saida (`bun audit v1.4.0 (34cbb9a40)`): nao e pacote.
const FAIXA_DO_BUN = /^bun audit v\d/iu;
// Cabecalho de pacote do bun atual: `nome@versao[, versao...]` (com ou sem escopo).
const CABECALHO_VERSAO = /^((?:@[^\s@/]+\/)?[^\s@]+)@(\S.*)$/u;
// Cabecalho do formato antigo: `nome  faixa`.
const CABECALHO_FAIXA = /^(@?[a-z][^\s]*)\s+(.+)$/u;
// Pacote que esta no proprio package.json: o bun nao imprime cadeia, imprime este marcador.
const DEPENDENCIA_DIRETA = /^\(direct dependency\)$/iu;

export function parseAuditText(text) {
  const findings = [];
  let current = null;
  for (const rawLine of String(text ?? "").replace(/\r\n?/gu, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (!/^\s/u.test(line)) {
      // Linha sem recuo que nao e cabecalho (faixa do bun, resumo "N vulnerabilities (...)")
      // FECHA o pacote corrente. Medido no bun 1.4.0: a faixa virava o pacote "bun", nenhum
      // `nome@versao` casava o cabecalho antigo e TODO advisory do relatorio ia para esse
      // pacote fantasma -- a contagem fechava e o gate saia 0 com HIGH em producao.
      const match = FAIXA_DO_BUN.test(line) ? null : (line.match(CABECALHO_VERSAO) ?? line.match(CABECALHO_FAIXA));
      if (!match) {
        current = null;
        continue;
      }
      current = { package: match[1], range: match[2], chains: [], advisories: [] };
      findings.push(current);
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    const severity = trimmed.match(/^(low|moderate|high|critical):\s*(.*)$/u);
    if (severity) {
      current.advisories.push({ severity: severity[1], title: severity[2] });
      continue;
    }
    // Dependencia direta: a cadeia e o proprio pacote (e ele que esta, ou nao, em `dependencies`).
    if (DEPENDENCIA_DIRETA.test(trimmed)) {
      current.chains.push([current.package]);
      continue;
    }
    // Separador ` > ` (bun atual) ou ` › ` (formato antigo), sempre entre espacos.
    const chain = trimmed.split(/\s+[›>]\s+/u).map((part) => part.trim()).filter(Boolean);
    if (chain.length) current.chains.push(chain);
  }
  return findings;
}

export function evaluate(findings, prodDeps, minLevel = "high") {
  const threshold = SEVERITIES.indexOf(minLevel);
  const prod = new Set(prodDeps);
  const blocking = [];
  for (const finding of findings) {
    const worst = Math.max(-1, ...finding.advisories.map((a) => SEVERITIES.indexOf(a.severity)));
    if (worst < threshold) continue;
    // Cadeia de um unico elemento = a propria dependencia direta.
    const prodChains = finding.chains.filter((chain) => prod.has(chain[0]));
    if (prodChains.length === 0) continue;
    blocking.push({
      package: finding.package,
      range: finding.range,
      severity: SEVERITIES[worst],
      chains: prodChains.map((chain) => chain.join(" › ")),
      advisories: finding.advisories.filter((a) => SEVERITIES.indexOf(a.severity) >= threshold).map((a) => a.title),
    });
  }
  return blocking;
}

/**
 * Diz se o texto e' um relatorio de audit COMPLETO (e nao um erro operacional
 * que por acaso cita a palavra "vulnerability"). Sem resumo reconhecivel, ou com
 * contagens que nao fecham, o gate falha fechado.
 */
export function validarRelatorio(text) {
  const linhas = String(text ?? "")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
  const erro = linhas.find((linha) => LINHA_ERRO.test(linha));
  if (erro) return { ok: false, motivo: `erro operacional do coletor: ${erro.slice(0, 300)}` };
  if (linhas.some((linha) => RESUMO_LIMPO.test(linha))) return { ok: true, total: 0 };
  const resumo = linhas.map((linha) => linha.match(RESUMO_CONTADO)).find(Boolean);
  if (!resumo) return { ok: false, motivo: "saida sem a linha de resumo do bun audit (relatorio parcial ou falha operacional)" };
  const total = Number(resumo[1]);
  const contagens = [...resumo[2].matchAll(/(\d+)\s+(low|moderate|high|critical)/giu)].map((m) => Number(m[1]));
  const soma = contagens.reduce((acc, numero) => acc + numero, 0);
  if (contagens.length === 0 || soma !== total) {
    return { ok: false, motivo: `resumo inconsistente: total ${total}, contagens [${contagens.join(", ")}]` };
  }
  return { ok: true, total };
}

/** Le o status preservado pelo CI. Ausente/ilegivel/fora de {0,1} e' falha operacional. */
export function lerStatusColetor(arquivo, root) {
  const caminho = path.resolve(root, arquivo);
  if (!existsSync(caminho)) return { ok: false, motivo: `status do coletor ausente: ${arquivo}` };
  const texto = readFileSync(caminho, "utf8").trim();
  if (!/^\d+$/u.test(texto)) return { ok: false, motivo: `status do coletor ilegivel: ${texto.slice(0, 60) || "(vazio)"}` };
  const codigo = Number(texto);
  if (!STATUS_COLETOR_VALIDOS.has(codigo)) {
    return { ok: false, motivo: `status ${codigo} do coletor nao e 0/1 (bun audit interrompido?)` };
  }
  return { ok: true, codigo };
}

function parseArgs(argv) {
  const args = { level: "high", input: null, packageJson: "package.json", status: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--level") args.level = argv[++index];
    else if (argv[index] === "--input") args.input = argv[++index];
    else if (argv[index] === "--package-json") args.packageJson = argv[++index];
    else if (argv[index] === "--status") args.status = argv[++index];
    else throw new Error(`Argumento desconhecido: ${argv[index]}`);
    // Flag no fim da linha, sem valor: `--status` sozinho deixava `args.status` vazio e a
    // conferencia do status do coletor era pulada em silencio.
    if (argv[index] === undefined) throw new Error(`${argv[index - 1]} exige um valor`);
  }
  if (!SEVERITIES.includes(args.level)) throw new Error(`--level invalido: ${args.level}`);
  return args;
}

// S4036/CWE-427: o binario e resolvido para caminho absoluto a partir do PATH do
// processo pai (scripts/lib/seguranca-processo.mjs), para que o filho nao faca
// busca por PATH.
export function main(argv = process.argv.slice(2), root = process.cwd()) {
  // Argumento invalido e package.json ausente/ilegivel sao falha operacional (2), nao
  // "advisory encontrado" (1): sem o try/catch saiam com stack trace e status 1.
  let args;
  let prodDeps;
  try {
    args = parseArgs(argv);
    const pkg = JSON.parse(readFileSync(path.resolve(root, args.packageJson), "utf8"));
    prodDeps = Object.keys(pkg.dependencies ?? {});
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    return 2;
  }

  if (args.status) {
    const status = lerStatusColetor(args.status, root);
    if (!status.ok) {
      console.error(`ERRO: ${status.motivo}`);
      return 2;
    }
  }

  let text;
  if (args.input) {
    const caminho = path.resolve(root, args.input);
    if (!existsSync(caminho)) {
      console.error(`ERRO: relatorio de audit ausente: ${args.input}`);
      return 2;
    }
    try {
      text = readFileSync(caminho, "utf8");
    } catch (error) {
      console.error(`ERRO: relatorio de audit ilegivel: ${args.input} (${error.code ?? error.message})`);
      return 2;
    }
  } else {
    let bunBin;
    try {
      bunBin = resolverExecutavel("bun");
    } catch (error) {
      console.error(`ERRO: nao foi possivel executar bun audit: ${error.message}`);
      return 2;
    }
    const run = spawnSync(bunBin, ["audit", "--audit-level=low"], { cwd: root, encoding: "utf8" });
    if (run.error || run.signal) {
      console.error(`ERRO: nao foi possivel executar bun audit: ${run.error?.message ?? `sinal ${run.signal}`}`);
      return 2;
    }
    text = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  }

  const relatorio = validarRelatorio(text);
  if (!relatorio.ok) {
    console.error(`ERRO: ${relatorio.motivo}`);
    console.error(text.trim().slice(0, 2000) || "(vazia)");
    return 2;
  }

  const findings = parseAuditText(text);
  const advisories = findings.reduce((acc, finding) => acc + finding.advisories.length, 0);
  if (advisories !== relatorio.total) {
    console.error(
      `ERRO: relatorio parcial — o resumo declara ${relatorio.total} vulnerabilidade(s), mas ${advisories} advisory(s) foram lidos.`,
    );
    return 2;
  }

  const blocking = evaluate(findings, prodDeps, args.level);
  console.log(`bun audit: ${findings.length} pacote(s) com advisory; ${prodDeps.length} dependencias de producao consideradas.`);
  if (blocking.length === 0) {
    console.log(`OK: nenhuma advisory >= ${args.level} alcancavel por dependencia de producao.`);
    return 0;
  }
  console.error(`\nFALHA: ${blocking.length} pacote(s) com advisory >= ${args.level} em dependencia de producao:`);
  for (const item of blocking) {
    console.error(`  ${item.package} ${item.range} [${item.severity}]`);
    for (const chain of item.chains) console.error(`    via ${chain}`);
    for (const advisory of item.advisories) console.error(`    - ${advisory}`);
  }
  console.error("Atualize a dependencia (bun update <pacote>) ou registre a excecao com justificativa no PR.");
  return 1;
}

// Comparacao por caminho real: chamado por link simbolico, `argv[1]` e o caminho do link e
// `import.meta.url` o do arquivo -- a igualdade textual falhava, `main` nao rodava e o gate
// saia 0 sem ter lido relatorio nenhum.
function chamadoDireto() {
  try {
    return realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (process.argv[1] && chamadoDireto()) {
  process.exit(main());
}
