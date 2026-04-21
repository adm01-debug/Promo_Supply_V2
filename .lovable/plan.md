
## Plan: Dependency-health status badge in app header

### Goal
Surface a compact "CI status" badge next to the existing header actions (visible only to admins) that reads `public/dependency-health.json` and shows at-a-glance whether the last CI run is healthy. Clicking the badge navigates to `/admin/dependency-health` for the full dashboard.

### Behavior

The badge derives a single status from the snapshot:
- **green ("CI OK")** — `lockfileDrift.detected === false` AND no package has `driftDetected` AND `treeShaking.riskLevel !== "critical"` AND (if present) `smokeTest.status !== "fail"`.
- **amber ("CI atenção")** — any package drifted OR `treeShaking.riskLevel === "warning"` OR snapshot is older than 7 days.
- **red ("CI falhou")** — `lockfileDrift.detected === true` OR `treeShaking.riskLevel === "critical"` OR `smokeTest.status === "fail"`.
- **neutral ("CI ?")** — fetch failed / file missing.

Tooltip shows: status label, "última verificação há X" (relative time from `generatedAt`), drift count, and smoke test result if present. Click → `navigate("/admin/dependency-health")`.

### New file: `src/components/admin/DependencyHealthBadge.tsx` (~80 lines)

- Self-contained client component, lazy-loaded.
- Uses `useQuery` with key `["dep-health-static"]`, `staleTime: 5 * 60_000`, `refetchOnWindowFocus: false`.
- Fetches `/dependency-health.json` via plain `fetch` (static asset, no auth).
- Renders nothing until query settles to avoid layout shift.
- Renders a `<Button variant="ghost" size="sm">` with a colored dot (`bg-success` / `bg-warning` / `bg-destructive` / `bg-muted-foreground`) + short label (hidden on `<md`, visible on `md+`). Wrapped in `Tooltip`.
- Permission gate: only renders when `usePermissions().isAdmin` is true (mirror pattern used elsewhere) — non-admins see nothing.

```tsx
const status = computeStatus(snapshot);
return (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dependency-health")}
              aria-label={`Status do CI: ${status.label}`} className="gap-1.5 h-8">
        <span className={cn("w-2 h-2 rounded-full", status.dotClass,
                            status.tone === "fail" && "animate-pulse")} />
        <span className="hidden md:inline text-xs">{status.label}</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>...</TooltipContent>
  </Tooltip>
);
```

### Edit: `src/components/layout/HeaderActions.tsx` (~3 lines)

Insert the badge between `ThemeToggle` and the Accessibility popover (admin-only by component-internal gate, so unconditional in JSX). Lazy-imported via `React.lazy` + `Suspense fallback={null}` to keep header bundle slim.

### What does NOT change
- `public/dependency-health.json` schema — already contains everything needed (`generatedAt`, `lockfileDrift`, `packages`, `treeShaking`, optional `smokeTest`).
- Edge function, admin page, history table, migrations.
- Routes, sidebar, mobile bottom nav.

### Verification
1. As admin, header shows green dot + "CI OK" with current `dependency-health.json` (no drift). Click → lands on `/admin/dependency-health`.
2. Manually edit `public/dependency-health.json` setting `lockfileDrift.detected: true` → badge turns red and pulses; tooltip shows drifted packages count.
3. Set snapshot `generatedAt` to 10 days ago → badge turns amber with "verificação antiga".
4. As non-admin user, badge does not render.
5. Delete the JSON file (or block fetch) → badge silently does not render (no console errors).

### Risk / scope
- 1 new ~80-line component, ~3 lines added to `HeaderActions.tsx`. No new deps. No state/store changes. Static-asset fetch only — zero edge function load.
