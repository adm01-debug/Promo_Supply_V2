/**
 * Unit tests for scripts/lib/semver-diff.mjs.
 *
 * Locked under scripts/__tests__ so vitest's `scripts/**\/__tests__/**`
 * include pattern (see vitest.config.ts) picks it up automatically.
 *
 * Coverage goals:
 *   - splitSemver: well-formed, malformed, with/without pre+build.
 *   - classifyDiff: each drift level (major, minor, patch, prerelease, build),
 *     plus equal-version, unknown (malformed input), and the caretCol math
 *     for both single-digit and multi-digit segments.
 *   - renderMismatch: shape (4 lines), caret column points at the first
 *     differing character, and the drift label is interpolated correctly.
 *
 * Why a runtime test (not just types): the renderer is consumed by
 * stand-alone Node scripts (verify-datefns-versions.mjs etc.) where a
 * regression would only show up at CI failure time — much harder to debug
 * than a clear unit-test failure.
 */
import { describe, expect, it } from "vitest";
import {
  classifyDiff,
  renderMismatch,
  renderTripleMismatch,
  renderUnifiedDiff,
  shouldColor,
  splitSemver,
} from "../semver-diff.mjs";

// Strip ANSI escape sequences so assertions can compare plain text without
// caring about color state. Mirrors the regex used by chalk/strip-ansi.
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("splitSemver", () => {
  it("parses a plain X.Y.Z release", () => {
    expect(splitSemver("3.6.0")).toEqual({
      major: "3",
      minor: "6",
      patch: "0",
      pre: "",
      build: "",
    });
  });

  it("parses prerelease + build metadata", () => {
    expect(splitSemver("1.2.3-rc.1+build.42")).toEqual({
      major: "1",
      minor: "2",
      patch: "3",
      pre: "rc.1",
      build: "build.42",
    });
  });

  it("returns null for malformed input", () => {
    for (const bad of ["", "v1.2.3", "1.2", "1.2.3.4", "abc", "1..0"]) {
      expect(splitSemver(bad), `expected null for "${bad}"`).toBeNull();
    }
  });
});

describe("classifyDiff", () => {
  it("identifies MAJOR drift", () => {
    const r = classifyDiff("1.2.3", "2.2.3");
    expect(r.level).toBe("major");
    expect(r.caretCol).toBe(0);
  });

  it("identifies MINOR drift", () => {
    const r = classifyDiff("1.2.3", "1.5.3");
    expect(r.level).toBe("minor");
    // caretCol points at the minor segment: after "1." → column 2.
    expect(r.caretCol).toBe(2);
  });

  it("identifies PATCH drift", () => {
    const r = classifyDiff("1.2.3", "1.2.9");
    expect(r.level).toBe("patch");
    // After "1.2." → column 4.
    expect(r.caretCol).toBe(4);
  });

  it("identifies PRERELEASE drift", () => {
    const r = classifyDiff("1.2.3-alpha.1", "1.2.3-beta.1");
    expect(r.level).toBe("prerelease");
    // "1.2.3" = 5 chars + "-" delimiter = column 6 (start of pre segment).
    expect(r.caretCol).toBe(6);
  });

  it("identifies BUILD drift when only build metadata differs", () => {
    const r = classifyDiff("1.2.3+sha.aaa", "1.2.3+sha.bbb");
    expect(r.level).toBe("build");
    // "1.2.3" + "" pre + "+" delimiters → "+sha.bbb" starts at col 6, the
    // first differing char is at offset 4 within "sha.bbb" (the "b").
    expect(r.caretCol).toBeGreaterThan(0);
  });

  it("returns 'unknown' for equal versions (no diff to classify)", () => {
    const r = classifyDiff("1.2.3", "1.2.3");
    expect(r.level).toBe("unknown");
    expect(r.caretCol).toBe(0);
  });

  it("returns 'unknown' when either side is malformed", () => {
    expect(classifyDiff("not-a-version", "1.2.3")).toEqual({
      level: "unknown",
      caretCol: 0,
    });
    expect(classifyDiff("1.2.3", "")).toEqual({ level: "unknown", caretCol: 0 });
  });

  it("handles multi-digit segments (caretCol reflects real width)", () => {
    // "10.0.0" → "11.0.0": both major segments are 2 chars; first diff at offset 1.
    const r = classifyDiff("10.0.0", "11.0.0");
    expect(r.level).toBe("major");
    expect(r.caretCol).toBe(1);
  });

  it("classifies prerelease drift even when build differs too", () => {
    // Prerelease has higher precedence than build in our segs walk order.
    const r = classifyDiff("1.0.0-rc.1+sha.a", "1.0.0-rc.2+sha.b");
    expect(r.level).toBe("prerelease");
  });
});

describe("renderMismatch", () => {
  it("emits exactly 4 lines and includes both versions + drift label", () => {
    const out = renderMismatch("declared", "1.2.3", "installed", "1.2.9");
    const lines = out.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("1.2.3");
    expect(lines[1]).toContain("1.2.9");
    expect(lines[2]).toMatch(/\^$/);
    expect(lines[3]).toContain("patch version drift (1.2.3 → 1.2.9)");
  });

  it("aligns the caret to the first differing column", () => {
    const out = renderMismatch("a", "1.2.3", "b", "1.5.3");
    const lines = out.split("\n");
    // Find the caret position (the only `^` on the caret line).
    const caretLine = lines[2];
    const caretIdx = caretLine.indexOf("^");
    // Find the corresponding char position in line[1] ("    b  1.5.3").
    expect(lines[1][caretIdx]).toBe("5");
  });

  it("labels major drift correctly", () => {
    const out = renderMismatch("a", "1.0.0", "b", "2.0.0");
    expect(out).toMatch(/major version drift \(1\.0\.0 → 2\.0\.0\)/);
  });

  it("labels build drift correctly", () => {
    const out = renderMismatch("a", "1.0.0+x", "b", "1.0.0+y");
    expect(out).toMatch(/build version drift/);
  });

  it("falls back to 'unknown' label for malformed input without crashing", () => {
    const out = renderMismatch("a", "garbage", "b", "1.2.3");
    expect(out.split("\n")).toHaveLength(4);
    expect(out).toMatch(/unknown version drift/);
});

describe("renderMismatch (with caseLabel)", () => {
  it("prepends a [case] header line when caseLabel is provided", () => {
    const out = renderMismatch("spec", "1.2.3", "locked", "1.2.9", {
      caseLabel: "spec↔locked",
    });
    const lines = out.split("\n");
    // Now 5 lines: header + v1 + v2 + caret + summary.
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/\[spec↔locked\]\s+spec\s+↔\s+locked/);
    expect(lines[1]).toContain("1.2.3");
    expect(lines[2]).toContain("1.2.9");
    expect(lines[3]).toMatch(/\^$/);
    expect(lines[4]).toContain("patch version drift");
  });

  it("preserves 4-line legacy shape when caseLabel is omitted", () => {
    const out = renderMismatch("spec", "1.2.3", "locked", "1.2.9");
    expect(out.split("\n")).toHaveLength(4);
  });
});

describe("renderTripleMismatch", () => {
  const out = renderTripleMismatch("1.2.3", "1.5.0", "2.0.0");
  const lines = out.split("\n");

  it("starts with a triple-mismatch banner", () => {
    expect(lines[0]).toMatch(/triple mismatch: spec ≠ locked ≠ installed/);
  });

  it("includes a summary line listing all three versions and both drift levels", () => {
    expect(lines[1]).toContain("spec=1.2.3");
    expect(lines[1]).toContain("locked=1.5.0");
    expect(lines[1]).toContain("installed=2.0.0");
    // spec→locked is minor; locked→installed is major.
    expect(lines[1]).toMatch(/spec→locked is minor/);
    expect(lines[1]).toMatch(/locked→installed is major/);
  });

  it("embeds both labeled mismatch blocks (spec↔locked AND locked↔installed)", () => {
    expect(out).toContain("[spec↔locked] spec ↔ locked");
    expect(out).toContain("[locked↔installed] locked ↔ installed");
  });

  it("renders both drift caret blocks (two `^` markers, one per pair)", () => {
    const caretLines = lines.filter((l) => /^\s+\^$/.test(l));
    expect(caretLines).toHaveLength(2);
  });
});
});
