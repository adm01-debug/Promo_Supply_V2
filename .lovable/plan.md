
## Plan: Extend dependency-health to React, Vite, TypeScript, shadcn/ui

### Goal
Track versions and drift status for additional core packages — `react`, `vite`, `typescript`, and shadcn/ui — alongside the existing `date-fns` data, in the same snapshot, edge function, CI workflow, and admin dashboard.

### Tracked packages
- **react** (`dependencies.react`)
- **vite** (`devDependencies.vite`)
- **typescript** (`devDependencies.typescript`)
- **shadcn/ui** — not a single npm package. Use `components.json` presence + a representative `@radix-ui/react-dialog` version (always present in shadcn projects) as the proxy version, labeled "shadcn/ui (radix-dialog proxy)".

### Snapshot shape (additive, backward-compatible)
Keep `dateFns` at top level for backward compat; add a `packages` array containing all five entries with the same fields (`name`, `spec`, `installed`, `locked`, `exactPinned`). UI prefers `packages` when present, falls back to `dateFns`.

```ts
interface PackageHealth {
  name: string;            // "react", "vite", ...
  label: string;           // display name
  spec: string;
  installed: string;
  locked: string;
  exactPinned: boolean;
  driftDetected: boolean;  // per-package drift
}
interface DependencyHealthSnapshot {
  generatedAt: string;
  dateFns: { ... };        // unchanged
  packages?: PackageHealth[];  // NEW
  lockfileDrift: { ... };  // unchanged (overall)
}
```

### Changes

#### 1. `scripts/generate-dependency-health.mjs`
Refactor inner logic into a `computePackageHealth(pkgJson, lockText, name, location)` helper. Call it for each tracked package. Emit `packages: [...]` plus the existing `dateFns` field. Aggregate `lockfileDrift.detected` = `packages.some(p => p.driftDetected)`.

#### 2. `supabase/functions/dependency-health/index.ts`
Mirror the same helper inline (Deno-side). Compute all five packages from the fetched `package.json` + `bun.lock`. Update the `DependencyHealthSnapshot` interface and the upserted payload. Existing fallback stub stays compatible.

#### 3. `scripts/ci-check.sh` step [11/11]
Replace the inline `cat > public/dependency-health.json <<JSON` block with a single call to `bun run deps:health` (the script is already authoritative). Keeps CI byte-identical to the script and avoids drift between the two code paths.

#### 4. `src/pages/admin/DependencyHealth.tsx`
- Extend `DependencyHealthSnapshot` with optional `packages: PackageHealth[]`.
- Render a new card "Pacotes monitorados" listing all entries in a compact table (name, spec, lock, installed, status badge). When `packages` is absent, fall back to today's `date-fns`-only view.
- Drift summary now reads `packages?.some(p => p.driftDetected) ?? lockfileDrift.detected`.

#### 5. Static fallback `public/dependency-health.json`
Regenerated automatically by the updated script; no manual edit needed.

### What does NOT change
- DB schema / `dependency_health` table (payload is already `jsonb`).
- RLS policies, route registration, `GITHUB_REPO_RAW_BASE` / `GITHUB_DISPATCH_TOKEN` secrets.
- `.github/workflows/dependency-health.yml` (it already runs `bun run deps:health`).
- Existing `dateFns` field on the snapshot — preserved for backward compat.

### Verification
1. Run `bun run deps:health` locally → JSON contains `packages` with 5 entries, all `driftDetected: false` if installs are clean.
2. Admin page → new "Pacotes monitorados" card shows React, Vite, TypeScript, shadcn/ui (radix-dialog proxy), date-fns rows.
3. Manually edit `package.json` to bump `vite` spec → `bun run deps:health` → that row shows drift.
4. Edge function `GET` returns the extended payload; `POST` upserts the new shape.
5. Old payloads in DB without `packages` still render (fallback to legacy `dateFns` card).
6. `bun run ci:check` step [11/11] now invokes the script and produces identical output for date-fns plus the four new entries.

### Risk / scope
- ~70 added lines in the script, ~50 in the edge function, ~60 in `DependencyHealth.tsx`, 3 lines changed in `ci-check.sh`. Backward compatible, no schema changes, no new secrets.
