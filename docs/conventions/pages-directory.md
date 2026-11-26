# pages/ Directory Convention

## Rule

Each sub-directory inside `src/pages/` must contain **exactly one route-level page component** (the component that is passed directly to `<Route element={...}>`). All other files in that directory should follow these guidelines:

| File type | Allowed? | Notes |
|---|---|---|
| `PageName.tsx` (route component) | ✅ Yes | Required — the page entry point |
| `pageNameHelpers.ts` | ✅ Yes | Page-specific utility functions/constants |
| `pageNameData.ts` | ✅ Yes | Static mock or seed data scoped to the page |
| `PageNameSubComponent.tsx` | ⚠️ Temporary | Must be migrated to `src/components/` when reused elsewhere |
| Generic shared components | ❌ No | Must live in `src/components/` from day one |

## Rationale

- `src/pages/` is indexed by route, not by feature — mixing utility components here blurs module boundaries
- Sub-components that grow beyond a single page become harder to discover and share
- Co-located helper/data `.ts` files are acceptable because they're page-specific and non-renderable

## Existing Violations (tracked for migration)

The following files were found in `pages/` but are really reusable sub-components. They should be migrated to `src/components/` incrementally:

- `src/pages/catalogo-spot/SpotFinancialTab.tsx` → `src/components/catalogo-spot/SpotFinancialTab.tsx`
- `src/pages/admin/AlertSubscriptionsPanel.tsx` → `src/components/admin/AlertSubscriptionsPanel.tsx`
- `src/pages/admin/ScanRunsSlaCard.tsx` → `src/components/admin/ScanRunsSlaCard.tsx`
- `src/pages/admin/WorkflowAdmin.tsx` → `src/components/admin/WorkflowAdmin.tsx`
- `src/pages/auth/AuthBranding.tsx` → `src/components/auth/AuthBranding.tsx`
- `src/pages/devolucoes/DevolucoesModals.tsx` → `src/components/devolucoes/DevolucoesModals.tsx`
- `src/pages/pedidos/PedidosKPIs.tsx` → `src/components/pedidos/PedidosKPIs.tsx`
- `src/pages/pedidos/PedidoDetailsDialog.tsx` → `src/components/pedidos/PedidoDetailsDialog.tsx`
- `src/pages/relatorios/RelatoriosCharts.tsx` → `src/components/relatorios/RelatoriosCharts.tsx`
- `src/pages/buyer/buyerDashboardHelpers.tsx` → `src/components/buyer/buyerDashboardHelpers.tsx` (TSX used for JSX helpers; consider `.ts` + separate components)
- `src/pages/fornecedores/SupplierPerformance.tsx` → **Keep** — this is a route component

## Linting

Until an ESLint plugin for custom directory rules is added, code reviewers should reject PRs that add new non-page `.tsx` files inside `src/pages/` sub-directories. Consult this document during PR review.

A future addition of `eslint-plugin-boundaries` will automate this check — see `docs/conventions/linting-roadmap.md`.
