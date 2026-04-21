
## Plan: Clearer diff output on date-fns version mismatch

### Goal
When `scripts/verify-datefns-versions.mjs` detects drift, show a visual side-by-side diff that makes the mismatch obvious at a glance — character-level highlight of where the versions diverge, plus a one-line summary like `spec 3.5.0 ≠ installed 3.6.0 (minor bump)`.

Today's output already has a 3-row table with `← drift` markers and a fix command. This adds: (1) a character-aligned diff highlighting the differing semver segment, (2) a semver-level classification (major/minor/patch/prerelease/build), and (3) a focused 2-line "what changed" callout for the most common case (spec vs installed).

### Current output (recap)
```
✗ date-fns version drift detected:

    SOURCE              VERSION  STATUS
    ──────────────────  ───────  ────────
    package.json spec   ^3.5.0   ← drift
    bun.lock resolved   3.6.0    ok
    node_modules        3.6.0    ok
```

### New output (added below the existing table, before the Fix line)
```
  Mismatch detail:
    spec       3.5.0
    installed  3.6.0
                 ^
    → minor version drift (3.5.0 → 3.6.0)
```
The caret line points at the exact differing semver segment (major / minor / patch / prerelease / build). For full corruption (all three differ), one block per pair.

### Changes

#### 1. `scripts/verify-datefns-versions.mjs` — add a diff renderer (~50 lines)

New helpers, inserted just before the existing diagnosis block:

```js
// Split semver into [major, minor, patch, prerelease, build]
function splitSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(v);
  if (!m) return null;
  return { major: m[1], minor: m[2], patch: m[3], pre: m[4] ?? "", build: m[5] ?? "" };
}

// Returns { level: "major"|"minor"|"patch"|"prerelease"|"build"|"unknown", caretCol }
function classifyDiff(a, b) {
  const sa = splitSemver(a), sb = splitSemver(b);
  if (!sa || !sb) return { level: "unknown", caretCol: 0 };
  const segs = ["major", "minor", "patch", "pre", "build"];
  // caretCol is the column (0-indexed) of the first differing char in `b`
  const labelMap = { pre: "prerelease" };
  let col = 0;
  for (const seg of segs) {
    if (sa[seg] !== sb[seg]) {
      // find first differing char inside this segment
      const offset = [...sb[seg]].findIndex((c, i) => sa[seg][i] !== c);
      return {
        level: labelMap[seg] ?? seg,
        caretCol: col + Math.max(0, offset),
      };
    }
    col += sb[seg].length + 1; // +1 for "." or "-" or "+" delimiter
  }
  return { level: "unknown", caretCol: 0 };
}

function renderMismatch(label1, v1, label2, v2) {
  const { level, caretCol } = classifyDiff(v1, v2);
  const labelW = Math.max(label1.length, label2.length);
  const pad = (s) => s + " ".repeat(labelW - s.length);
  const caretIndent = " ".repeat(labelW + 2 + caretCol);
  const lines = [
    `    ${pad(label1)}  ${v1}`,
    `    ${pad(label2)}  ${v2}`,
    `    ${caretIndent}^`,
    `    → ${level} version drift (${v1} → ${v2})`,
  ];
  return lines.join("\n");
}
```

Wire-up — after the existing table prints, before the "Fix" block, render one diff block per drifting pair:

```js
console.error("\n  Mismatch detail:");
if (!specEqLock && lockEqInstalled) {
  console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
} else if (specEqLock && !lockEqInstalled) {
  console.error(renderMismatch("locked", LOCKED, "installed", INSTALLED));
} else if (specEqInstalled && !specEqLock) {
  console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
} else {
  // all three differ
  console.error(renderMismatch("spec", SPEC_NORM, "locked", LOCKED));
  console.error("");
  console.error(renderMismatch("locked", LOCKED, "installed", INSTALLED));
}
```

Notes:
- Pure additive — the existing table, diagnosis sentence, fix command, and exit codes are untouched.
- Uses only `console.error` + plain ASCII (no color libs, no deps), consistent with the rest of the script.
- Handles malformed versions gracefully (`level: "unknown"`, caret at column 0) — no crash on weird tags like `git+ssh://…`.

#### 2. `scripts/install-report.mjs` — call the same renderer when drift detected (~5 lines)

Currently prints `✗ DRIFT` with no detail. Import the two new helpers (or inline them — they're small) and append the same `Mismatch detail:` block when `aligned` is false. Mirrors the verify script so devs see the same diff in both contexts.

To avoid duplication, extract the helpers into `scripts/lib/semver-diff.mjs` (~40 lines) and import from both scripts.

#### 3. No other changes
- `scripts/emit-smoke-health.mjs` already records spec/locked/installed in JSON — no UI there to enrich.
- CI workflows, tests, exit codes, fix commands — all unchanged.
- `package.json` — no new deps.

### Verification
1. `bun install` clean → no output change (drift path not triggered).
2. Manually edit `package.json` `date-fns` to `"3.5.0"`, run `node scripts/verify-datefns-versions.mjs` → see new `Mismatch detail` block with caret pointing at minor segment, `→ minor version drift (3.5.0 → 3.6.0)`.
3. Edit installed `node_modules/date-fns/package.json` version to `4.0.0` → caret points at major, `→ major version drift`.
4. Edit to `3.6.1` → caret at patch, `→ patch version drift`.
5. Force all-three-differ scenario → two stacked diff blocks (spec↔locked, locked↔installed).
6. Same diff appears at the bottom of `node scripts/install-report.mjs` output when drifted.

### Risk / scope
- 1 new file (`scripts/lib/semver-diff.mjs`, ~40 lines), ~15 lines added to `verify-datefns-versions.mjs`, ~5 lines added to `install-report.mjs`.
- 0 deps, 0 test changes, 0 workflow changes, 0 exit-code changes.
- Drift path only — green runs unchanged.
