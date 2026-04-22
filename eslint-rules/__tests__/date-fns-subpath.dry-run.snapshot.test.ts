/**
 * Snapshot tests for the `local/date-fns-subpath` autofix dry-run output.
 *
 * For each fixture in `__fixtures__/dry-run-fixtures.ts` we:
 *   1. Run ESLint in `--fix-dry-run` mode (via the JS API: pass `fix: true`
 *      to `Linter.verifyAndFix` and inspect `output` + `messages` without
 *      writing to disk).
 *   2. Normalize the result into a stable shape — file paths replaced with
 *      `<fixture>`, only the fields we care about kept (the rewritten
 *      source, plus `messageId` / `line` / `column` / `fixable` /
 *      `severity` for each report).
 *   3. Snapshot the normalized object.
 *
 * **Why snapshot the normalized form, not the raw ESLint result?**
 * Raw results include absolute file paths, `nodeType` (parser-version-
 * dependent), and a `fix` field with byte offsets that drift if the
 * fixture text grows by a single character. Normalizing keeps the
 * snapshots stable across ESLint upgrades and OS line endings while
 * still capturing every meaningful axis of the autofix:
 *   - Did it propose a rewrite at all? (`output` present / null)
 *   - What's the rewritten text? (full string, exact)
 *   - Which messages did it emit? (`messageId` + position)
 *   - Which messages were fixable vs not? (`fixable` boolean)
 *
 * **Updating snapshots after an intentional rule change:**
 *   bunx vitest run eslint-rules/__tests__/date-fns-subpath.dry-run.snapshot.test.ts -u
 *
 * **Reading a failing diff:**
 * The serialized snapshot is plain JSON. A hunk like
 *   - "fixable": true
 *   + "fixable": false
 * means the rule no longer offers an autofix for that shape — usually a
 * regression. A hunk in `output` means the rewrite text changed; verify
 * it matches the new canonical form before updating the snapshot.
 */
import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";
import { FIXTURES } from "./__fixtures__/dry-run-fixtures.js";

const CONFIG = {
  files: ["**/*.js"],
  plugins: { local: { rules: { "date-fns-subpath": dateFnsSubpath } } },
  languageOptions: {
    ecmaVersion: 2020 as const,
    sourceType: "module" as const,
  },
  rules: { "local/date-fns-subpath": "error" as const },
};

interface NormalizedMessage {
  ruleId: string | null;
  messageId: string | null;
  severity: number;
  line: number | undefined;
  column: number | undefined;
  fixable: boolean;
  message: string;
}

interface NormalizedResult {
  /** True when the rule proposed at least one autofix. */
  fixed: boolean;
  /**
   * The rewritten source. Equal to the input source when no fix
   * was proposed — that itself is a meaningful signal we want to
   * snapshot, not collapse to `null`.
   */
  output: string;
  /** Stable, ordered list of every report emitted by our rule. */
  messages: NormalizedMessage[];
}

/**
 * Run ESLint over `source` with our rule, applying autofixes
 * non-destructively (verifyAndFix uses an in-memory copy). Then
 * re-lint the rewritten output to capture residual messages —
 * unfixable shapes still report after the fix pass, and that
 * residue is part of what we snapshot.
 */
function runDryRun(source: string): NormalizedResult {
  const linter = new Linter();
  const fixResult = linter.verifyAndFix(source, CONFIG as never, {
    filename: "fixture.js",
  });
  // verify() against the post-fix output gives us residual messages
  // (e.g. "unknown locale" reports the rule emits but can't fix).
  const residualMessages = linter.verify(
    fixResult.output,
    CONFIG as never,
    "fixture.js",
  );
  // ALSO re-collect messages from the original source so we capture
  // both initial + residual reports — some shapes report once and
  // disappear after fix, others persist. The union (deduped by
  // line+column+messageId) is the stable signal we snapshot.
  const initialMessages = linter.verify(source, CONFIG as never, "fixture.js");

  const seen = new Set<string>();
  const merged: NormalizedMessage[] = [];
  for (const m of [...initialMessages, ...residualMessages]) {
    if (m.ruleId !== "local/date-fns-subpath" && m.ruleId !== null) continue;
    const key = `${m.ruleId}:${m.messageId ?? ""}:${m.line}:${m.column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      ruleId: m.ruleId,
      messageId: m.messageId ?? null,
      severity: m.severity,
      line: m.line,
      column: m.column,
      // `fix` is set when ESLint produced a concrete fixer for this
      // specific message. Snapshotting the boolean (not the byte
      // offsets) keeps diffs readable while still pinning the
      // fixable/unfixable verdict per report.
      fixable: Boolean(m.fix),
      message: m.message,
    });
  }
  // Deterministic order — vital for stable snapshots across runs.
  merged.sort(
    (a, b) =>
      (a.line ?? 0) - (b.line ?? 0) ||
      (a.column ?? 0) - (b.column ?? 0) ||
      (a.messageId ?? "").localeCompare(b.messageId ?? ""),
  );

  return {
    fixed: fixResult.fixed,
    output: fixResult.output,
    messages: merged,
  };
}

describe("local/date-fns-subpath — autofix dry-run snapshots", () => {
  for (const { name, source } of FIXTURES) {
    it(`matches snapshot for "${name}"`, () => {
      const result = runDryRun(source);
      // Snapshot the input alongside the output so the snapshot file
      // is self-documenting — readers don't have to cross-reference
      // dry-run-fixtures.ts to know what shape produced the rewrite.
      expect({ input: source, ...result }).toMatchSnapshot();
    });
  }
});
