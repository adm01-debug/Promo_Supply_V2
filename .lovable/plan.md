
## Plan: Admin panel showing detected date-fns subpaths & locales

### Goal
Surface a read-only "Detected date-fns usage" section inside the existing admin Dependency Health page that lists every subpath and locale the generator currently detects, sourced from the latest generator run. Lets admins audit tree-shaking surface area without opening the test file.

### Approach
The generator already knows the full subpath/locale inventory at run time. Today it only writes the smoke test file. Extend it to **also** emit a small JSON manifest under `public/`, then render it in the admin page.

### Changes

#### 1. `scripts/generate-datefns-smoke-test.mjs` — emit manifest

After the smoke test write, also write `public/datefns-usage.json`:

```json
{
  "generatedAt": "2026-04-21T...",
  "totalSubpaths": 42,
  "totalFunctions": 38,
  "totalLocales": 4,
  "functions": [
    { "subpath": "addYears", "exports": ["addYears"] },
    { "subpath": "format",   "exports": ["format"] }
  ],
  "locales": [
    { "subpath": "locale/pt-BR", "exports": ["ptBR"] },
    { "subpath": "locale/en-US", "exports": ["enUS"] }
  ]
}
```

Reuses the already-built `subpaths` Map / `fnSubpaths` / `localeSubpaths` arrays — ~15 added lines, deterministic output (sorted keys), no new deps.

#### 2. `scripts/ci-check.sh` — include manifest in drift check

Step [9/11] currently diffs only `src/test/dateFns.smoke.test.ts`. Extend it to also back up + diff `public/datefns-usage.json`, with the same restore-on-fail behavior. Same actionable error message ("Run … and commit"). ~15 added lines.

#### 3. `src/components/admin/DateFnsUsagePanel.tsx` (new, ~120 lines)

- `useQuery(["datefns-usage-static"], () => fetch("/datefns-usage.json").then(r => r.json()))`, `staleTime: 5 * 60_000`.
- Renders a `<Card>` with:
  - Header: "Uso de date-fns detectado" + small muted timestamp ("atualizado há X").
  - Three KPI chips: total subpaths, total função exports, total locales.
  - Two collapsible tables (shadcn `<Table>` inside `<Collapsible>`, locales open by default since list is short):
    - **Funções** — columns: Subpath, Exports (comma-joined badges), count. Sortable client-side by clicking headers (subpath asc default).
    - **Locales** — same columns.
  - Search input above the funções table that filters rows by subpath or export name (case-insensitive `includes`).
  - Empty state if fetch fails / file missing: muted text "Manifesto não encontrado. Rode `node scripts/generate-datefns-smoke-test.mjs`."
- No write actions, fully read-only.

#### 4. `src/pages/admin/DependencyHealth.tsx` — mount the panel

Insert `<DateFnsUsagePanel />` below the existing drift history card (lazy-imported via `React.lazy` + `Suspense fallback={<Skeleton className="h-48" />}`). One `import` + one JSX line.

### What does NOT change
- Smoke test file structure, vitest config, edge function, history table, badge component.
- Routes, sidebar, mobile nav.
- Step numbering in `ci-check.sh`.

### Verification
1. Run generator locally → `public/datefns-usage.json` appears with sorted, deduped entries; admin page lists same subpaths as the auto-generated smoke test imports.
2. Add a new `import { addYears } from "date-fns/addYears"` in `src/`, regenerate → manifest grows by one row; admin panel reflects it on next refresh.
3. Skip regeneration after editing imports → ci-check step [9/11] fails with the existing actionable error, now also citing `public/datefns-usage.json` if that's the drifted file.
4. Delete the manifest file → admin panel shows empty state with the run-the-generator hint; no console errors.
5. Search "ptBR" → locales table filters to the matching row; funções table empties.

### Technical details
- Manifest is a static asset → zero edge function load, cacheable by the browser.
- Component is admin-only by virtue of living inside `/admin/dependency-health` (already gated by `<ProtectedRoute>` + admin role check on that route).
- Sort/filter is purely client-side over a small array (<200 rows in practice).
- File-size budget respected: panel ≤ 150 lines; helper `computeStatus` not needed here.

### Risk / scope
- 1 new component (~120 lines), ~15 added lines in generator, ~15 added lines in `ci-check.sh`, ~3 lines in admin page. No new deps, no schema changes, no behavioral regression on green CI runs.
