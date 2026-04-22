/**
 * Golden / snapshot tests for the rendered drift output strings produced by
 * scripts/lib/semver-diff.mjs.
 *
 * Sibling unit tests (semver-diff.test.mjs) already assert structural
 * properties (line counts, label padding, caret column math). This file
 * complements them with **byte-for-byte** snapshots of the full rendered
 * output across every drift case the CLIs actually emit:
 *
 *   - renderMismatch (default + summaryOnly, with/without caseLabel)
 *   - renderTripleMismatch (default + summaryOnly)
 *   - renderUnifiedDiff (default no-color + summaryOnly + custom indent)
 *
 * Why goldens (in addition to structural assertions):
 *   - Catches whitespace / unicode / punctuation regressions that pass the
 *     looser "contains X" / "matches /Y/" checks but break log scrapers,
 *     dashboards, or `--drift-summary-only` consumers downstream.
 *   - A failing snapshot diff is the clearest possible signal at PR time:
 *     reviewers see the exact before/after string and decide whether the
 *     change was intentional. If yes: `bun run test:semver-diff -u`.
 *
 * Conventions:
 *   - All snapshots use `color: false` to keep them ANSI-free and stable
 *     across local TTY vs CI environments.
 *   - Inline snapshots are used (not external .snap files) so the expected
 *     output lives next to the assertion and shows up directly in PR diffs.
 *   - One snapshot per drift case; case names mirror the production code
 *     paths (spec↔locked, locked↔installed, triple, etc.).
 */
import { describe, expect, it } from "vitest";
import {
  renderMismatch,
  renderTripleMismatch,
  renderUnifiedDiff,
} from "../semver-diff.mjs";

describe("renderMismatch — golden snapshots (default mode)", () => {
  it("4-line shape (no caseLabel) — patch drift", () => {
    expect(renderMismatch("declared", "1.2.3", "installed", "1.2.9"))
      .toMatchInlineSnapshot(`
        "    declared   1.2.3
            installed  1.2.9
                         ^
            → patch version drift (1.2.3 → 1.2.9)"
      `);
  });

  it("5-line shape with caseLabel — spec↔locked, minor drift", () => {
    expect(
      renderMismatch("spec", "1.2.3", "locked", "1.5.3", {
        caseLabel: "spec↔locked",
      }),
    ).toMatchInlineSnapshot(`
      "    [spec↔locked] spec ↔ locked
          spec    1.2.3
          locked  1.5.3
                    ^
          → minor version drift (1.2.3 → 1.5.3)"
    `);
  });

  it("major drift — caret at column 0 of v2", () => {
    expect(
      renderMismatch("spec", "1.0.0", "installed", "2.0.0", {
        caseLabel: "spec↔installed",
      }),
    ).toMatchInlineSnapshot(`
      "    [spec↔installed] spec ↔ installed
          spec       1.0.0
          installed  2.0.0
                     ^
          → major version drift (1.0.0 → 2.0.0)"
    `);
  });

  it("prerelease drift — caret lands inside the -pre segment", () => {
    expect(
      renderMismatch("spec", "1.2.3-alpha.1", "locked", "1.2.3-beta.1", {
        caseLabel: "spec↔locked",
      }),
    ).toMatchInlineSnapshot(`
      "    [spec↔locked] spec ↔ locked
          spec    1.2.3-alpha.1
          locked  1.2.3-beta.1
                        ^
          → prerelease version drift (1.2.3-alpha.1 → 1.2.3-beta.1)"
    `);
  });

  it("unknown level — malformed input still produces a clean 4-line block", () => {
    expect(renderMismatch("a", "garbage", "b", "1.2.3"))
      .toMatchInlineSnapshot(`
        "    a  garbage
            b  1.2.3
               ^
            → unknown version drift (garbage → 1.2.3)"
      `);
  });
});

describe("renderMismatch — golden snapshots (summaryOnly mode)", () => {
  it("with caseLabel — emits the [case] → drift one-liner", () => {
    expect(
      renderMismatch("spec", "3.6.0", "locked", "3.7.1", {
        caseLabel: "spec↔locked",
        summaryOnly: true,
      }),
    ).toMatchInlineSnapshot(
      `"    [spec↔locked] → minor version drift (3.6.0 → 3.7.1)"`,
    );
  });

  it("without caseLabel — emits the bare → drift one-liner", () => {
    expect(
      renderMismatch("spec", "3.6.0", "locked", "3.7.1", {
        summaryOnly: true,
      }),
    ).toMatchInlineSnapshot(
      `"    → minor version drift (3.6.0 → 3.7.1)"`,
    );
  });

  it("major drift one-liner", () => {
    expect(
      renderMismatch("locked", "1.0.0", "installed", "2.0.0", {
        caseLabel: "locked↔installed",
        summaryOnly: true,
      }),
    ).toMatchInlineSnapshot(
      `"    [locked↔installed] → major version drift (1.0.0 → 2.0.0)"`,
    );
  });
});

describe("renderTripleMismatch — golden snapshots", () => {
  it("default mode — banner + summary + both labeled caret blocks", () => {
    expect(renderTripleMismatch("1.2.3", "1.5.0", "2.0.0"))
      .toMatchInlineSnapshot(`
        "    ── triple mismatch: spec ≠ locked ≠ installed ──
            summary: spec=1.2.3  locked=1.5.0  installed=2.0.0   (drift: spec→locked is minor, then locked→installed is major)

            [spec↔locked] spec ↔ locked
            spec    1.2.3
            locked  1.5.0
                      ^
            → minor version drift (1.2.3 → 1.5.0)

            [locked↔installed] locked ↔ installed
            locked     1.5.0
            installed  2.0.0
                       ^
            → major version drift (1.5.0 → 2.0.0)"
      `);
  });

  it("summaryOnly mode — banner + summary + two one-liners (no caret blocks)", () => {
    expect(
      renderTripleMismatch("1.2.3", "1.5.0", "2.0.0", { summaryOnly: true }),
    ).toMatchInlineSnapshot(`
      "    ── triple mismatch: spec ≠ locked ≠ installed ──
          summary: spec=1.2.3  locked=1.5.0  installed=2.0.0   (drift: spec→locked is minor, then locked→installed is major)
          [spec↔locked] → minor version drift (1.2.3 → 1.5.0)
          [locked↔installed] → major version drift (1.5.0 → 2.0.0)"
    `);
  });
});

describe("renderUnifiedDiff — golden snapshots (no color)", () => {
  it("default 6-line git-patch shape — patch drift", () => {
    expect(
      renderUnifiedDiff("spec", "1.2.3", "installed", "1.2.9", {
        color: false,
      }),
    ).toMatchInlineSnapshot(`
      "    --- spec       1.2.3
          +++ installed  1.2.9
          @@ patch version drift @@
          - 1.2.3
          + 1.2.9
                ^"
    `);
  });

  it("custom indent is applied to every line", () => {
    expect(
      renderUnifiedDiff("a", "1.0.0", "b", "1.0.1", {
        color: false,
        indent: ">>> ",
      }),
    ).toMatchInlineSnapshot(`
      ">>> --- a  1.0.0
      >>> +++ b  1.0.1
      >>> @@ patch version drift @@
      >>> - 1.0.0
      >>> + 1.0.1
      >>>       ^"
    `);
  });

  it("summaryOnly — single-line @@ hunk + compact (vA → vB)", () => {
    expect(
      renderUnifiedDiff("spec", "1.2.3", "installed", "1.2.9", {
        color: false,
        summaryOnly: true,
      }),
    ).toMatchInlineSnapshot(
      `"    @@ patch version drift @@ (1.2.3 → 1.2.9)"`,
    );
  });

  it("summaryOnly — major drift one-liner", () => {
    expect(
      renderUnifiedDiff("spec", "1.0.0", "installed", "2.0.0", {
        color: false,
        summaryOnly: true,
      }),
    ).toMatchInlineSnapshot(
      `"    @@ major version drift @@ (1.0.0 → 2.0.0)"`,
    );
  });
});
