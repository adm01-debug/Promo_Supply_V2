
## Plan: Lightweight refresh route for `dependency-health.json`

### Goal
Let an authenticated admin regenerate `public/dependency-health.json` (the snapshot consumed by `/admin/dependency-health`) on demand, without rebuilding/redeploying the frontend. Keep the existing `scripts/ci-check.sh` path working unchanged — the new route is a complementary runtime refresher.

### Approach
A Supabase Edge Function `dependency-health` that:
1. Accepts `GET` → returns the latest computed snapshot (JSON).
2. Accepts `POST` (admin only) → recomputes the snapshot from `package.json` + `bun.lock` fetched from the project's public GitHub raw URL (configurable via `GITHUB_REPO_RAW_BASE` secret), persists it to a `dependency_health` table, and returns the fresh JSON.
3. Both methods also return the same JSON shape the existing React page already expects, so no frontend changes are required to keep viewing it.

The static `public/dependency-health.json` stays as the CI-generated fallback (shipped with builds). The frontend page gets a small addition: a "Refresh now" button that hits the edge function and, on success, swaps the displayed data.

### Changes

#### 1. New table `public.dependency_health` (single-row snapshot)
Migration (via database migration tool):
```sql
create table public.dependency_health (
  id boolean primary key default true check (id),  -- enforces single row
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.dependency_health enable row level security;

-- Anyone authenticated can read the snapshot
create policy "dependency_health_read_auth"
  on public.dependency_health for select
  to authenticated using (true);

-- Only admins can upsert (via edge function using service role; policy is belt-and-suspenders)
create policy "dependency_health_write_admin"
  on public.dependency_health for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

#### 2. New edge function `supabase/functions/dependency-health/index.ts`
- CORS headers from `@supabase/supabase-js/cors`.
- `OPTIONS` → 204.
- **`GET`**: read the single row from `dependency_health`; if empty, fall back to fetching `/dependency-health.json` from the deployed site (or return a stub with `exactPinned: false`). Returns 200 JSON matching the `DependencyHealthSnapshot` interface.
- **`POST`**: 
  - Validate JWT: `supabase.auth.getUser(token)`; 401 on failure.
  - Check admin role via `has_role(user.id, 'admin')` RPC; 403 otherwise.
  - Fetch `package.json` and `bun.lock` from `${GITHUB_REPO_RAW_BASE}/package.json` and `.../bun.lock` (secret, e.g. `https://raw.githubusercontent.com/<owner>/<repo>/main`).
  - Parse: `spec` = `dependencies["date-fns"]`; `locked` = regex-extract first `date-fns` version block from `bun.lock`; `installed` mirrors `locked` (no `node_modules` in edge runtime — document this).
  - Compute `exactPinned` = spec matches `/^\d+\.\d+\.\d+$/`; `lockfileDrift.detected` = `spec.replace(/^[\^~]/,'') !== locked`.
  - `generatedAt` / `lastCheckedAt` = `new Date().toISOString()`; `source` = `"edge:dependency-health POST"`.
  - Upsert into `dependency_health` (id=true), stamping `updated_by = user.id`.
  - Return 200 with the fresh payload.
- Reject all other methods with 405.

No `supabase/config.toml` changes needed — default `verify_jwt = false` is fine since the function validates manually (and `GET` stays public-readable for authenticated users via a separate in-code check if desired).

#### 3. Secret: `GITHUB_REPO_RAW_BASE`
Use the `add_secret` flow to prompt the user for the raw GitHub base URL (e.g. `https://raw.githubusercontent.com/owner/repo/main`). Required only for `POST`; `GET` works without it.

#### 4. Frontend: `src/pages/admin/DependencyHealth.tsx`
- Change the `fetchSnapshot` query to call `supabase.functions.invoke("dependency-health", { method: "GET" })` and fall back to the static `/dependency-health.json` on error (so local dev without the function still works).
- Add a **"Refresh now"** button (admin-only, guarded via existing `usePermissions`/role check) that calls `POST` to the edge function, invalidates the `["dependency-health"]` React Query key, and shows a toast with the new `generatedAt`.
- No design changes beyond one button in the page header.

### What does NOT change
- `scripts/ci-check.sh` and the CI-generated `public/dependency-health.json` — still the build-time source of truth; the edge function is a runtime supplement.
- The `DependencyHealthSnapshot` TS interface and existing UI layout.
- Route registration in `src/routes/AppRoutes.tsx` (already wired at `/admin/dependency-health`, admin-only).

### Verification
1. Admin visits `/admin/dependency-health` → `GET` edge function returns the stored or static snapshot → page renders as today.
2. Admin clicks **Refresh now** → `POST` fetches `package.json` + `bun.lock` from GitHub, computes snapshot, upserts row, page re-renders with new `generatedAt`.
3. Non-admin attempts `POST` → 403; button is hidden for them.
4. Unauthenticated request → 401 on both verbs.
5. `GET` with empty table and unreachable GitHub → returns the static fallback JSON so the page never breaks.
6. CI-generated `public/dependency-health.json` still updated by `bun run ci:check`; edge-refreshed values simply take precedence at runtime.

### Risk / scope
- 1 new edge function, 1 new table + RLS, ~15 added lines in `DependencyHealth.tsx`, 1 secret. No existing files deleted, no breaking changes to the snapshot shape. Failure modes (GitHub unreachable, missing secret) degrade gracefully to the static JSON.
