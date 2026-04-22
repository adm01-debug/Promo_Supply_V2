#!/usr/bin/env node
/**
 * CI gate: assert that EVERY `local/date-fns-subpath` violation touching
 * a `date-fns/locale*` import in `src/` is autofixable. An unfixable
 * locale violation usually means the codebase introduced a locale
 * identifier that isn't in the rule's `LOCALE_SUBPATHS` map (e.g. a
 * date-fns upgrade added a new locale and the map drifted, or someone
 * imported a typo'd identifier). Either way, CI must fail loudly so the
 * problem is fixed at the source instead of silently shipping.
 *
 * Input:  ESLint JSON report produced with `--fix-dry-run -f json`.
 * Output: Human summary on stdout, machine-readable JSON on
 *         `ci-artifacts/datefns-locale-fixability.json`. Exits 1 when
 *         any locale violation is unfixable, 0 otherwise.
 *
 * Usage:  node scripts/check-datefns-locale-fixability.mjs <report.json>
 */
import fs from "node:fs";
import path from "node:path";

const reportPath = process.argv[2];
if (!reportPath) {
  console.error(
    "Usage: check-datefns-locale-fixability.mjs <eslint-report.json>",
  );
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (e) {
  console.error(`Failed to read/parse ESLint report at ${reportPath}:`, e.message);
  process.exit(2);
}

const cwd = process.cwd();
const rel = (p) => path.relative(cwd, p) || p;

/**
 * A message is a "locale violation" when:
 *   - it comes from our rule (ruleId === local/date-fns-subpath), AND
 *   - the source line at message.line mentions `date-fns/locale`.
 *
 * Reading the source line keeps the check accurate even though the
 * rule emits multiple messageIds (`barrelLocale`, `unfixable`,
 * `typoLocale`, …) — we don't have to enumerate them.
 *
 * Fixability for THIS gate is a file-level property: ESLint's
 * `--fix-dry-run` sets `output` on a result if the file would be
 * rewritten. A locale violation in a file with no `output` means the
 * rule reported but couldn't fix — exactly what we want to fail on.
 * (Per-message `fix` would be stricter but also flags the rule's
 * intentional report-only "unknown locale" branch even when the rest
 * of the file IS rewritten, which would be confusing for users.)
 */
const localeViolations = [];
for (const result of report) {
  for (const m of result.messages || []) {
    if (m.ruleId !== "local/date-fns-subpath") continue;
    let srcLine = "";
    try {
      const lines = fs.readFileSync(result.filePath, "utf8").split("\n");
      srcLine = lines[(m.line ?? 1) - 1] ?? "";
    } catch {
      // File unreadable — fall through; we'll still flag based on the
      // message but with an empty source preview.
    }
    if (!/date-fns\/locale/.test(srcLine)) continue;
    const fileWouldBeRewritten = typeof result.output === "string";
    localeViolations.push({
      file: rel(result.filePath),
      line: m.line,
      column: m.column,
      messageId: m.messageId ?? null,
      message: m.message,
      sourceLine: srcLine.trim(),
      fixable: fileWouldBeRewritten,
    });
  }
}

const unfixable = localeViolations.filter((v) => !v.fixable);
const fixable = localeViolations.filter((v) => v.fixable);

const summary = {
  generatedAt: new Date().toISOString(),
  totalLocaleViolations: localeViolations.length,
  fixable: fixable.length,
  unfixable: unfixable.length,
  unfixableViolations: unfixable,
  fixableViolations: fixable,
};

try {
  fs.mkdirSync("ci-artifacts", { recursive: true });
  fs.writeFileSync(
    "ci-artifacts/datefns-locale-fixability.json",
    JSON.stringify(summary, null, 2) + "\n",
  );
} catch (e) {
  console.error("Warning: could not write ci-artifacts JSON:", e.message);
}

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const c = isTTY
  ? { bold: "\x1b[1m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", dim: "\x1b[2m", reset: "\x1b[0m" }
  : { bold: "", green: "", red: "", yellow: "", dim: "", reset: "" };

console.log(`${c.bold}▶ date-fns locale autofix coverage${c.reset}`);
console.log(`  Total locale violations: ${c.bold}${localeViolations.length}${c.reset}`);
console.log(`  ${c.green}Fixable${c.reset}:   ${c.bold}${fixable.length}${c.reset}`);
console.log(`  ${c.red}Unfixable${c.reset}: ${c.bold}${unfixable.length}${c.reset}`);

if (unfixable.length > 0) {
  console.log("");
  console.log(`${c.red}${c.bold}✗ Unfixable locale imports detected:${c.reset}`);
  for (const v of unfixable) {
    console.log(
      `  ${c.yellow}•${c.reset} ${v.file}:${v.line}:${v.column} ${c.dim}[${v.messageId}]${c.reset}`,
    );
    if (v.sourceLine) console.log(`      ${c.dim}${v.sourceLine}${c.reset}`);
    console.log(`      ${v.message}`);
  }
  console.log("");
  console.log(
    `${c.dim}Fix:${c.reset} either correct the locale identifier OR add the` +
      ` missing camelCase→kebab mapping to LOCALE_SUBPATHS in` +
      ` eslint-rules/date-fns-subpath.js.`,
  );
  console.log(
    `${c.dim}Detail:${c.reset} ci-artifacts/datefns-locale-fixability.json`,
  );
  process.exit(1);
}

console.log("");
console.log(`${c.green}✓ Every date-fns/locale violation is autofixable.${c.reset}`);
process.exit(0);
