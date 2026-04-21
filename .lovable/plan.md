
## Plan: Robust `bun.lock` version resolver

### Problem
Current resolver in `scripts/verify-datefns-versions.mjs` uses a single regex:
```js
lockText.match(/"date-fns@(\d+\.\d+\.\d+)"/);
```
This breaks if Bun changes lockfile formatting — e.g. drops quotes, switches to YAML-ish blocks, adds scopes, uses `date-fns: 4.1.0` key/value, or wraps versions in `npm:date-fns@…` aliases. Same fragile regex also lives in `scripts/install-report.mjs`.

### Approach
Replace the single regex with a small `resolveLockedVersion(lockText, pkgName)` helper that tries a prioritized list of patterns and returns the first match. Share it between both scripts via a tiny module.

### Change 1 — new `scripts/lib/resolve-locked-version.mjs`

Exports one function. Tries patterns in order, returns first hit or `null`:

1. **Bun text-lock (current):** `"date-fns@1.2.3"` — quoted key with `@version`.
2. **Bun text-lock alias form:** `"date-fns@npm:date-fns@1.2.3"` — strips `npm:<name>@` prefix.
3. **Unquoted key:** `date-fns@1.2.3:` — same shape without quotes (future Bun formats).
4. **YAML-style block:** a line matching `^\s*"?date-fns"?\s*:` followed within ~10 lines by `version:\s*"?1.2.3"?` — covers npm/yaml lockfile shapes if Bun ever pivots.
5. **Generic fallback:** scan all `1.2.3`-shaped tokens that appear on a line also containing the bare word `date-fns`, return the first.

Each pattern is a named step so failures can log *which* shapes were tried (useful diagnostic when Bun does change format).

Also handles edge cases:
- Pre-release/build tags: `1.2.3-beta.1`, `1.2.3+build` — version regex becomes `\d+\.\d+\.\d+(?:[-+][\w.]+)?`.
- Package name escaping (for the helper to be reusable for any pkg, not just `date-fns`).

### Change 2 — `scripts/verify-datefns-versions.mjs`

Replace the inline regex block (lines 30–34) with:
```js
import { resolveLockedVersion } from "./lib/resolve-locked-version.mjs";
const LOCKED = resolveLockedVersion(lockText, "date-fns");
if (!LOCKED) fail("✗ date-fns entry not found in bun.lock — run `bun install`.");
```

### Change 3 — `scripts/install-report.mjs`

Same swap: replace its inline `lockText.match(/"date-fns@.../)` with the shared helper. Keeps the two scripts in lockstep.

### Why this shape
- **Shared helper, not copy-paste.** Two scripts already do the same parse; centralizing prevents future drift.
- **Ordered patterns, not one mega-regex.** Easier to read, easier to extend, and the order encodes "most likely first" so the common path stays fast.
- **Pre-release support.** Bun resolves to whatever npm publishes; ignoring `-beta`/`+build` would silently fail on legitimate versions.
- **No new deps.** Pure Node string/regex work.
- **Diagnostic on miss.** When all patterns fail, error names which shapes were attempted — points the next maintainer at the right fix.

### Verification
1. Current `bun.lock` → both scripts still resolve `3.6.0`, exit 0.
2. Synthetic fixture tests in-line at the bottom of the helper (run via `node scripts/lib/resolve-locked-version.mjs --self-test`):
   - quoted Bun form, unquoted form, npm-alias form, YAML form, pre-release version, missing entry → null.
3. `bash scripts/ci-smoke.sh` and `bash scripts/ci-check.sh` → unchanged, green.

### Risk / scope
- One new file (~60 lines incl. self-test). Two existing scripts touched (~3 lines each). No source/dep/route/schema/CI-script changes. Failure path is strictly more permissive than before — anything the old regex matched, the new resolver also matches (pattern #1 is identical).
