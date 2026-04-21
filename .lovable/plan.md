
## Plan: Dependency-health snapshot history + drift trend view

### Goal
Persist the last N (default **30**) dependency-health snapshots and render a "Histórico de drift" section on `/admin/dependency-health` showing drift over time, so admins can see when packages drifted/recovered without scrubbing through git history.

### Data model

#### New table: `public.dependency_health_history`
```sql
create table public.dependency_health_history (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,          -- full DependencyHealthSnapshot
  drift_count int not null,        -- packages.filter(driftDetected).length
  barrel_imports int not null,     -- treeShaking?.barrelImportsFound ?? 0
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index dependency_health_history_generated_at_idx
  on public.dependency_health_history (generated_at desc);
```

RLS:
- `select` — `authenticated` (matches existing `dependency_health_read_auth`).
- `insert` — `has_role(auth.uid(), 'admin')` (only triggered server-side by edge function with service role anyway, but keep parity).
- No `update` / `delete` policies — history is append-only; pruning is server-side via service role.

The current `dependency_health` table stays as the **latest** singleton — unchanged.

### Backend changes

#### `supabase/functions/dependency-health/index.ts`
After the existing `upsert` of the latest snapshot in `handlePost`, also:
1. `insert` the same payload into `dependency_health_history` with computed `drift_count`, `barrel_imports`, `generated_at`, `created_by`.
2. Prune: `delete from dependency_health_history where id not in (select id from dependency_health_history order by generated_at desc limit 30)`. Use a single SQL via `admin.rpc` or two queries (`select` ids → `delete`) — pick the two-query approach since arbitrary SQL isn't allowed; keeps it safe.

No changes to `handleGet` of `dependency-health`. Add a new `GET` branch on the **same function** keyed by `?history=true` that returns up to 30 rows: `[{ generatedAt, driftCount, barrelImports, packages: [{name, driftDetected}] }]` — slim projection, no full payload, to keep response small.

#### `scripts/generate-dependency-health.mjs`
No change. The CLI script writes the static JSON only; history is purely a runtime/edge concern (no point persisting CI runs to DB from local dev).

### Frontend changes

#### `src/pages/admin/DependencyHealth.tsx`
Add a new card **"Histórico de drift (últimas 30 atualizações)"** below the existing Tree-shaking card:

- New `useQuery` keyed `["dependency-health-history"]` calling `supabase.functions.invoke("dependency-health?history=true", { method: "GET" })`.
- Render a compact sparkline-style bar timeline using existing `<Sparkline>` (already in `src/components/ui/sparkline.tsx`) for `driftCount` over time, plus a second sparkline for `barrelImports`.
- Below the sparklines, a small table of the last 10 entries: `generated_at` (relative + absolute), `driftCount`, `barrelImports`, with row color tinted red when `driftCount > 0`.
- Empty state when `length === 0`: "Nenhuma atualização registrada ainda — clique em 'Atualizar agora' para começar a coletar histórico."
- Both refresh mutations (`refresh` and `refreshAndCommit`) `invalidateQueries(["dependency-health-history"])` on success so the sparkline updates immediately.

No new dependencies. Sparkline component already exists.

### What does NOT change
- `dependency_health` singleton table, RLS, or shape.
- Static JSON pipeline / GitHub workflow / `bun run deps:health`.
- ESLint rule, route registration, secrets.
- `DependencyHealthSnapshot` interface (history is a separate slim shape).

### Verification
1. Migration creates table + RLS; existing read still works.
2. Click "Atualizar agora" twice → DB has 2 rows in `dependency_health_history`; `?history=true` returns both.
3. After 31 refreshes, only 30 most-recent rows remain (oldest pruned).
4. Sparkline renders flat green when `driftCount` is always 0; spikes when a drift occurs.
5. Non-admin: `GET ?history=true` works (read-only auth); refresh buttons hidden as today.
6. Empty DB → empty state message renders cleanly.

### Risk / scope
- 1 migration (~25 lines), ~50 added lines in edge function, ~70 added lines in `DependencyHealth.tsx`. No schema impact on existing table, no secrets, append-only writes capped at 30 rows.
