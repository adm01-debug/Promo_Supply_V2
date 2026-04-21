
## Plan: On-demand dependency-health generation (CI + admin button)

### Goal
Let `public/dependency-health.json` be regenerated on demand from two triggers — a manually-dispatched GitHub Actions job and the existing admin "Refresh now" button — without a full rebuild. The admin button already writes to the `dependency_health` table via the edge function; this plan closes the loop so the **static JSON in the repo** can also be refreshed deterministically by CI.

### Current state (already in place)
- Edge function `supabase/functions/dependency-health/index.ts` — `GET` returns stored/fallback snapshot, `POST` (admin) recomputes from GitHub raw files and upserts to `dependency_health` table.
- `src/pages/admin/DependencyHealth.tsx` — "Refresh now" button wired to `POST`.
- `scripts/ci-check.sh` step [11/11] — writes `public/dependency-health.json` during full CI.
- Route `/admin/dependency-health` — admin-only, consumes the JSON.

### Gaps to close
1. No way to regenerate the **static JSON** without running the full 11-step `ci-check.sh`.
2. No GitHub-native "run now" trigger — today you must push a commit.
3. Admin button refreshes DB state but doesn't update the committed snapshot.

### Changes

#### 1. New standalone script: `scripts/generate-dependency-health.mjs`
Extracts just step [11/11] of `ci-check.sh` into a reusable Node script.

- Reads `package.json` → `dependencies["date-fns"]` → `spec`.
- Reads `bun.lock` → resolves locked `date-fns` via existing `scripts/lib/resolve-locked-version.mjs`.
- Reads `node_modules/date-fns/package.json` if present → `installed` (falls back to `locked`).
- Computes `exactPinned` (`/^\d+\.\d+\.\d+$/.test(spec)`) and `lockfileDrift.detected` (`spec.replace(/^[\^~]/,'') !== locked`).
- Writes `public/dependency-health.json` with `source: "scripts/generate-dependency-health.mjs"`.
- Exits 0 on success, non-zero with clear message on failure.

Added to `package.json` scripts:
```json
"deps:health": "node scripts/generate-dependency-health.mjs"
```

#### 2. New GitHub Actions workflow: `.github/workflows/dependency-health.yml`
Triggers:
- `workflow_dispatch` — manual "Run workflow" button in the Actions tab.
- `schedule` — weekly cron (Mondays 06:00 UTC) to catch silent drift.
- `push` on `main` when `package.json` or `bun.lock` changes — auto-refresh on dep bumps.

Steps:
1. Checkout (with a write-capable token via default `GITHUB_TOKEN` + `permissions: contents: write`).
2. Setup Bun + cache (same pattern as `lint.yml`).
3. `bun install --frozen-lockfile --dry-run` (reuse the drift gate).
4. `bun install --frozen-lockfile`.
5. `bun run deps:health`.
6. If `public/dependency-health.json` changed: commit with message `chore(deps): refresh dependency-health snapshot [skip ci]` and push back to the branch. Uses `stefanzweifel/git-auto-commit-action@v5` (already-idiomatic for this pattern). If no diff, the action no-ops.

#### 3. Edge function enhancement: `supabase/functions/dependency-health/index.ts`
Add an optional `?dispatchCi=true` query param on `POST` (admin-only). When set and a `GITHUB_DISPATCH_TOKEN` secret is configured, the function fires a `workflow_dispatch` event against `.github/workflows/dependency-health.yml`, so the admin button can ALSO trigger the GitHub Actions job that commits the updated JSON back to the repo.

- New optional secret: `GITHUB_DISPATCH_TOKEN` (fine-grained PAT with `actions:write` + `contents:read` on the repo, or repo-scoped token). Requested via `add_secret`. If unset, the `dispatchCi` param is silently ignored (DB upsert still happens).
- Reuses existing `GITHUB_REPO_RAW_BASE` to derive `<owner>/<repo>` (parse the path segments); if not parseable, skip dispatch and return a soft warning in the response payload (`{ ...payload, ciDispatch: "skipped: owner/repo not derivable" }`).

#### 4. Frontend: `src/pages/admin/DependencyHealth.tsx`
Add a second button next to "Refresh now":
- **"Refresh & commit to repo"** (admin-only) — calls `POST /dependency-health?dispatchCi=true`.
- Shows toast with either `ciDispatch: "queued"` or the skip reason returned by the function.
- No design changes beyond one extra `<Button variant="outline">`.

### What does NOT change
- `scripts/ci-check.sh` — still runs step [11/11] inline; the new script is the same logic, so CI stays byte-identical. (Optional follow-up: have step [11/11] call `bun run deps:health` for DRY — explicitly out of scope here.)
- `DependencyHealthSnapshot` TS interface, route registration, RLS policies, table schema.
- Existing workflows (`typecheck.yml`, `lint.yml`, `lint-date-fns.yml`).

### Verification
1. Run `bun run deps:health` locally → `public/dependency-health.json` regenerates with matching content and new `generatedAt`.
2. Actions tab → manually dispatch `dependency-health` workflow → bot commit appears on `main` if the JSON changed; no commit if unchanged.
3. Edit `package.json` on a PR → merge → push-trigger regenerates and commits.
4. Weekly schedule → Monday run either no-ops (clean) or commits a drift fix.
5. Admin "Refresh now" (no CI) → DB updated, static JSON untouched (today's behavior).
6. Admin "Refresh & commit to repo" with `GITHUB_DISPATCH_TOKEN` set → DB updated AND workflow queued; confirm in Actions tab. Without token → DB updated, toast shows skip reason.
7. Non-admin → both buttons hidden; `POST` returns 403.

### Technical details
- **Secret shape**: `GITHUB_DISPATCH_TOKEN` is a GitHub PAT, NOT a Supabase secret's public twin — handled only server-side in the edge function.
- **Owner/repo parsing**: `GITHUB_REPO_RAW_BASE` format assumed `https://raw.githubusercontent.com/<owner>/<repo>/<branch>`; split on `/` after host, take segments `[3]` and `[4]`. On any mismatch, skip dispatch rather than error.
- **Commit loop safety**: `[skip ci]` in the auto-commit message prevents other workflows from re-firing on the bot commit.
- **Write permission**: workflow uses `permissions: contents: write` scope; no PAT needed for self-commits.
- **No `verify_jwt` change** in `supabase/config.toml` — function already self-validates.

### Risk / scope
- 1 new script (~60 lines), 1 new workflow (~35 lines), 1 new `package.json` script line, ~30 added lines in edge function, 1 new button in `DependencyHealth.tsx`, 1 optional secret. Zero schema changes, zero existing-file deletions, graceful degradation when the new secret is absent.
