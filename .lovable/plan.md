
## Plan: Install verification report after `bun install`

### Goal
After every CI install, print a compact human-readable report showing the resolved `date-fns` version, the lockfile's recorded version, the `package.json` spec, and the integrity hashes for both `date-fns` and `bun.lock` itself. Surfaces drift visually in CI logs without adding a new failure mode.

### Change — new file `scripts/install-report.mjs`

Pure Node, zero deps. Reads from disk only.

```js
#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = process.cwd();
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const SPEC = PKG.dependencies?.["date-fns"] ?? PKG.devDependencies?.["date-fns"] ?? "—";

const dfPkgPath = join(ROOT, "node_modules", "date-fns", "package.json");
const INSTALLED = existsSync(dfPkgPath)
  ? JSON.parse(readFileSync(dfPkgPath, "utf8")).version
  : "(not installed)";

const lockPath = join(ROOT, "bun.lock");
let LOCKED = "—";
let lockSha = "—";
let lockSize = 0;
if (existsSync(lockPath)) {
  const buf = readFileSync(lockPath);
  lockSha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  lockSize = statSync(lockPath).size;
  const m = buf.toString("utf8").match(/"date-fns"[^\n]*\n[^\n]*?(\d+\.\d+\.\d+)/);
  if (m) LOCKED = m[1];
}

let dfSha = "—";
if (existsSync(dfPkgPath)) {
  // Hash the installed package.json as a cheap proxy for tarball identity
  dfSha = createHash("sha256")
    .update(readFileSync(dfPkgPath))
    .digest("hex")
    .slice(0, 16);
}

const aligned =
  SPEC.replace(/^[\^~]/, "") === INSTALLED && INSTALLED === LOCKED;

const line = (k, v) => `  ${k.padEnd(22)} ${v}`;
console.log("──────── Install verification report ────────");
console.log(line("date-fns spec",       SPEC));
console.log(line("date-fns locked",     LOCKED));
console.log(line("date-fns installed",  INSTALLED));
console.log(line("date-fns pkg sha256", dfSha));
console.log(line("bun.lock sha256",     lockSha));
console.log(line("bun.lock size",       `${lockSize} bytes`));
console.log(line("alignment",           aligned ? "✓ spec / lock / installed match" : "✗ DRIFT"));
console.log("─────────────────────────────────────────────");
```

### Wire into CI

**`scripts/ci-smoke.sh`** — insert as a new step after the version-pin assertion (current step 4), before `verify-datefns-files.mjs` (current step 5). New shape: 6 steps.

**`scripts/ci-check.sh`** — insert at the same logical position (after step 4, before step 5). New shape: 10 steps.

The report runs *after* the existing assertion that already exits non-zero on drift, so the report is informational — never the gating check.

### Why this shape
- **Report-only, no new exit codes.** Drift is already caught by the upstream version-pin assertion; this step exists to make the *evidence* visible in the log.
- **Short SHA prefixes (16 chars).** Enough entropy to spot any change run-over-run, short enough to scan at a glance.
- **`package.json` SHA, not full tarball SHA.** Computing a tarball hash would require re-streaming the install cache; the package.json hash flips for any version/build change, which is what we care about.
- **`bun.lock` SHA + byte size.** Two cheap fingerprints — if either changes between runs, you know the lockfile mutated.
- **Zero deps, pure Node.** Same constraint as `verify-datefns-files.mjs` and `generate-datefns-smoke-test.mjs`.

### Verification
1. `node scripts/install-report.mjs` → prints the 7-line report ending with `✓ spec / lock / installed match`.
2. `bash scripts/ci-smoke.sh` → 6 steps green, report visible in step 5.
3. `bash scripts/ci-check.sh` → 10 steps green, report visible in step 5.
4. Sanity: temporarily edit `package.json` `date-fns` to `3.5.0` (no reinstall) → upstream step still fails first; if bypassed, report shows `✗ DRIFT`. Revert.

### Risk / scope
- One new file (~40 lines). Two CI scripts gain one step each. No source, dependency, route, schema, or runtime changes.
- Adds <50ms to CI (one file read + two SHA-256 hashes of small files).
