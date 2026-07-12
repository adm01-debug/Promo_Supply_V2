# 03. Frontend Map

Mapa pasta a pasta de `src/`. Referências no formato `arquivo:linha`.

## Boot

| Arquivo | Papel |
|---|---|
| `src/main.tsx:50` | `createRoot(...).render(<App/>)`. Registra Service Worker PWA (`:38`) e restaura estado de acessibilidade do `localStorage` (`:10`). |
| `src/App.tsx:53` | Monta providers em ordem: `AuthProvider > ThemeProvider > PersistGate > AccessibilityProvider > TooltipProvider > BrowserRouter > NavigationProvider > GlobalErrorBoundary > Suspense > AppContent`. |
| `src/App.tsx:36` | `PersistGate` — `PersistQueryClientProvider` com `buster: user?.id ?? 'anon'` (isola cache por usuário). |
| `src/routes/AppRoutes.tsx:11` | Todas as páginas em `lazy()`. |
| `src/routes/AppRoutes.tsx:61` | `AnimatedRoutes` — rota pública `/auth` + bloco protegido `<ProtectedRoute><Shell/></ProtectedRoute>` cobrindo ~40 rotas com `ModuleErrorBoundary` + `RouteSkeleton`. |
| `src/features/layout/components/Shell.tsx:7` | Chama `warmTopRoutes()` (prefetch de chunks) e renderiza `MainLayout > Suspense > Outlet`. |
| `src/features/layout/components/MainLayout.tsx:39` | Sidebar, header (`AdvancedSearch`, `HeaderActions`), `PageTransition`, `BottomNavigation`, FABs, chat, toasts de undo, `OfflineIndicator`. Consome `useKeyboardShortcuts`, `useGlobalUndo`, `useSessionIdleTimeout`, `useScrollRestoration`, `usePerformanceMonitor`. |
| `src/features/layout/components/PageLoader.tsx:9` | Fallback do `Suspense`. |
| `src/features/layout/components/ModuleErrorBoundary.tsx:138` | Error boundary por módulo, com mensagens específicas em `moduleMessages` (`:10`). |

## Features

### `src/features/auth/`
- `hooks/AuthContext.ts:6` — `AuthContextType`: `user, session, profile, role, organizationId, grupoId, tenantId, selectedEmpresaId, availableTenants/Empresas, signIn, signUp, signOut, setSelectedEmpresa, hasRole, isAdmin`.
- `hooks/useAuth.tsx:38` `fetchUserData` — busca em paralelo `profiles`, `user_roles`, RPC `current_tenant_id`, `user_tenants(tenant:tenants(...))`.
- `hooks/useAuth.tsx:94` `useEffect` — `getSession()` + `onAuthStateChange` (com `setTimeout` para evitar deadlock) + listener `storage` para logout cross-tab.
- `components/ProtectedRoute.tsx:12` — guard; sem `requiredRole`, sempre libera se `user` existe (controle fino vai via `usePermissions` dentro das páginas).
- `schemas/auth.schemas.ts:3` — `UserProfileSchema`, `TenantSchema`, tipo `Empresa = Tenant`.
- `types/authRoles.ts:1` — `AppRole = admin | coordinator | buyer | finance | viewer`.

### `src/features/aprovacoes/`
- Componentes de gráficos/estatísticas: `ApprovalCharts.tsx`, `ApprovalStats.tsx` (consomem dados via props).
- `types/approval.types.ts` — tipos de apresentação (HistoryItem, TrendItem, ByValueRangeItem, BottleneckItem…).

### `src/features/cotacoes/`
- `hooks/useCotacoes.ts:63` — `useCotacoes(filters?)` com `queryKey ['cotacoes', user, org, filtros]`, mutations `createCotacao/updateCotacao/selectCotacao/deleteCotacao`. Realtime via `useRealtimeSubscription`.

### `src/features/pedidos/`
- `hooks/usePedidos.ts:111` — paginado (`page/pageSize`), `VALID_PEDIDO_TRANSITIONS`, `createPedido` (insere `pedido_itens`), `updateStatus`, `bulkUpdateStatus`, `bulkDelete`.
- `hooks/usePedidos.ts:306` — `usePedidosKPIs` via RPC `get_pedidos_kpis`.

### `src/features/solicitacoes/`
- `schemas/solicitacao.schemas.ts:3` — `CreateSolicitacaoSchema` Zod completo.
- `hooks/useSolicitacoes.ts:121` — `createSolicitacao` valida Zod, chama RPC `check_budget_availability`, cria workflow via `useApprovalWorkflow`.
- `hooks/useSolicitacoes.ts:329` — `useSolicitacoesKPIs`.

### `src/features/empresas/`
- `components/EmpresaSelector.tsx`, `EmpresaBadge.tsx` — seletor no header.
- `hooks/useEmpresaFilter.ts:27` — deriva `{empresaIds, selectedEmpresa, isConsolidatedView, queryKeyPart}` de `useAuth()`. `empresaIds === null` = todas as empresas do grupo (RLS já limita).

### `src/features/layout/transitions/`
- `presets.ts:3` — 12 presets (`fade, slide-*, zoom-*, flip-*, parallax, blur-scale, none`).
- `config.ts:11` — `DEFAULT_TRANSITION = "blur-scale"`.
- `config.ts:17` — `ROUTE_OVERRIDES`: `/compras/wizard` slide-left, `/admin` fade, `/auth` zoom-in.
- `usePageTransition.ts:19` — respeita `prefers-reduced-motion`.
- `PageTransition.tsx:11` — `motion.div` com `key={pathname}`, dentro de `<AnimatePresence mode="wait">` (`MainLayout.tsx:166`).

## Pages (`src/pages/`)

Todas dentro de `<ProtectedRoute>` exceto `/auth` e `*` (NotFound). Controle fino de permissão dentro das páginas via `usePermissions`.

| Rota | Página |
|---|---|
| `/auth` (público) | `pages/auth/Auth.tsx` |
| `/` → `/compras` | redirect |
| `/compras` | `dashboard/ComprasDashboard.tsx` |
| `/dashboard-executivo` | `dashboard/DashboardExecutivo.tsx` |
| `/cotacao`, `/cotacao/:id` | `cotacao/Cotacao.tsx` |
| `/solicitacoes` | `solicitacoes/Solicitacoes.tsx` |
| `/pedidos` | `pedidos/Pedidos.tsx` |
| `/pagamentos` | `pagamentos/Pagamentos.tsx` |
| `/fornecedores` | `fornecedores/Fornecedores.tsx` |
| `/supplier-performance` | `fornecedores/SupplierPerformance.tsx` |
| `/acompanhamento` | `acompanhamento/Acompanhamento.tsx` |
| `/gerar-ordem` | `gerar-ordem/GerarOrdem.tsx` |
| `/relatorios` | `relatorios/Relatorios.tsx` |
| `/relatorios/negociacoes` | `relatorio-negociacoes/RelatorioNegociacoes.tsx` |
| `/aprovacoes` | `aprovacoes/Aprovacoes.tsx` |
| `/buyer-performance` | `buyer/BuyerPerformanceDashboard.tsx` |
| `/historico-compras` | `historico/HistoricoCompras.tsx` (+ tabs de produtos, fornecedores, sourcing, registros) |
| `/contratos` | `contratos/Contratos.tsx` |
| `/compliance` | `compliance/ComplianceDashboard.tsx` |
| `/auditoria` | `auditoria/Auditoria.tsx` |
| `/seguranca` | `seguranca/Seguranca.tsx` |
| `/catalogo-spot` | `catalogo-spot/CatalogoSpot.tsx` |
| `/qualificacao-fornecedores` | `qualificacao/QualificacaoFornecedores.tsx` |
| `/orcamentos` | `orcamentos/Orcamentos.tsx` |
| `/negociacao-ia` | `negociacao-ia/NegociacaoIA.tsx` |
| `/kanban` | `kanban/KanbanWorkflow.tsx` |
| `/documentos-fiscais` | `documentos/DocumentosFiscais.tsx` |
| `/recompra-inteligente` | `recompra/RecompraInteligente.tsx` |
| `/devolucoes` | `devolucoes/Devolucoes.tsx` |
| `/catalogo-produtos` | `catalogo-produtos/CatalogoProdutos.tsx` |
| `/estoque` | `estoque/GestaoEstoque.tsx` |
| `/sourcing` (+ `novo`, `:id`, `:id/auction`) | `sourcing/Sourcing.tsx`, `RFxCreate.tsx`, `RFxDetails.tsx`, `AuctionRoom.tsx` |
| `/licitacoes` | `licitacoes/Licitacoes.tsx` |
| `/recebimento` | `recebimento/RecebimentoOffline.tsx` |
| `/admin/telemetria` | `admin-telemetria/AdminTelemetria.tsx` |
| `/admin/dependency-health` | `admin/DependencyHealth.tsx` |
| `/admin/sso` | `admin/SSOConfig.tsx` |
| `/admin/punchout` | `admin/PunchOutCatalogs.tsx` |
| `/admin/erp` | `admin/ERPConnections.tsx` |
| `/admin/fiscal` | `admin/FiscalDashboard.tsx` |
| `/admin/sourcing-pipeline` | `admin/SourcingPipeline.tsx` |
| `/admin/workflows` | `admin/WorkflowAdmin.tsx` |
| `/admin/docs` | `admin/DeveloperDocs.tsx` |
| `/admin/storage-migration` | `admin/StorageMigration.tsx` |
| `/portal-fornecedor` | `portal-fornecedor/PortalFornecedor.tsx` |
| `/configuracoes-centro-custo` | `configuracoes/ConfiguracoesCentroCusto.tsx` |
| `*` (fallback) | `pages/NotFound.tsx` |

## Design System

- **Atoms** (`src/components/atoms/`): `Atom.tsx:8` (`motion.div` genérico), `EliteButton`, `EliteImage`, `PreloadLink`.
- **Molecules** (`src/components/molecules/`): `Molecule.tsx:11` (card com header dentro de `Atom`), `EliteFormField`.
- **Organisms** (`src/components/organisms/`): `Organism.tsx:11` (grid header/main/footer), `EliteCardGrid`, `ElitePageWrapper`.
- **UI** (`src/components/ui/*`): 55 primitivos shadcn/radix — `button`, `card`, `dialog`, `table`, `form`, `sidebar`, `chart`, `sparkline`, `celebration*`, `status-indicators`, `undo-toast`, `error-boundary`, `contextual-skeletons`.
- **Tokens** (`src/styles/tokens.css:7`): variáveis raiz — `--font-sans`, `--primary`, `--muted`, `--destructive`, `--success`, `--warning`, `--info`, `--kpi-emerald`, `--kpi-orange`, `--kpi-blue`, `--radius`.
- **Camadas CSS** (`src/index.css`): imports em `base.css`, `components.css`, `animations.css`, `utilities.css` (nessa ordem).

## Prefetch de rotas

- `src/lib/routePrefetch.ts:15` — `loaders`: mapa rota → `import()` (dedup de chunk).
- `:38` `normalize` — resolve rotas dinâmicas (`/cotacao/:id` → `/cotacao`).
- `:45` `prefetchRouteChunk` — fire-and-forget com `Set warmed`.
- `:59` `warmTopRoutes` — agenda via `requestIdleCallback` no boot do Shell.
- `src/components/PrefetchLink.tsx:17` — `mouseenter/focus` dispara `prefetchRouteChunk` + `prefetchByRoute` (dados, via `usePrefetch`).

## `src/lib/*`
- `query-client.ts:21` — `queryClient` (staleTime 30s, gcTime 5min, `keepPreviousData`); persister em `localStorage` (`:40`).
- `logger.ts:18` — `Logger` singleton, sanitiza `password/token/secret/key/auth/cvv`, envia telemetria para edge `telemetry` (`:68`).
- `feedbackToast.ts:64` — wrapper sobre `sonner` com vibração + som via `AudioContext` (respeita `useFeedbackPreferences`).
- `security.ts:9` — `sanitize(html)` via DOMPurify, `isDangerous(text)`, `auditLog`.
- `supabaseQuery.ts:10` — `escapeIlike` escapa `% _ , ( ) *` para `.ilike/.or` PostgREST.
- `exportData.ts:40` — `exportToCSV` com BOM UTF-8; colunas predefinidas por módulo.
- `pdfGenerator.ts:24` — `generateOrderPDF` via jsPDF + autotable.
- `utils.ts` — `cn`, `formatCurrency`.

## `src/stores/*` (Zustand)
Ver doc 07.
