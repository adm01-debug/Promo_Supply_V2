# 07. Hooks & Stores

## Hooks customizados (`src/hooks/*` + `src/features/*/hooks/*`)

### Autenticação, sessão, permissões
| Hook | Arquivo | Propósito |
|---|---|---|
| `useAuth` | `features/auth/hooks/useAuthContext.ts:4` | Consome `AuthContext` (user, session, role, orgId, tenantId, `setSelectedEmpresa`, `hasRole`, `isAdmin`). Lança erro fora do provider. |
| `useEmpresaFilter` | `features/empresas/hooks/useEmpresaFilter.ts:27` | Deriva `{empresaIds, selectedEmpresa, isConsolidatedView, queryKeyPart}`. |
| `usePermissions` | `hooks/usePermissions.ts:22` | Permissões por módulo/ação a partir do role. |
| `useMFA` | `hooks/useMFA.ts:18` | Config e verificação de MFA. |
| `useWebAuthn` | `hooks/useWebAuthn.ts:36` | Registro/login via passkey. |
| `useAccountLockout` | `hooks/useAccountLockout.ts:19` | Bloqueio após tentativas falhas. |
| `useSessionIdleTimeout` | `hooks/useSessionIdleTimeout.ts:17` | Logout automático por inatividade. |
| `useGeoRestriction` | `hooks/useGeoRestriction.ts:46` | Config de restrição geográfica. |
| `useSecurityLogs` | `hooks/useSecurityLogs.ts` | Log de tentativas / IPs / eventos. |

### Domínio de compras
| Hook | Arquivo | Propósito |
|---|---|---|
| `useSolicitacoes`, `useSolicitacoesKPIs` | `features/solicitacoes/hooks/useSolicitacoes.ts:94,329` | CRUD + KPI de solicitações; valida Zod, checa orçamento, cria workflow. |
| `useCotacoes` | `features/cotacoes/hooks/useCotacoes.ts:63` | CRUD de cotações; `selectCotacao` marca vencedora. |
| `usePedidos`, `usePedidosKPIs` | `features/pedidos/hooks/usePedidos.ts:111,306` | CRUD paginado; máquina de estados; bulk ops. |
| `usePagamentos`, `usePagamentosKPIs` | `hooks/usePagamentos.ts:87,271` | CRUD de pagamentos. |
| `useFornecedores`, `useFornecedoresKPIs` | `hooks/useFornecedores.ts:38,236` | CRUD de fornecedores. |
| `useProdutos` | `hooks/useProdutos.ts:31` | CRUD de produtos. |
| `useProdutoFornecedores` | `hooks/useProdutoFornecedores.ts:21` | Fornecedores de um produto. |
| `useEstoque` | `hooks/useEstoque.ts:34` | Saldo + movimentações. |
| `useDevolucoes` | `hooks/useDevolucoes.ts:53` | Devoluções e créditos. |
| `useContactNotes` | `hooks/useContactNotes.ts:23` | Notas de contato de fornecedor. |
| `usePurchaseHistory` | `hooks/usePurchaseHistory.ts:77` | Histórico agregado por produto/fornecedor. |
| `useLicitacoes`, `useLicitacaoPropostas` | `hooks/useLicitacoes.ts:17,99` | Módulo de licitação. |
| `useSupplierQualification` | `hooks/useSupplierQualification.ts:6` | Fluxo de qualificação. |
| `useSpotIntegration` | `hooks/useSpotIntegration.ts:63` | Catálogo/pedidos SPOT via edge `spot-proxy`. |
| `useGuidedBuying` | `hooks/useGuidedBuying.ts:10` | Chat de compra guiada (edge `guided-buying-ai`). |

### Aprovação, orçamento, budget
| Hook | Arquivo | Propósito |
|---|---|---|
| `useApprovalWorkflow` | `hooks/useApprovalWorkflow.ts:17` | `createWorkflow`, valida SoD via edge. |
| `useApprovalNotifications` | `hooks/useApprovalNotifications.ts:50` | Notificações realtime de aprovações. |
| `useBudgetManagement` | `hooks/useBudgetManagement.ts:19` | Gestão de orçamento por centro de custo. |

### Dashboards / KPIs
`useDashboardFilters` (`useDashboardFilters.ts:24`) · `useDashboardKPIs` (`:53`) · `useExecutiveDashboardData` (`:27`) · `useBuyerPerformanceData` (`:40`).

### Notificações e realtime
`useApprovalNotifications`, `useRealPushNotifications` (`:50`), `useRealtimeSubscription` (`:47`, assina Supabase Realtime e invalida queryKeys), `useOfflineSync` (`:28`).

### UX / navegação
`useNProgress` (`:16`), `useScrollRestoration` (`:11`), `useNavigation` (`:45`, contexto de nav), `useKeyboardShortcuts` (`:20`), `useFlashHighlight` (`:7`), `useRecentlyViewed` (`:37`), `useTourPreferences` (`:14`), `usePrefetch` (`:17`, prefetch de dados por rota).

### Formulários
`useFormDirty` (`:6`), `useUnsavedChangesWarning` (`:9`), `useFormDataProtection` (`:8`).

### Mobile / gestos
`useIsMobile` (`use-mobile.tsx:5`), `useSwipeGesture` / `usePullToRefresh` / `useLongPress` / `useHapticFeedback` (`useMobileGestures.ts:17,98,162,209`).

### Filtros / busca
`useAccountFilters` (`:34`), `useFuseSearch` / `useMultiCollectionSearch` (`useFuseSearch.ts:83,225`), `useClearFiltersFlow` (`useClearFiltersFlow.tsx:39`), `useBulkOperations` (`:10`).

### Undo / feedback
`useGlobalUndo`, `useUndoableAction` (`useGlobalUndo.ts:6,94`) — integra `undoStore` e expõe registro de ações desfazíveis. `useFeedback` (`useFeedback.ts:18`) — zustand de preferências de som/haptics.

### Performance
`usePerformanceMonitor` (`:8`), `useRenderProfiler` (`:8`, dev-only).

### Uploads
`useImageCompression`, `useAutoImageCompression` (`useImageCompression.ts:28,186`).

### Admin
`usePasswordResetRequests` (`:22`).

## Stores (Zustand — `src/stores/*`)

| Store | Persistido? | Estado / Ações |
|---|---|---|
| `undoStore` | não | `actions[]` (máx 10), `redoStack[]`; `addAction/undo/redo/canUndo/canRedo/getLastAction/clearHistory`. Consumido por `useGlobalUndo` e `UndoToastContainer`. |
| `dashboardLayoutStore` | localStorage | `widgets[]` (id/type/title/visible/order/size); `setWidgets/toggleWidgetVisibility/reorderWidgets/resizeWidget/resetLayout`; `loadFromDb(dashboardId)` / `saveToDb(dashboardId)` persistem em `dashboard_layouts`. `defaultWidgets` define ~19 widgets. |
| `kpiTargetsStore` | localStorage | `targets: KPITarget[]`, `alerts: KPIAlert[]`; `updateTarget/addAlert/markAlertAsRead/clearAlerts/getUnreadCount`. Metas globais padrão (ROI, Maverick Spend, Contract Compliance). |
| `slaSettingsStore` | localStorage | `settings: SLASettings` (thresholds warning/critical, canais, config por fornecedor); valida `warning >= critical`, clamp 0-100. |
| `buyerAlertsStore` | localStorage | `targets[]`, `alerts[]` por comprador; `updateTarget/addAlert/mark*`. |

## Contratos comuns dos hooks CRUD
```ts
useX(filters?) → {
  data, isLoading, error,
  createX(payload),          // valida → insert → invalidate → toast
  updateX({ id, ...patch }),
  deleteX(id),
  bulkUpdate?/bulkDelete?,
}
```
- `queryKey` sempre inclui `userId + organizationId + tenantId + filtros` (isolamento).
- Mutations gravam audit log via `@/services/auditService`.
- Realtime via `useRealtimeSubscription({tables, queryKeysToInvalidate})`.

## Quando NÃO usar
- Não use `useEffect` para estado derivado — calcule inline ou com `useMemo`.
- Não crie hook novo se `useAccountFilters` genérico já resolver.
- Não coloque roles em `profiles` — use `user_roles` + `has_role` (RLS).
