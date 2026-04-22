/**
 * Tests for the dependency-health allowlist (suppression of known
 * false positives in tree-shaking scans).
 *
 * Behavior under test:
 *   • parseAllowlist — schema validation + expiry partitioning
 *   • matchesAllowlist — conjunctive filter matching
 *   • applyAllowlist — offender bucketing into kept vs suppressed
 */
import { describe, it, expect } from "vitest";
import {
  ALLOWLIST_VERSION,
  parseAllowlist,
  matchesAllowlist,
  applyAllowlist,
  inferPackageFromImportPath,
} from "../dependency-health-allowlist.mjs";

const NOW = new Date("2026-06-01T00:00:00Z");

describe("parseAllowlist — schema validation", () => {
  it("accepts an empty entries array", () => {
    const out = parseAllowlist({ version: ALLOWLIST_VERSION, entries: [] }, { now: NOW });
    expect(out).toEqual({ entries: [], expired: [] });
  });

  it("rejects wrong version", () => {
    expect(() => parseAllowlist({ version: 999, entries: [] })).toThrow(/unsupported version/);
  });

  it("rejects non-object root", () => {
    expect(() => parseAllowlist(null)).toThrow(/root must be an object/);
    expect(() => parseAllowlist("nope")).toThrow(/root must be an object/);
  });

  it("rejects missing 'reason'", () => {
    expect(() =>
      parseAllowlist({ version: 1, entries: [{ package: "date-fns" }] }),
    ).toThrow(/non-empty 'reason'/);
  });

  it("rejects empty/whitespace-only 'reason'", () => {
    expect(() =>
      parseAllowlist({ version: 1, entries: [{ package: "date-fns", reason: "   " }] }),
    ).toThrow(/non-empty 'reason'/);
  });

  it("rejects missing 'package'", () => {
    expect(() =>
      parseAllowlist({ version: 1, entries: [{ reason: "x" }] }),
    ).toThrow(/package is required/);
  });

  it("rejects malformed line / file / importPath / expiresAt", () => {
    expect(() =>
      parseAllowlist({
        version: 1,
        entries: [{ package: "date-fns", reason: "x", line: 0 }],
      }),
    ).toThrow(/positive integer/);
    expect(() =>
      parseAllowlist({
        version: 1,
        entries: [{ package: "date-fns", reason: "x", file: 42 }],
      }),
    ).toThrow(/file must be a string/);
    expect(() =>
      parseAllowlist({
        version: 1,
        entries: [{ package: "date-fns", reason: "x", expiresAt: "not-a-date" }],
      }),
    ).toThrow(/parseable date/);
  });

  it("partitions expired entries out of the active list", () => {
    const out = parseAllowlist(
      {
        version: 1,
        entries: [
          { package: "date-fns", reason: "active", expiresAt: "2099-01-01" },
          { package: "date-fns", reason: "stale", expiresAt: "2024-01-01" },
          { package: "date-fns", reason: "no-expiry" },
        ],
      },
      { now: NOW },
    );
    expect(out.entries.map((e) => e.reason)).toEqual(["active", "no-expiry"]);
    expect(out.expired.map((e) => e.reason)).toEqual(["stale"]);
  });

  it("normalizes Windows backslash paths in 'file' to forward slashes", () => {
    const out = parseAllowlist(
      {
        version: 1,
        entries: [{ package: "date-fns", file: "src\\legacy\\x.ts", reason: "x" }],
      },
      { now: NOW },
    );
    expect(out.entries[0].file).toBe("src/legacy/x.ts");
  });
});

describe("matchesAllowlist — conjunctive matching", () => {
  const offender = {
    file: "src/foo.ts",
    line: 10,
    importPath: "date-fns/locale",
    package: "date-fns",
  };

  it("matches when only package is specified (catch-all)", () => {
    expect(matchesAllowlist(offender, { package: "date-fns" })).toBe(true);
  });

  it("does not match a different package", () => {
    expect(matchesAllowlist(offender, { package: "react" })).toBe(false);
  });

  it("matches all-fields-specified entry exactly", () => {
    expect(
      matchesAllowlist(offender, {
        package: "date-fns",
        file: "src/foo.ts",
        line: 10,
        importPath: "date-fns/locale",
      }),
    ).toBe(true);
  });

  it("does not match when any specified filter mismatches", () => {
    expect(matchesAllowlist(offender, { package: "date-fns", file: "src/bar.ts" })).toBe(false);
    expect(matchesAllowlist(offender, { package: "date-fns", line: 11 })).toBe(false);
    expect(matchesAllowlist(offender, { package: "date-fns", importPath: "date-fns" })).toBe(false);
  });

  it("treats omitted filters as wildcards (file specified, line wildcard)", () => {
    expect(matchesAllowlist(offender, { package: "date-fns", file: "src/foo.ts" })).toBe(true);
  });
});

describe("inferPackageFromImportPath", () => {
  it.each([
    ["date-fns", "date-fns"],
    ["date-fns/format", "date-fns"],
    ["date-fns/locale", "date-fns"],
    ["date-fns/locale/pt-BR", "date-fns"],
  ])("infers 'date-fns' for %s", (inp, expected) => {
    expect(inferPackageFromImportPath(inp)).toBe(expected);
  });

  it("returns the literal path for unknown packages (forward-compatible)", () => {
    expect(inferPackageFromImportPath("react")).toBe("react");
    expect(inferPackageFromImportPath("@radix-ui/react-dialog")).toBe("@radix-ui/react-dialog");
    // CRITICAL: must NOT match `date-fns-tz` as `date-fns`.
    expect(inferPackageFromImportPath("date-fns-tz")).toBe("date-fns-tz");
  });
});

describe("applyAllowlist — full suppression flow", () => {
  const offenders = [
    { file: "src/legacy/dates.ts", line: 12, importPath: "date-fns/locale" },
    { file: "src/legacy/dates.ts", line: 99, importPath: "date-fns" },
    { file: "src/new/feature.ts", line: 3, importPath: "date-fns" },
  ];

  it("suppresses a single offender by exact match", () => {
    const { kept, suppressed } = applyAllowlist(offenders, [
      {
        package: "date-fns",
        file: "src/legacy/dates.ts",
        line: 12,
        importPath: "date-fns/locale",
        reason: "shim",
      },
    ]);
    expect(kept).toHaveLength(2);
    expect(suppressed).toEqual([
      {
        file: "src/legacy/dates.ts",
        line: 12,
        importPath: "date-fns/locale",
        package: "date-fns",
        reason: "shim",
      },
    ]);
  });

  it("suppresses every offender in a file (file-only filter)", () => {
    const { kept, suppressed } = applyAllowlist(offenders, [
      { package: "date-fns", file: "src/legacy/dates.ts", reason: "all-of-legacy" },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].file).toBe("src/new/feature.ts");
    expect(suppressed).toHaveLength(2);
    expect(suppressed.every((s) => s.reason === "all-of-legacy")).toBe(true);
  });

  it("returns offenders untouched when the allowlist is empty", () => {
    const { kept, suppressed } = applyAllowlist(offenders, []);
    expect(kept).toBe(offenders); // identity preserved when no work to do
    expect(suppressed).toEqual([]);
  });

  it("does not suppress offenders that don't match any entry", () => {
    const { kept, suppressed } = applyAllowlist(offenders, [
      { package: "date-fns", file: "src/does-not-exist.ts", reason: "ghost" },
    ]);
    expect(kept).toHaveLength(3);
    expect(suppressed).toEqual([]);
  });

  it("does not let a 'date-fns' entry suppress a 'date-fns-tz' offender (package boundary)", () => {
    const off = [{ file: "src/x.ts", line: 1, importPath: "date-fns-tz" }];
    const { kept, suppressed } = applyAllowlist(off, [
      { package: "date-fns", reason: "broad" },
    ]);
    expect(kept).toEqual(off);
    expect(suppressed).toEqual([]);
  });
});
