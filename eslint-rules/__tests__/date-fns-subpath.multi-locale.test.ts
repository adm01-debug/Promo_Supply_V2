/**
 * Multi-locale fixture autofix test for `local/date-fns-subpath`.
 *
 * Pinned fixture: eslint-rules/__fixtures__/bad-date-fns-multi-locale.ts
 *
 * Loads a single on-disk file containing FIVE distinct
 * `import … from "date-fns/locale"` declarations and asserts the
 * autofixer rewrites every one to its canonical kebab-cased subpath in
 * a single ESLint pass. The fixture intentionally exercises every
 * branch of the locale-rewrite path together so regressions in any
 * single branch surface here:
 *
 *   • Single-specifier barrel    — `{ ptBR }`             → date-fns/locale/pt-BR
 *   • Multi-specifier barrel     — `{ enUS, frCA, deAT }` → 3 separate subpath imports
 *   • Aliased specifier          — `{ jaHira as japaneseHiragana }` → preserves alias
 *   • Mixed-case kebab subpaths  — `{ srLatn, beTarask, uzCyrl }`   → preserves Latn/tarask/Cyrl
 *   • Type-only declaration      — `import type { Locale }`         → `import type { … }`
 *
 * Why a separate test file (vs adding another `it` to behavior.test.ts):
 *   The behavior suite is already at ~370 lines. Splitting per-fixture
 *   keeps each test file focused on one scenario and well under the
 *   400-line soft cap, so a future failure points unambiguously at the
 *   multi-locale rewrite path without scrolling through unrelated cases.
 */
import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import * as tsParser from "@typescript-eslint/parser";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error - plain JS rule, no type declarations
import { dateFnsSubpath } from "../date-fns-subpath.js";

const RULE_ID = "local/date-fns-subpath";

// TS parser is required because the fixture uses `import type` syntax
// to exercise the rule's type-only branch. The behavior tests use
// espree because they only cover plain JS imports — keep this config
// local to avoid regressing those.
const CONFIG = {
  files: ["**/*.ts"],
  plugins: { local: { rules: { "date-fns-subpath": dateFnsSubpath } } },
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020 as const,
    sourceType: "module" as const,
  },
  rules: { [RULE_ID]: "error" as const },
};

function lint(src: string) {
  return new Linter().verify(src, CONFIG as never, "x.js");
}
function fix(src: string) {
  return new Linter().verifyAndFix(src, CONFIG as never, { filename: "x.js" });
}

describe("local/date-fns-subpath — multi-locale fixture autofix", () => {
  // Read once; every assertion below operates on the same loaded source
  // so the test cost stays at one disk read regardless of test count.
  const fixturePath = resolve(
    __dirname,
    "../__fixtures__/bad-date-fns-multi-locale.ts",
  );
  const raw = readFileSync(fixturePath, "utf8");
  // Strip every disable directive so the linter sees the raw violations.
  // The `g`+`m` flags are required because the fixture carries one
  // `eslint-disable-next-line` per violating declaration.
  const src = raw.replace(/^\s*\/\/ eslint-disable-next-line[^\n]*\n/gm, "");

  // Sanity guard: if someone renames or deletes the fixture's
  // declarations this test would silently pass otherwise.
  it("fixture preconditions: contains the expected 5 barrel declarations", () => {
    const barrelCount = (src.match(/from "date-fns\/locale"/g) ?? []).length;
    expect(barrelCount).toBe(5);
  });

  it("reports one barrelLocale violation per declaration (5 total)", () => {
    const ruleHits = lint(src).filter((m) => m.ruleId === RULE_ID);
    // 5 declarations → 5 reports, all `barrelLocale`. Per-specifier
    // `unfixable` reports must NOT appear: every identifier in the
    // fixture is a known locale.
    expect(ruleHits).toHaveLength(5);
    expect(ruleHits.every((m) => m.messageId === "barrelLocale")).toBe(true);
    // Every report must carry an autofix descriptor — the whole point
    // of the fixture is that all 5 declarations are fully fixable.
    expect(ruleHits.every((m) => Boolean(m.fix))).toBe(true);
  });

  it("autofix rewrites every barrel to its canonical kebab subpath", () => {
    const fixed = fix(src);
    expect(fixed.fixed).toBe(true);

    // ── Per-locale assertions ────────────────────────────────────────
    // Each `toContain` is the EXACT line the rule should emit. Exact
    // matches (rather than regex-fuzzy) catch silent regressions like
    // `date-fns/locale/srLatn` (camelCase leak) or `date-fns/locale/PT-BR`
    // (uppercased region).
    expect(fixed.output).toContain(
      'import { ptBR } from "date-fns/locale/pt-BR";',
    );
    expect(fixed.output).toContain(
      'import { enUS } from "date-fns/locale/en-US";',
    );
    expect(fixed.output).toContain(
      'import { frCA } from "date-fns/locale/fr-CA";',
    );
    expect(fixed.output).toContain(
      'import { deAT } from "date-fns/locale/de-AT";',
    );
    // Mixed-case kebab subpaths must preserve their original casing —
    // `Latn`, `tarask`, `Cyrl` are NOT just lowercased identifier suffixes.
    expect(fixed.output).toContain(
      'import { srLatn } from "date-fns/locale/sr-Latn";',
    );
    expect(fixed.output).toContain(
      'import { beTarask } from "date-fns/locale/be-tarask";',
    );
    expect(fixed.output).toContain(
      'import { uzCyrl } from "date-fns/locale/uz-Cyrl";',
    );
    // Aliased specifier — `as` clause must survive the rewrite.
    expect(fixed.output).toContain(
      'import { jaHira as japaneseHiragana } from "date-fns/locale/ja-Hira";',
    );
    // Type-only declaration — must remain `import type` after rewrite.
    expect(fixed.output).toContain(
      'import type { Locale } from "date-fns/locale/pt-BR";',
    );
  });

  it("removes every bare 'date-fns/locale' barrel from the output", () => {
    const fixed = fix(src);
    // No bare-barrel imports may survive — every one was fixable.
    expect(fixed.output).not.toMatch(/from "date-fns\/locale"\s*;/);
  });

  it("produces an idempotent, lint-clean output", () => {
    const fixed = fix(src);
    // First post-fix lint: zero rule violations remain.
    expect(lint(fixed.output)).toHaveLength(0);
    // Second autofix pass is a strict no-op — the rewriter must not
    // chase its own tail across runs.
    const second = fix(fixed.output);
    expect(second.fixed).toBe(false);
    expect(second.output).toBe(fixed.output);
  });

  it("emits the multi-specifier barrel as one line per subpath", () => {
    const fixed = fix(src);
    // The 3-specifier barrel `{ enUS, frCA, deAT }` must split into
    // exactly 3 separate `import` lines (one per locale), not collapse
    // into a single multi-source import (which doesn't exist in JS) or
    // drop any specifier silently.
    const subpathImportLines = fixed.output
      .split("\n")
      .filter((l) => /^import .* from "date-fns\/locale\/[A-Za-z-]+";$/.test(l));
    // 1 (ptBR) + 3 (enUS, frCA, deAT) + 1 (jaHira alias) + 3 (srLatn,
    // beTarask, uzCyrl) + 1 (type Locale) = 9 emitted lines.
    expect(subpathImportLines).toHaveLength(9);
  });
});
