# Welcome to your Lovable project

## 📑 Quick Access: Audit Report
- **Markdown Version:** [audit_report.md](./audit_report.md)
- **PDF Version:** [audit_report.pdf](./audit_report.pdf) (Generated automatically on updates)

[![Verify date-fns](https://github.com/OWNER/REPO/actions/workflows/verify-date-fns.yml/badge.svg?branch=main)](https://github.com/OWNER/REPO/actions/workflows/verify-date-fns.yml)
[![Smoke date-fns](https://github.com/OWNER/REPO/actions/workflows/smoke-date-fns.yml/badge.svg?branch=main)](https://github.com/OWNER/REPO/actions/workflows/smoke-date-fns.yml)
[![Audit PDF Generation](https://github.com/OWNER/REPO/actions/workflows/generate-audit-pdf.yml/badge.svg?branch=main)](https://github.com/OWNER/REPO/actions/workflows/generate-audit-pdf.yml)

> Replace `OWNER/REPO` above with your GitHub `owner/repo` slug (e.g. `acme/united-code-flow`) so the badges resolve to your repository's workflow runs.

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Coding conventions

### Indexed objects and typed env access

`tsconfig.app.json` enables `noPropertyAccessFromIndexSignature` so TypeScript
does not silently treat arbitrary index-signature keys as known properties.
This catches typos early and keeps env/config objects explicit.

**✅ Do** use bracket notation for keys that come from an index signature:

```ts
const value = record["someKey"];
const flag = settings[dynamicKey];
```

For Vite env vars, add known fields to `src/vite-env.d.ts` before using dot
access:

```ts
const url = import.meta.env.VITE_SUPABASE_URL;
```

**❌ Don't** use dot access for arbitrary indexed keys:

```ts
const value = record.someKey;
```

### `date-fns` imports — subpath only

This project pins `date-fns` and **requires** subpath imports. Top-level barrel
imports break tree-shaking and have regressed across past upgrades, so they
are forbidden by lint, type-check, and CI.

**✅ Do**

```ts
import { format } from "date-fns/format";
import { addMonths } from "date-fns/addMonths";
import { ptBR } from "date-fns/locale/pt-BR";
```

**❌ Don't**

```ts
import { format, addMonths } from "date-fns";          // barrel — banned
import { ptBR } from "date-fns/locale";                 // locale barrel — banned
import { format } from "date-fns/this-does-not-exist"; // bad subpath — banned
```

#### How this is enforced

Four overlapping guards. If you violate the rule, at least one fails before
your change merges:

1. **ESLint — `no-restricted-imports`** (`eslint.config.js`)
   Blocks `from "date-fns"` and `from "date-fns/locale"` with a message
   pointing at the correct pattern.
2. **ESLint — `import/no-unresolved` + `import/named`** (`eslint.config.js`,
   `src/**/*.{ts,tsx}` only) Uses the TypeScript resolver against
   `tsconfig.app.json`, so any non-existent subpath or named export fires
   immediately at lint time.
3. **TypeScript** (`tsconfig.app.json`) The following compiler options are
   set so invalid subpaths fail type-check with a clear `TS2307`:
   - `"resolvePackageJsonExports": true` — honors `date-fns`'s `exports`
     field, so unexported subpaths fail to resolve.
   - `"resolvePackageJsonImports": true` — same for `imports`.
   - `"allowArbitraryExtensions": false` — prevents accidental escape
     hatches.
   - `"noUncheckedSideEffectImports": true` — flags side-effect imports of
     missing modules.
4. **CI scripts** (`scripts/ci-smoke.sh`, `scripts/ci-check.sh`) Assert the
   pinned `date-fns` version matches what's installed and locked, then print
   the install verification report (`scripts/install-report.mjs`) so any
   drift is visible in CI logs.

#### Why

`date-fns` v3+ ships ESM with a strict `exports` field, but bundlers and
Node resolvers historically disagreed on what's allowed. Subpath imports are
the one pattern that:
- tree-shakes correctly in Vite/Rollup,
- works under `moduleResolution: "bundler"` with `resolvePackageJsonExports`,
- survives minor `date-fns` version bumps without surprise breakage.

If you're adding a new helper, find its subpath in `node_modules/date-fns/`
or on [date-fns.org](https://date-fns.org) — every public function has a
matching `date-fns/<functionName>` entry.

## Running lint locally

Copy-paste these commands to reproduce the same lint checks CI runs. Both must exit `0` for a green build.

```sh
# 1. General ESLint — fails on ANY warning or error.
npm run lint -- --max-warnings=0

# 2. date-fns barrel-import rule — prints offending files + fix commands on failure.
npm run lint:date-fns

# Run BOTH in sequence with a single summary table (recommended).
bun run lint:all

# Watch mode for local dev — re-runs both suites on every save in src/.
bun run lint:watch

# Auto-fix date-fns barrel imports where possible.
bun run lint:date-fns:fix
```

| Command | What it checks | Exit `0` means |
|---|---|---|
| `npm run lint -- --max-warnings=0` | All ESLint rules across the repo, zero-warnings policy | No errors **and** no warnings |
| `npm run lint:date-fns` | `date-fns` / `date-fns/locale` barrel imports are forbidden (subpath only) | No barrel imports in `src/` |
| `bun run lint:all` | Both of the above, in sequence, with a summary table | Both suites passed |

## Running CI locally

The CI gate scripts (`scripts/ci-check.sh`, `scripts/ci-smoke.sh`) are
cross-platform bash scripts. They preflight-check that `bun` and `node` are
on PATH and adapt cache eviction per OS.

- **macOS / Linux / WSL**: `bash scripts/ci-check.sh` (or `bun run ci:check`).
- **Windows**: run from Git Bash or WSL, or use `bun run ci:check` /
  `bun run ci:smoke` — Bun ships a POSIX shell wrapper. `cmd.exe` and
  PowerShell are not supported; the scripts must be invoked through bash.

Prerequisites: [Bun](https://bun.sh) and [Node.js](https://nodejs.org). If
either is missing, the preflight prints a friendly error and exits 127.

### Optional full smoke on every push

By default, the pre-push Git hook runs a lightweight `date-fns` integrity
check (~10s). To run the full `scripts/ci-smoke.sh` lane (clean install +
all verifications, ~2 min) on every push instead:

```sh
# One-time (current push only)
FULL_SMOKE_PRE_PUSH=1 git push

# Persistent for this repo (stored in .git/config)
bun run hook:smoke:enable

# Disable and return to lightweight mode
bun run hook:smoke:disable
```

Bypass any hook in an emergency: `git push --no-verify`.

### `test:date-fns` — focused smoke test

`bun run test:date-fns` runs **only** `src/test/dateFns.smoke.test.ts` —
the auto-generated import smoke test that imports every `date-fns/<subpath>`
referenced by `src/`. It's the same vitest invocation CI uses, so a green
local run is a strong signal that the date-fns lane in CI will be green too.

**When to run it:**

- After adding, removing, or renaming a `date-fns/<subpath>` import.
- After changing the locked `date-fns` version in `package.json` / `bun.lock`.
- After a `bun install` that touched `node_modules/date-fns` (broken installs
  surface here before the rest of vitest runs).
- While iterating: `bun run test:date-fns:watch` re-runs on save.

**Relation to CI:**

| Step | Local command | CI script step |
|---|---|---|
| Subpath files exist on disk | `bun run verify:datefns-files` | `ci-check.sh [7/14]`, `ci-smoke.sh [5/9]` |
| ESLint barrel-import gate | `bun run lint:date-fns` | `ci-check.sh [6/14]`, `ci-smoke.sh [7/9]` |
| Smoke test up-to-date | `bun run verify:datefns-smoke` | `ci-check.sh [10/14]` |
| Smoke test types compile | `bun run verify:datefns-smoke-types` | `ci-check.sh [11/14]`, `ci-smoke.sh [8/9]` |
| **Smoke test runs green** | **`bun run test:date-fns`** | **`ci-check.sh [13/14]`, `ci-smoke.sh [8/9]`** |

CI invokes `bun run test:date-fns` directly (with extra reporters appended
after `--`), so the base command is identical in both environments — what
passes locally passes in CI for this lane.


### `test:date-fns:parity` — bun ↔ npm parity guard

`bun run test:date-fns:parity` (or `npm run test:date-fns:parity`) runs the
`test:date-fns` smoke test under **both** package managers and asserts they
produce the same outcome — same exit code, same total/passed/failed counts,
**and** the same set of failed test identities. This catches the case where
an `npm`-only consumer (Vercel preview, contributor without bun, downstream
tooling) would resolve a different `date-fns` module tree than CI, or where
two runners post identical pass/fail counts while failing entirely
different tests.

The same script runs in CI as the [`datefns-parity`](./.github/workflows/datefns-parity.yml)
workflow on every PR/push that touches `src/**`, `package.json`,
`package-lock.json`, `bun.lock`, or the parity script itself, plus a weekly
heartbeat. Locally, both `bun` and `npm` must be on `PATH`; if only one is
available the script logs a warning and trivially passes.

**When to run it:**

- Before pushing a `date-fns` upgrade or any `package.json` / lockfile
  change that touches transitive deps.
- When `npm ci` and `bun install` produce different `node_modules/date-fns`
  trees (rare, but happens on lockfile drift).
- After changing `scripts/verify-datefns-files.mjs`,
  `scripts/generate-datefns-smoke-test.mjs`, or anything that affects how
  subpaths are discovered or verified.
- To debug a "passes locally on bun, fails on npm in CI" report.

**Common flags** (everything after `--` is forwarded to vitest in **both**
runners — see `scripts/verify-test-datefns-parity.mjs` for the full list):

```sh
# Scope parity to a subset of tests
bun run test:date-fns:parity -- -t format

# Write machine-readable + markdown summaries (CI does this automatically)
bun run test:date-fns:parity \
  --json-out ci-artifacts/parity.json \
  --md-out   ci-artifacts/parity.md \
  --quiet
```

**Exit codes:**

| Code | Meaning | What to do |
|---:|---|---|
| `0` | Parity confirmed, OR only one runner available and it passed. | Nothing — green. |
| `1` | Both runners ran but disagreed on exit code, test counts, OR the set of failed tests. | See *Troubleshooting* below. |
| `2` | Neither runner is on `PATH`, or invocation error (script failed before either runner finished). | Install missing tool (`bun` or `npm`), then retry. |

**Troubleshooting a mismatch:**

1. **Read the structured summary.** The script prints a JSON block (with
   per-runner `failedTests[]`) and a markdown table at the end of every
   run. CI also appends the markdown to `$GITHUB_STEP_SUMMARY` — read that
   first, it names the outlier runner and the diverging tests.
2. **Check for lockfile drift.** Run
   `bun run deps:health` and inspect `public/dependency-health.json` →
   `lockfileDrift.detected`. If true, regenerate the offending lockfile
   (`bun install` or `npm install`) and commit it.
3. **Reproduce npm side cleanly.** A surprising mismatch is almost always a
   stale `node_modules`:
   ```sh
   rm -rf node_modules
   npm ci
   npm run test:date-fns
   ```
4. **Compare resolved subpaths.** Run
   `bun run verify:datefns-files -- --write-health` under each manager
   (separate clones if needed) and diff
   `public/dependency-health.json` → `dateFns.subpaths.entries[]`. A
   `resolvedFile` change between the two runs explains the parity break.
5. **Scope down.** Use `-- -t <pattern>` to isolate the failing test, then
   the per-runner `failedTests[]` in the JSON summary tells you exactly
   which assertions diverge.
6. **Last resort — bypass.** Parity is a CI gate, not a local hard block.
   `git push --no-verify` skips the pre-push hook; the CI job can be
   re-run from the GitHub UI once the underlying drift is fixed.



`src/test/dateFns.timezone.test.ts` enforces `TZ=UTC` so `date-fns`
formatting (especially with `pt-BR`) is deterministic across machines. CI
pins `TZ: UTC` on the relevant workflows. To run locally in a different
zone, override both vars:

```sh
EXPECTED_TZ=America/Sao_Paulo TZ=America/Sao_Paulo \
  bunx vitest run src/test/dateFns.timezone.test.ts
```
