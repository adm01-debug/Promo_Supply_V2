// Fixture-driven manifest assertions for the date-fns smoke generator's
// scanner. Each `fixtures/*.ts.txt` file represents a single edge case
// (single-line, multi-line, comments, aliases, type-only, duplicates, and
// unsupported require/dynamic shapes). We run the same two scanner helpers
// the production generator uses, aggregate the results into the **exact
// manifest shape** written to `public/datefns-usage.json`, and assert the
// fully-deduped/sorted output matches a hand-rolled expectation.
//
// This complements the unit tests in datefns-scan.test.mjs (which exercise
// the regex helpers in isolation) by locking down the *aggregation contract*
// — i.e. the bridge between the scanner and the manifest.
//
// Fixtures use the `.ts.txt` extension on purpose:
//   • Vitest / tsc never try to compile them.
//   • The generator's `walk()` filter (`.ts|.tsx`) ignores them, so the real
//     manifest stays unaffected.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scanStaticDateFnsImports,
  detectUnsupportedDateFnsUsage,
} from "../datefns-scan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures");

/** Load one fixture by basename (without extension). */
function loadFixture(name) {
  return readFileSync(join(FIXTURES_DIR, `${name}.ts.txt`), "utf8");
}

/**
 * Aggregate scanner output across an arbitrary set of fixture sources into
 * the same `{ functions: [...], locales: [...], totals }` shape the
 * generator writes to `public/datefns-usage.json`. Mirrors the logic in
 * `scripts/generate-datefns-smoke-test.mjs` — keep in sync if that file's
 * partition rules ever change.
 */
function buildManifestFromFixtures(fixtures) {
  const subpaths = new Map();
  const unsupported = [];
  for (const [name, src] of Object.entries(fixtures)) {
    const fileMap = scanStaticDateFnsImports(src);
    for (const [sp, names] of fileMap) {
      if (!subpaths.has(sp)) subpaths.set(sp, new Set());
      const set = subpaths.get(sp);
      for (const n of names) set.add(n);
    }
    unsupported.push(...detectUnsupportedDateFnsUsage(src, `${name}.ts.txt`));
  }
  const sorted = [...subpaths.keys()].sort();
  const fnSubs = sorted.filter((s) => !s.startsWith("locale/"));
  const localeSubs = sorted.filter((s) => s.startsWith("locale/"));
  const fnNames = fnSubs.flatMap((sp) => [...subpaths.get(sp)].sort());
  const localeNames = localeSubs.flatMap((sp) => [...subpaths.get(sp)].sort());
  return {
    functions: fnSubs.map((sp) => ({
      subpath: sp,
      exports: [...subpaths.get(sp)].sort(),
    })),
    locales: localeSubs.map((sp) => ({
      subpath: sp,
      exports: [...subpaths.get(sp)].sort(),
    })),
    totalSubpaths: sorted.length,
    totalFunctions: fnNames.length,
    totalLocales: localeNames.length,
    unsupported: unsupported.map((u) => ({
      kind: u.kind,
      subpath: u.subpath,
      file: u.file,
    })),
  };
}

describe("fixture-based manifest assertions", () => {
  it("the fixtures directory contains every documented edge case", () => {
    // Guard against silent fixture deletion — every test below assumes
    // these files exist on disk.
    const present = readdirSync(FIXTURES_DIR)
      .filter((f) => f.endsWith(".ts.txt"))
      .map((f) => f.replace(/\.ts\.txt$/, ""))
      .sort();
    expect(present).toEqual([
      "aliases-and-types",
      "comments",
      "duplicates",
      "locales",
      "multi-line",
      "single-line",
      "unsupported",
    ]);
  });

  it("single-line.ts.txt → two function subpaths, one export each", () => {
    const m = buildManifestFromFixtures({
      "single-line": loadFixture("single-line"),
    });
    expect(m).toEqual({
      functions: [
        { subpath: "format", exports: ["format"] },
        { subpath: "parseISO", exports: ["parseISO"] },
      ],
      locales: [],
      totalSubpaths: 2,
      totalFunctions: 2,
      totalLocales: 0,
      unsupported: [],
    });
  });

  it("multi-line.ts.txt → two function subpaths, sorted exports", () => {
    const m = buildManifestFromFixtures({
      "multi-line": loadFixture("multi-line"),
    });
    expect(m.functions).toEqual([
      { subpath: "dateMath", exports: ["addDays", "subDays"] },
      {
        subpath: "intervals-bundle-not-real",
        exports: ["eachDayOfInterval", "endOfMonth", "startOfMonth"],
      },
    ]);
    expect(m.locales).toEqual([]);
    expect(m.totalFunctions).toBe(5);
    expect(m.unsupported).toEqual([]);
  });

  it("comments.ts.txt → all 3 specifiers extracted, no comment leakage", () => {
    const m = buildManifestFromFixtures({
      comments: loadFixture("comments"),
    });
    expect(m.functions).toEqual([
      {
        subpath: "formatters",
        exports: ["format", "formatDistanceToNow"],
      },
    ]);
    expect(m.totalFunctions).toBe(2);
  });

  it("aliases-and-types.ts.txt → aliases stripped, type-only skipped", () => {
    const m = buildManifestFromFixtures({
      "aliases-and-types": loadFixture("aliases-and-types"),
    });
    expect(m).toEqual({
      functions: [
        { subpath: "mixed", exports: ["format", "parseISO"] },
      ],
      locales: [
        { subpath: "locale/en-US", exports: ["enUS"] },
        // `import type { Locale } from "date-fns/locale/pt-BR"` is dropped;
        // the sibling `import { ptBR as defaultLocale }` is the only entry.
        { subpath: "locale/pt-BR", exports: ["ptBR"] },
      ],
      totalSubpaths: 3,
      totalFunctions: 2,
      totalLocales: 2,
      unsupported: [],
    });
  });

  it("locales.ts.txt → 3 locales, comment-tolerant, quote-style agnostic", () => {
    const m = buildManifestFromFixtures({
      locales: loadFixture("locales"),
    });
    expect(m.locales).toEqual([
      { subpath: "locale/en-US", exports: ["enUS"] },
      { subpath: "locale/es", exports: ["es"] },
      { subpath: "locale/pt-BR", exports: ["ptBR"] },
    ]);
    expect(m.functions).toEqual([]);
    expect(m.totalLocales).toBe(3);
  });

  it("duplicates.ts.txt → repeated imports are deduped + sorted", () => {
    const m = buildManifestFromFixtures({
      duplicates: loadFixture("duplicates"),
    });
    expect(m.functions).toEqual([
      // `format` appears 3× (twice as `format`, once as alias `format as f`)
      // — must collapse to a single sorted ["format", "parseISO"].
      { subpath: "format", exports: ["format", "parseISO"] },
    ]);
    expect(m.locales).toEqual([
      { subpath: "locale/pt-BR", exports: ["ptBR"] },
    ]);
  });

  it("unsupported.ts.txt → require/dynamic shapes are flagged, NOT in manifest", () => {
    const m = buildManifestFromFixtures({
      unsupported: loadFixture("unsupported"),
    });
    expect(m.functions).toEqual([]);
    expect(m.locales).toEqual([]);
    expect(m.totalSubpaths).toBe(0);
    // Order matches source order in the fixture.
    expect(m.unsupported).toEqual([
      { kind: "require-destructure", subpath: "format", file: "unsupported.ts.txt" },
      { kind: "dynamic-import", subpath: "parseISO", file: "unsupported.ts.txt" },
    ]);
  });

  it("ALL fixtures together → fully aggregated, deduped, partitioned manifest", () => {
    // The crown-jewel assertion: load every fixture, run the same pipeline
    // the production generator runs, and lock down the exact merged output.
    // Any change to the scanner that affects this must be intentional —
    // updating this expectation is the audit trail.
    const all = {
      "single-line": loadFixture("single-line"),
      "multi-line": loadFixture("multi-line"),
      comments: loadFixture("comments"),
      "aliases-and-types": loadFixture("aliases-and-types"),
      locales: loadFixture("locales"),
      duplicates: loadFixture("duplicates"),
      unsupported: loadFixture("unsupported"),
    };
    const m = buildManifestFromFixtures(all);

    expect(m.functions).toEqual([
      { subpath: "dateMath", exports: ["addDays", "subDays"] },
      // `format` collected from single-line.ts.txt + duplicates.ts.txt
      { subpath: "format", exports: ["format", "parseISO"] },
      { subpath: "formatters", exports: ["format", "formatDistanceToNow"] },
      {
        subpath: "intervals-bundle-not-real",
        exports: ["eachDayOfInterval", "endOfMonth", "startOfMonth"],
      },
      { subpath: "mixed", exports: ["format", "parseISO"] },
      { subpath: "parseISO", exports: ["parseISO"] },
    ]);
    expect(m.locales).toEqual([
      { subpath: "locale/en-US", exports: ["enUS"] },
      { subpath: "locale/es", exports: ["es"] },
      { subpath: "locale/pt-BR", exports: ["ptBR"] },
    ]);
    expect(m.totalSubpaths).toBe(9);
    expect(m.totalFunctions).toBe(11); // sum of every functions[].exports[]
    expect(m.totalLocales).toBe(3);

    // Unsupported findings come ONLY from the unsupported.ts.txt fixture.
    expect(m.unsupported).toEqual([
      { kind: "require-destructure", subpath: "format", file: "unsupported.ts.txt" },
      { kind: "dynamic-import", subpath: "parseISO", file: "unsupported.ts.txt" },
    ]);
  });
});
