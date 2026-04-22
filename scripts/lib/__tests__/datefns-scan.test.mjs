/**
 * Unit tests for scripts/lib/datefns-scan.mjs — the pure helpers used by
 * scripts/generate-datefns-smoke-test.mjs.
 *
 * Coverage targets requested by the team:
 *   1. Static `import { x } from "date-fns/x"` (the supported happy path).
 *   2. CommonJS `const { x } = require("date-fns/x")` destructuring.
 *   3. Dynamic ESM `await import("date-fns/x")` calls.
 *
 * Items 2 & 3 are NOT consumed by the smoke-test generator (it only emits
 * tests for statically-imported subpaths), but they MUST be detectable so
 * CI can warn when someone slips one in — see
 * `detectUnsupportedDateFnsUsage()`.
 */
import { describe, it, expect } from "vitest";
import {
  scanStaticDateFnsImports,
  detectUnsupportedDateFnsUsage,
  parseSpecifiers,
  stripComments,
} from "../../scripts/lib/datefns-scan.mjs";

describe("parseSpecifiers", () => {
  it("trims, dedupes, and sorts plain identifiers", () => {
    expect(parseSpecifiers("format, parseISO ,format,addDays")).toEqual([
      "addDays",
      "format",
      "parseISO",
    ]);
  });

  it("strips `as` aliases and inline `type` keywords", () => {
    expect(parseSpecifiers("format as fmt, type Locale, parseISO")).toEqual([
      "Locale",
      "format",
      "parseISO",
    ]);
  });

  it("strips CJS rename syntax (`a: b`) and keeps the source name", () => {
    expect(parseSpecifiers("format: fmt, parseISO: parse")).toEqual([
      "format",
      "parseISO",
    ]);
  });

  it("returns [] for empty / comment-only input", () => {
    expect(parseSpecifiers("")).toEqual([]);
    expect(parseSpecifiers("  /* nothing here */  ")).toEqual([]);
  });
});

describe("stripComments", () => {
  it("removes block and line comments", () => {
    expect(stripComments("a, /* skip */ b // also skip\n, c")).toMatch(/a,\s+,?\s*\n?,?\s*c/);
  });
});

describe("scanStaticDateFnsImports — supported shapes", () => {
  it("captures a single-line named import", () => {
    const result = scanStaticDateFnsImports(
      `import { format } from "date-fns/format";`,
    );
    expect([...result.keys()]).toEqual(["format"]);
    expect([...result.get("format")]).toEqual(["format"]);
  });

  it("captures multi-line imports with trailing commas", () => {
    const src = `
      import {
        format,
        parseISO,
        addDays as add,
      } from "date-fns/index";
    `;
    const result = scanStaticDateFnsImports(src);
    expect([...result.get("index")].sort()).toEqual([
      "addDays",
      "format",
      "parseISO",
    ]);
  });

  it("merges duplicate subpaths from different files", () => {
    const a = `import { format } from "date-fns/format";`;
    const b = `import { format, parseISO } from "date-fns/format";`;
    const merged = new Map();
    for (const src of [a, b]) {
      const partial = scanStaticDateFnsImports(src);
      for (const [sp, names] of partial) {
        if (!merged.has(sp)) merged.set(sp, new Set());
        for (const n of names) merged.get(sp).add(n);
      }
    }
    expect([...merged.get("format")].sort()).toEqual(["format", "parseISO"]);
  });

  it("captures locale subpaths", () => {
    const src = `import { ptBR } from "date-fns/locale/pt-BR";`;
    const result = scanStaticDateFnsImports(src);
    expect([...result.keys()]).toEqual(["locale/pt-BR"]);
    expect([...result.get("locale/pt-BR")]).toEqual(["ptBR"]);
  });

  it("skips type-only imports (they don't survive to runtime)", () => {
    const src = `import type { Locale } from "date-fns/locale/pt-BR";`;
    const result = scanStaticDateFnsImports(src);
    expect(result.size).toBe(0);
  });

  it("ignores non-date-fns imports", () => {
    const src = `
      import { useState } from "react";
      import { format } from "@/lib/utils";
      import { z } from "zod";
    `;
    const result = scanStaticDateFnsImports(src);
    expect(result.size).toBe(0);
  });

  it("does NOT match regex-like substrings inside larger import paths", () => {
    // "@my/date-fns-helpers" must not be confused for "date-fns".
    const src = `import { foo } from "@my/date-fns-helpers";`;
    const result = scanStaticDateFnsImports(src);
    expect(result.size).toBe(0);
  });

  it("does not span across two adjacent import statements", () => {
    // The `[^{}]*` brace contents must not greedily eat the second statement.
    const src = `
      import { format } from "date-fns/format";
      import { parseISO } from "date-fns/parseISO";
    `;
    const result = scanStaticDateFnsImports(src);
    expect([...result.keys()].sort()).toEqual(["format", "parseISO"]);
    expect([...result.get("format")]).toEqual(["format"]);
    expect([...result.get("parseISO")]).toEqual(["parseISO"]);
  });

  it("handles single-quoted import paths", () => {
    const src = `import { format } from 'date-fns/format';`;
    const result = scanStaticDateFnsImports(src);
    expect([...result.keys()]).toEqual(["format"]);
  });
});

describe("detectUnsupportedDateFnsUsage — require destructuring", () => {
  it("flags `const { x } = require('date-fns/x')`", () => {
    const src = `const { format } = require("date-fns/format");`;
    const findings = detectUnsupportedDateFnsUsage(src, "fixture.ts");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: "require-destructure",
      subpath: "format",
      names: ["format"],
      file: "fixture.ts",
      line: 1,
    });
  });

  it("supports let / var and multiple specifiers", () => {
    const src = `
      let { format, parseISO } = require("date-fns/index");
      var { addDays } = require('date-fns/addDays');
    `;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.subpath).sort()).toEqual(["addDays", "index"]);
    const idx = findings.find((f) => f.subpath === "index");
    expect(idx.names).toEqual(["format", "parseISO"]);
  });

  it("captures the line number for warnings", () => {
    const src = [
      "// header",
      "import React from 'react';",
      "",
      `const { format } = require("date-fns/format");`,
    ].join("\n");
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings[0].line).toBe(4);
  });

  it("does NOT flag a normal require of date-fns without destructuring", () => {
    // `const x = require("date-fns/format")` is not a destructure → not matched.
    const src = `const fns = require("date-fns/format");`;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(0);
  });

  it("does NOT confuse an unrelated require for date-fns", () => {
    const src = `const { join } = require("path");`;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(0);
  });
});

describe("detectUnsupportedDateFnsUsage — dynamic import()", () => {
  it("flags `await import('date-fns/x')`", () => {
    const src = `const mod = await import("date-fns/format");`;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: "dynamic-import",
      subpath: "format",
      line: 1,
    });
  });

  it("flags bare `import('date-fns/x').then(...)`", () => {
    const src = `import("date-fns/parseISO").then((m) => m.parseISO);`;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("dynamic-import");
    expect(findings[0].subpath).toBe("parseISO");
  });

  it("captures multiple dynamic imports in one file", () => {
    const src = `
      const a = await import("date-fns/addDays");
      const b = await import('date-fns/locale/pt-BR');
    `;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.subpath).sort()).toEqual([
      "addDays",
      "locale/pt-BR",
    ]);
  });

  it("does NOT match a static `import` declaration as dynamic", () => {
    // The dynamic regex must require `(` after `import`, not whitespace.
    const src = `import { format } from "date-fns/format";`;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(0);
  });

  it("does NOT flag dynamic imports of unrelated modules", () => {
    const src = `const x = await import("lodash");`;
    const findings = detectUnsupportedDateFnsUsage(src);
    expect(findings).toHaveLength(0);
  });
});

describe("detectUnsupportedDateFnsUsage — mixed file", () => {
  it("returns require + dynamic findings together, in a stable shape", () => {
    const src = `
      import { format } from "date-fns/format";          // static, supported → not flagged
      const { addDays } = require("date-fns/addDays");   // require destructure → flagged
      const mod = await import("date-fns/parseISO");     // dynamic import → flagged
    `;
    const supported = scanStaticDateFnsImports(src);
    const unsupported = detectUnsupportedDateFnsUsage(src, "mixed.ts");

    expect([...supported.keys()]).toEqual(["format"]);
    expect(unsupported.map((f) => f.kind).sort()).toEqual([
      "dynamic-import",
      "require-destructure",
    ]);
    expect(unsupported.every((f) => f.file === "mixed.ts")).toBe(true);
  });
});
