
## Plan: Fix date-fns imports across the codebase

### Problem
`date-fns@4.x` removed the top-level barrel exports for many functions (`format`, `formatDistanceToNow`, `differenceInDays`, etc.), so `import { format } from "date-fns"` fails with TS2305 in 70+ files. The previous attempt to downgrade via `package.json` did not resolve it (the lockfile/install still resolves to v4 or the named exports remain unavailable).

### Fix
Switch every affected import from the barrel to the per-function subpath imports, which are stable across date-fns v3 and v4. This is the officially recommended pattern and avoids any dependency on the package version.

**Transformation pattern:**
```ts
// before
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// after
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";
```

### Scope (~40 files from build errors)
- `src/components/compras/`: BuyerPerformanceAlerts, ContractDetailsModal, ContractModal, DeliveryCalendar, EnhancedPedidoTimeline, OrderPreviewModal, QualificationHistoryTimeline, RealNotificationCenter, RecentlyViewedPanel, SupplierBonificationsPanel, SupplierChat, chat/ChatArea, delivery-calendar/deliveryCalendarHelpers, price-history/priceHistoryHelpers
- `src/components/pagamentos/`: PagamentoAdvancedFilters, PagamentoAdvancedKPIs, PagamentoDetailModal, PagamentoExportPanel, PagamentoFinancialDashboard, PagamentoMobileCard, PagamentoNotificationsWidget, PagamentoScheduleModal, ThreeWayMatchPanel
- `src/components/pedidos/PedidoMobileCard`
- `src/components/security/`: ActiveSessionsPanel, BlockedCountriesPanel, BlockedIPsPanel, GeoAccessLogsPanel, GeoWhitelistPanel, IPWhitelistPanel, LoginAttemptsPanel, PasskeyManager, PasswordResetRequestsPanel, RateLimitDashboard, SecurityLogsPanel
- `src/pages/`: AdminTelemetria, Auditoria, Contratos, Devolucoes, DocumentosFiscais, HistoricoCompras, and any other pages flagged in the truncated build output
- `src/pages/admin-telemetria/telemetriaHelpers.ts` (already imports `format` from `date-fns`)
- Plus any helper files surfaced by a final repo-wide grep for `from "date-fns"` / `from 'date-fns'`

### Approach
1. Run a grep across `src/` for every `from "date-fns"` / `from 'date-fns'` import and build the complete file list (catches anything truncated from the build log).
2. For each file, replace the barrel import with one subpath import per function. Replace `date-fns/locale` with `date-fns/locale/pt-BR` (or matching locale).
3. Leave `date-fns` version in `package.json` as-is — subpath imports work on both v3 and v4.
4. No logic changes, no UI changes, no other refactors.

### Verification
- Confirm no remaining `from "date-fns"` (barrel) or `from "date-fns/locale"` (barrel) imports in `src/`.
- Build should pass; all TS2305 errors resolved.
