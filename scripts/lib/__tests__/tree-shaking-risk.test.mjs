/**
 * Regression tests for tree-shaking risk scoring.
 *
 * Two pieces of logic are tested:
 *
 *  1. BARREL_IMPORT_RE / countBarrelImports
 *     The regex must match exactly the un-tree-shakable barrel
 *     entrypoints (`date-fns`, `date-fns/locale`) and reject every
 *     deep subpath (`date-fns/format`, `date-fns/locale/pt-BR`, etc.).
 *     Getting this wrong would either:
 *       a) under-report (silently flip risk → "ok" when there are
 *          real barrel imports), letting bundle bloat slip in, OR
 *       b) over-report (flag safe `date-fns/format` imports as
 *          barrels), turning the dependency-health page red for
 *          correctly-tree-shaken code.
 *
 *  2. computeRiskLevel
 *     Boundary: 0 → ok, 1..4 → warning, ≥5 → critical. Off-by-one
 *     here would make the dashboard misclassify a project that
 *     just crossed the threshold.
 */
import { describe, it, expect } from "vitest";
import {
  BARREL_IMPORT_RE,
  countBarrelImports,
  computeRiskLevel,
} from "../tree-shaking-risk.mjs";

describe("BARREL_IMPORT_RE — barrel detection", () => {
  // Each call must reset lastIndex; verify by running .test() twice on
  // the same input and ensuring both return true.
  it("is /g but countBarrelImports resets lastIndex between calls", () => {
    const src = `import { format } from "date-fns";`;
    expect(countBarrelImports(src)).toBe(1);
    expect(countBarrelImports(src)).toBe(1);
  });

  describe("MATCHES barrel imports (un-tree-shakable)", () => {
    it.each([
      [`import { format } from "date-fns";`],
      [`import { format } from 'date-fns';`],
      [`import { ptBR } from "date-fns/locale";`],
      [`import { ptBR } from 'date-fns/locale';`],
      [`import type { Locale } from "date-fns/locale";`],
      [`import * as df from "date-fns";`],
      [`import { format, parseISO } from "date-fns";`], // multi-named still 1 import
    ])("matches: %s", (line) => {
      expect(countBarrelImports(line)).toBe(1);
    });

    it("counts multiple barrel imports across a file", () => {
      const src = [
        `import { format } from "date-fns";`,
        `import { ptBR } from "date-fns/locale";`,
        `import { addDays } from "date-fns";`,
      ].join("\n");
      expect(countBarrelImports(src)).toBe(3);
    });
  });

  describe("DOES NOT MATCH safe deep subpaths (tree-shakable)", () => {
    it.each([
      [`import { format } from "date-fns/format";`],
      [`import format from "date-fns/format";`],
      [`import { parseISO } from "date-fns/parseISO";`],
      [`import { addDays } from "date-fns/addDays";`],
      [`import { ptBR } from "date-fns/locale/pt-BR";`],
      [`import { enUS } from "date-fns/locale/en-US";`],
      [`import format from 'date-fns/format';`],
      // Distinct package names that merely contain the substring must NOT match.
      [`import x from "date-fns-tz";`],
      [`import x from "@my/date-fns-wrapper";`],
    ])("ignores: %s", (line) => {
      expect(countBarrelImports(line)).toBe(0);
    });

    it("ignores barrel-shaped strings that are NOT in import position", () => {
      // The regex is anchored on `from '…'`. A bare string literal
      // mentioning the barrel path (e.g. an error message, a doc
      // comment, a config map) must not be scored as an import.
      const src = [
        `const msg = "do not import from date-fns directly";`,
        `// see: https://example.com/date-fns/locale`,
        `const allowList = { "date-fns": false, "date-fns/locale": false };`,
      ].join("\n");
      expect(countBarrelImports(src)).toBe(0);
    });

    it("scores a mixed file correctly (barrel + safe + noise)", () => {
      const src = [
        `import { format } from "date-fns";              // barrel ❌`,
        `import { addDays } from "date-fns/addDays";     // safe ✅`,
        `import { ptBR } from "date-fns/locale";         // barrel ❌`,
        `import { enUS } from "date-fns/locale/en-US";   // safe ✅`,
        `import x from "date-fns-tz";                    // unrelated ✅`,
      ].join("\n");
      expect(countBarrelImports(src)).toBe(2);
    });
  });

  it("handles empty / non-string input defensively", () => {
    expect(countBarrelImports("")).toBe(0);
    // @ts-expect-error — defensive guard, exercised in the runtime path
    expect(countBarrelImports(null)).toBe(0);
    // @ts-expect-error — defensive guard, exercised in the runtime path
    expect(countBarrelImports(undefined)).toBe(0);
  });

  it("regex source is the single source of truth (no drift)", () => {
    // If this constant ever changes, the cache key in
    // generate-dependency-health.mjs is hashed on it (SCAN_VERSION should
    // bump in lock-step). This assertion is the canary.
    expect(BARREL_IMPORT_RE.source).toBe(
      "from\\s+['\"](date-fns(?:\\/locale)?)['\"]",
    );
    expect(BARREL_IMPORT_RE.flags).toBe("g");
  });
});

describe("computeRiskLevel — threshold boundaries", () => {
  it("returns 'ok' when there are zero barrel imports", () => {
    expect(computeRiskLevel(0)).toBe("ok");
  });

  it.each([1, 2, 3, 4])("returns 'warning' for n=%i (< 5)", (n) => {
    expect(computeRiskLevel(n)).toBe("warning");
  });

  it.each([5, 6, 50, 1000])("returns 'critical' for n=%i (>= 5)", (n) => {
    expect(computeRiskLevel(n)).toBe("critical");
  });

  it("treats negative / NaN / non-finite counts as 'ok' (defensive)", () => {
    expect(computeRiskLevel(-1)).toBe("ok");
    expect(computeRiskLevel(NaN)).toBe("ok");
    expect(computeRiskLevel(Infinity)).toBe("ok"); // non-finite → defensive bail
    // @ts-expect-error — defensive guard
    expect(computeRiskLevel(undefined)).toBe("ok");
  });
});
