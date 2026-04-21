#!/usr/bin/env node
/**
 * Resolve the installed version of a package from a Bun lockfile (bun.lock)
 * text, tolerant to formatting changes.
 *
 * Tries a prioritized list of patterns and returns the first match, or null
 * if none apply. Designed to be reusable for any package name.
 *
 * Run `node scripts/lib/resolve-locked-version.mjs --self-test` to exercise
 * fixtures.
 */

const VERSION_RE = String.raw`(\d+\.\d+\.\d+(?:[-+][\w.]+)?)`;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} lockText  Full text of bun.lock
 * @param {string} pkgName   e.g. "date-fns" or "@scope/pkg"
 * @returns {string | null}  Resolved semver, or null if not found
 */
export function resolveLockedVersion(lockText, pkgName) {
  if (!lockText || !pkgName) return null;
  const name = escapeRegex(pkgName);

  const patterns = [
    // 1. Bun text-lock (current): "date-fns@1.2.3"
    {
      name: "bun-quoted",
      re: new RegExp(`"${name}@${VERSION_RE}"`),
    },
    // 2. Bun alias form: "date-fns@npm:date-fns@1.2.3"
    {
      name: "bun-npm-alias",
      re: new RegExp(`"${name}@npm:${name}@${VERSION_RE}"`),
    },
    // 3. Unquoted key: date-fns@1.2.3:
    {
      name: "unquoted-key",
      re: new RegExp(`(?:^|\\s)${name}@${VERSION_RE}\\s*:`, "m"),
    },
    // 4. YAML-style block: "date-fns": then version: 1.2.3 within ~10 lines
    {
      name: "yaml-block",
      fn: (text) => {
        const blockRe = new RegExp(
          `^\\s*"?${name}"?\\s*:[^\\n]*((?:\\n[^\\n]*){0,10})`,
          "m",
        );
        const m = text.match(blockRe);
        if (!m) return null;
        const verRe = new RegExp(`version\\s*:\\s*"?${VERSION_RE}"?`);
        const v = m[1].match(verRe);
        return v ? v[1] : null;
      },
    },
    // 5. Generic fallback: a line mentioning the bare package name
    //    that also contains a semver-shaped token.
    {
      name: "line-fallback",
      fn: (text) => {
        const wordRe = new RegExp(`\\b${name}\\b`);
        const verRe = new RegExp(VERSION_RE);
        for (const line of text.split("\n")) {
          if (wordRe.test(line)) {
            const v = line.match(verRe);
            if (v) return v[1];
          }
        }
        return null;
      },
    },
  ];

  for (const p of patterns) {
    const hit = p.re ? lockText.match(p.re)?.[1] : p.fn(lockText);
    if (hit) return hit;
  }
  return null;
}

/** Names of patterns attempted, exposed for diagnostic messages. */
export const RESOLVER_PATTERN_NAMES = [
  "bun-quoted",
  "bun-npm-alias",
  "unquoted-key",
  "yaml-block",
  "line-fallback",
];

// ─────────────────────────── self-test ───────────────────────────
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("--self-test")) {
  const cases = [
    {
      label: "bun quoted form",
      text: `"date-fns@3.6.0": {\n  "integrity": "sha..."\n}`,
      pkg: "date-fns",
      expect: "3.6.0",
    },
    {
      label: "bun npm alias",
      text: `"date-fns@npm:date-fns@4.1.0": {}`,
      pkg: "date-fns",
      expect: "4.1.0",
    },
    {
      label: "unquoted key",
      text: `\ndate-fns@2.30.0:\n  resolved "..."`,
      pkg: "date-fns",
      expect: "2.30.0",
    },
    {
      label: "yaml block",
      text: `"date-fns":\n  version: "3.6.0"\n  resolved: "..."`,
      pkg: "date-fns",
      expect: "3.6.0",
    },
    {
      label: "yaml block unquoted",
      text: `date-fns:\n  version: 5.0.1\n`,
      pkg: "date-fns",
      expect: "5.0.1",
    },
    {
      label: "pre-release version",
      text: `"date-fns@4.0.0-beta.1": {}`,
      pkg: "date-fns",
      expect: "4.0.0-beta.1",
    },
    {
      label: "build metadata",
      text: `"date-fns@3.6.0+build.5": {}`,
      pkg: "date-fns",
      expect: "3.6.0+build.5",
    },
    {
      label: "scoped package",
      text: `"@scope/pkg@1.2.3": {}`,
      pkg: "@scope/pkg",
      expect: "1.2.3",
    },
    {
      label: "fallback line",
      text: `# date-fns is at 3.6.0 somewhere`,
      pkg: "date-fns",
      expect: "3.6.0",
    },
    {
      label: "missing entry",
      text: `"other-pkg@1.0.0": {}`,
      pkg: "date-fns",
      expect: null,
    },
  ];

  let pass = 0;
  let fail = 0;
  for (const c of cases) {
    const got = resolveLockedVersion(c.text, c.pkg);
    const ok = got === c.expect;
    if (ok) {
      pass++;
      console.log(`  ✓ ${c.label} → ${got}`);
    } else {
      fail++;
      console.error(`  ✗ ${c.label}: expected ${c.expect}, got ${got}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
