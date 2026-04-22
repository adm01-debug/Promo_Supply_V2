/**
 * Regression tests for tree-shaking risk scoring.
 *
 * Two pieces of logic are tested:
 *
 *  1. BARREL_IMPORT_RE / countBarrelImports (back-compat regex path)
 *  2. Scoped matcher: classifySpecifier + findBarrelOffenders
 *  3. computeRiskLevel boundary buckets
 *
 * Why both APIs? The regex is the cache-key canary (changing it
 * invalidates every cached scan). The scoped matcher is the new
 * extensible front-door — adding a rule for `lodash` should not
 * touch the regex.
 */
import { describe, it, expect } from "vitest";
import {
  BARREL_IMPORT_RE,
  countBarrelImports,
  computeRiskLevel,
  classifySpecifier,
  findBarrelOffenders,
  ruleOwnsSpecifier,
  DEFAULT_RULES,
} from "../tree-shaking-risk.mjs";

describe("BARREL_IMPORT_RE — barrel detection (legacy regex)", () => {
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
      [`import { format, parseISO } from "date-fns";`],
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
      [`import x from "date-fns-tz";`],
      [`import x from "@my/date-fns-wrapper";`],
    ])("ignores: %s", (line) => {
      expect(countBarrelImports(line)).toBe(0);
    });

    it("ignores barrel-shaped strings that are NOT in import position", () => {
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
    expect(BARREL_IMPORT_RE.source).toBe(
      "from\\s+['\"](date-fns(?:\\/locale)?)['\"]",
    );
    expect(BARREL_IMPORT_RE.flags).toBe("g");
  });
});

describe("ruleOwnsSpecifier — package-boundary safety", () => {
  const rule = DEFAULT_RULES[0];
  it.each([
    ["date-fns", true],
    ["date-fns/format", true],
    ["date-fns/locale", true],
    ["date-fns/locale/pt-BR", true],
    ["date-fns-tz", false],         // substring trap
    ["date-fns-wrapper", false],
    ["@my/date-fns", false],
    ["react", false],
    ["", false],
  ])("ownsSpecifier(%s) → %s", (spec, expected) => {
    expect(ruleOwnsSpecifier(rule, spec)).toBe(expected);
  });
});

describe("classifySpecifier — scoped matching", () => {
  it.each([
    ["date-fns", "barrel"],
    ["date-fns/locale", "barrel"],
  ])("flags barrel root/subpath: %s → %s", (spec, expected) => {
    expect(classifySpecifier(spec)).toBe(expected);
  });

  it.each([
    ["date-fns/format", "safe"],
    ["date-fns/parseISO", "safe"],
    ["date-fns/addDays", "safe"],
    ["date-fns/locale/pt-BR", "safe"],
    ["date-fns/locale/en-US", "safe"],
  ])("treats deep subpath as safe: %s → %s", (spec, expected) => {
    expect(classifySpecifier(spec)).toBe(expected);
  });

  it.each([
    ["date-fns-tz", "unrelated"],
    ["@my/date-fns-wrapper", "unrelated"],
    ["react", "unrelated"],
    ["lodash/get", "unrelated"],
  ])("returns 'unrelated' for non-owned packages: %s", (spec, expected) => {
    expect(classifySpecifier(spec)).toBe(expected);
  });

  it("supports custom rule tables (e.g. lodash)", () => {
    const rules = [
      {
        package: "lodash",
        barrelPaths: ["lodash"],
        safeSubpathRe: /^lodash\/[^/]+$/,
      },
    ];
    expect(classifySpecifier("lodash", rules)).toBe("barrel");
    expect(classifySpecifier("lodash/get", rules)).toBe("safe");
    expect(classifySpecifier("lodash-es", rules)).toBe("unrelated");
    // date-fns is not in this custom table → unrelated
    expect(classifySpecifier("date-fns", rules)).toBe("unrelated");
  });
});

describe("findBarrelOffenders — positional reporting", () => {
  it("returns specifier + 1-indexed line for each barrel", () => {
    const src = [
      `// header comment`,
      `import { format } from "date-fns";`,           // line 2
      `import { addDays } from "date-fns/addDays";`,  // safe
      `import { ptBR } from "date-fns/locale";`,      // line 4
    ].join("\n");
    const offenders = findBarrelOffenders(src);
    expect(offenders).toHaveLength(2);
    expect(offenders[0]).toMatchObject({ specifier: "date-fns", line: 2 });
    expect(offenders[1]).toMatchObject({ specifier: "date-fns/locale", line: 4 });
  });

  it("excludes safe subpaths even when interleaved", () => {
    const src = [
      `import { format } from "date-fns/format";`,
      `import { ptBR } from "date-fns/locale/pt-BR";`,
      `import x from "date-fns-tz";`,
    ].join("\n");
    expect(findBarrelOffenders(src)).toEqual([]);
  });

  it("returns empty list for non-string / empty input", () => {
    expect(findBarrelOffenders("")).toEqual([]);
    // @ts-expect-error — defensive
    expect(findBarrelOffenders(null)).toEqual([]);
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
    expect(computeRiskLevel(Infinity)).toBe("ok");
    // @ts-expect-error — defensive guard
    expect(computeRiskLevel(undefined)).toBe("ok");
  });
});
