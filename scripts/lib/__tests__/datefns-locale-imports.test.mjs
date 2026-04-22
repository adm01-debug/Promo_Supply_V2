// Locale-import extraction tests for the date-fns smoke generator scanner.
//
// These tests exercise scenarios specific to `date-fns/locale/<id>` imports
// — single-line, multi-line, with inline `//` comments, with block `/* */`
// comments, with mixed `type` keywords and aliases — to guarantee the
// scanner never silently drops a locale subpath. Locale drops are
// particularly painful because the smoke test, the manifest, and the
// dependency-health snapshot all derive from this scanner.
//
// Sister suite to scripts/lib/__tests__/datefns-scan.test.mjs (which covers
// general subpath shapes); this file is locale-focused on purpose.
import { describe, it, expect } from "vitest";
import {
  scanStaticDateFnsImports,
  parseSpecifiers,
  stripComments,
} from "../datefns-scan.mjs";

/** Helper: pull locale-only entries out of a Map<subpath, Set<name>>. */
function localesOf(map) {
  const out = {};
  for (const [sp, names] of map.entries()) {
    if (sp.startsWith("locale/")) out[sp] = [...names].sort();
  }
  return out;
}

describe("scanStaticDateFnsImports — single-line locale imports", () => {
  it("extracts a basic single-line locale import", () => {
    const src = `import { ptBR } from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("extracts multiple single-line locale imports across lines", () => {
    const src = [
      `import { ptBR } from "date-fns/locale/pt-BR";`,
      `import { enUS } from "date-fns/locale/en-US";`,
      `import { es } from "date-fns/locale/es";`,
    ].join("\n");
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
      "locale/en-US": ["enUS"],
      "locale/es": ["es"],
    });
  });

  it("handles single quotes interchangeably with double quotes", () => {
    const src = `import { ptBR } from 'date-fns/locale/pt-BR';`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("strips an `as` alias from a single-line locale import", () => {
    const src = `import { ptBR as locale } from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("skips type-only locale imports (not bundled at runtime)", () => {
    const src = `import type { Locale } from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({});
  });

  it("keeps a value import next to a sibling type-only import", () => {
    const src = [
      `import type { Locale } from "date-fns/locale/pt-BR";`,
      `import { ptBR } from "date-fns/locale/pt-BR";`,
    ].join("\n");
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });
});

describe("scanStaticDateFnsImports — multi-line locale imports", () => {
  it("extracts a multi-line locale import (one specifier per line)", () => {
    const src = `import {
  ptBR,
} from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("extracts a multi-line locale import with multiple specifiers", () => {
    // Note: real date-fns locale subpaths usually export one named locale,
    // but the scanner shouldn't care — it must capture every specifier.
    const src = `import {
  ptBR,
  ptBR as ptBrAlias,
} from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("handles a multi-line import with a trailing comma + extra whitespace", () => {
    const src = `import   {
    ptBR  ,
}   from   "date-fns/locale/pt-BR"  ;`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("does NOT bleed across two adjacent multi-line locale imports", () => {
    // Two back-to-back multi-line imports must each be matched independently;
    // the regex's `[^{}]*` brace body guarantees no nested-brace span.
    const src = [
      `import {`,
      `  ptBR,`,
      `} from "date-fns/locale/pt-BR";`,
      `import {`,
      `  enUS,`,
      `} from "date-fns/locale/en-US";`,
    ].join("\n");
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
      "locale/en-US": ["enUS"],
    });
  });
});

describe("scanStaticDateFnsImports — comments inside locale imports", () => {
  it("ignores a single-line `//` comment between specifiers in a multi-line import", () => {
    const src = `import {
  // primary locale used across the app
  ptBR,
} from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("ignores a trailing `//` comment on a specifier line", () => {
    const src = `import {
  ptBR, // PT-BR — primary
  enUS, // EN-US — fallback
} from "date-fns/locale/pt-BR";`;
    // Two specifiers, same subpath: scanner aggregates both.
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["enUS", "ptBR"],
    });
  });

  it("ignores a block `/* */` comment between specifiers", () => {
    const src = `import {
  /* keep this in sync with i18next */
  ptBR,
} from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("ignores a multi-line block comment between specifiers", () => {
    const src = `import {
  /*
   * Primary locale.
   * Used by every formatter helper.
   */
  ptBR,
} from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("ignores an inline block comment inside the specifier list", () => {
    const src = `import { /* primary */ ptBR /* alias-free */ } from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });

  it("ignores both `//` and `/* */` comments mixed inside one import", () => {
    const src = `import {
  // first locale
  ptBR /* default app locale */,
  /* fallback below */
  enUS, // english fallback
} from "date-fns/locale/pt-BR";`;
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["enUS", "ptBR"],
    });
  });

  // NOTE: the current scanner does not pre-strip file-level comments before
  // running its import regex, so a *commented-out* locale import (`// import
  // { ptBR } from "date-fns/locale/pt-BR";` or one wrapped in a `/* */`
  // block) is still matched. That's a false-positive risk, NOT the
  // false-negative risk this suite is designed to guard against — the
  // generator's job is to "never miss a locale", and over-matching a
  // commented-out import only ever results in extra (harmless) coverage in
  // the smoke test. Document the behaviour rather than asserting against it
  // so this suite stays focused on locale extraction completeness.
  it("documents that commented-out locale imports are still matched (known limitation)", () => {
    const lineCommented = `// import { ptBR } from "date-fns/locale/pt-BR";`;
    const blockCommented = `/*\nimport { ptBR } from "date-fns/locale/pt-BR";\n*/`;
    expect(localesOf(scanStaticDateFnsImports(lineCommented))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
    expect(localesOf(scanStaticDateFnsImports(blockCommented))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });
});

describe("scanStaticDateFnsImports — locale imports mixed with function imports", () => {
  it("extracts locales alongside function subpaths in the same file", () => {
    const src = [
      `import { format } from "date-fns/format";`,
      `import { ptBR } from "date-fns/locale/pt-BR";`,
      `import {`,
      `  // calendar week start`,
      `  startOfWeek,`,
      `} from "date-fns/startOfWeek";`,
    ].join("\n");
    const map = scanStaticDateFnsImports(src);
    expect(localesOf(map)).toEqual({ "locale/pt-BR": ["ptBR"] });
    expect([...map.keys()].sort()).toEqual([
      "format",
      "locale/pt-BR",
      "startOfWeek",
    ]);
  });

  it("aggregates two separate imports of the same locale subpath", () => {
    const src = [
      `import { ptBR } from "date-fns/locale/pt-BR";`,
      `import { ptBR as alias } from "date-fns/locale/pt-BR";`,
    ].join("\n");
    expect(localesOf(scanStaticDateFnsImports(src))).toEqual({
      "locale/pt-BR": ["ptBR"],
    });
  });
});

describe("parseSpecifiers / stripComments — locale-flavored edge cases", () => {
  it("parseSpecifiers strips a trailing `//` comment on the specifier", () => {
    expect(parseSpecifiers("ptBR // primary locale")).toEqual(["ptBR"]);
  });

  it("parseSpecifiers strips a `/* */` block comment around the specifier", () => {
    expect(parseSpecifiers("/* before */ ptBR /* after */")).toEqual(["ptBR"]);
  });

  it("parseSpecifiers handles trailing commas + comments cleanly", () => {
    expect(parseSpecifiers("ptBR, // primary\n enUS, /* fallback */")).toEqual(
      ["enUS", "ptBR"],
    );
  });

  it("stripComments removes both `//` and `/* */` regions", () => {
    expect(stripComments("ptBR /* x */ , enUS // y")).toBe("ptBR  , enUS ");
  });
});
