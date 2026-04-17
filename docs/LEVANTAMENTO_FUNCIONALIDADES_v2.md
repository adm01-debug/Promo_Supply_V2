# Levantamento Exaustivo de Funcionalidades — Promo Supply v2

> Documento definitivo. Inventário 100% do código presente em Lovable e GitHub (sync bidirecional).
> Data de geração: 2026-04-17. Versão: 2.0 (substitui o `LEVANTAMENTO_FUNCIONALIDADES_COMPLETO.md` como referência canônica).
>
> Métricas verificadas: **34 páginas raiz** + **17 subdiretórios de páginas**, **48 hooks customizados**, **86 componentes em `compras/`** + componentes em 10 outros domínios, **15 Edge Functions**, **5 stores Zustand**, **67 tabelas Postgres**, **66 migrations**, **37 suites de teste / 961 testes passando**.

---

## 1. Visão Geral e Arquitetura

**Stack:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS v3 + shadcn/ui · React Router v6 (lazy routes) · TanStack Query · Zustand · Framer Motion · Recharts · Fuse.js · React Hook Form + Zod · date-fns · Workbox/PWA.

**Backend (Lovable Cloud):** Postgres (67 tabelas), Auth, Storage (buckets `documentos` e `comprovantes`), Realtime, Edge Functions Deno (15), Lovable AI Gateway (Gemini + GPT-5).

**Camadas:**
1. **Apresentação** — Pages lazy-loaded + ProtectedRoute + ModuleErrorBoundary por módulo.
2. **Estado** — TanStack Query (server-state), Zustand (UI/preferências), Context (Auth).
3. **Domínio** — Hooks por entidade (CRUD + realtime).
4. **Persistência** — Supabase JS Client (singleton em `src/integrations/supabase/client.ts`).
5. **Automação** — Triggers SQL + Edge Functions agendadas (cron) + n8n externo.

---

## 2. Perfis de Usuário & Matriz RBAC

Enum `app_role`: **admin · coordinator · buyer · finance · viewer**.

Roles armazenados em `user_roles` (segregado de `profiles`). Função `has_role(uuid, app_role)` SECURITY DEFINER previne recursão em RLS. Função `has_permission(uuid, module, action)` cruza `role_permissions` + `permissions`.

| Rota | admin | coordinator | buyer | finance | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| `/`, `/compras`, `/cotacao`, `/solicitacoes`, `/pedidos`, `/fornecedores`, `/acompanhamento`, `/gerar-ordem`, `/relatorios`, `/historico-compras`, `/contratos`, `/seguranca`, `/kanban`, `/devolucoes`, `/catalogo-produtos`, `/recebimento`, `/portal-fornecedor`, `/supplier-performance` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/pagamentos`, `/orcamentos` | ✓ | ✓ |  | ✓ |  |
| `/aprovacoes`, `/dashboard-executivo`, `/buyer-performance`, `/compliance`, `/qualificacao-fornecedores`, `/licitacoes` | ✓ | ✓ |  |  |  |
| `/catalogo-spot`, `/negociacao-ia`, `/recompra-inteligente` | ✓ | ✓ | ✓ |  |  |
| `/documentos-fiscais` | ✓ | ✓ | ✓ | ✓ |  |
| `/auditoria`, `/admin/telemetria` | ✓ |  |  |  |  |

`PermissionGate` permite gating granular por (module, action) com bypass automático para admin.

---

## 3. Módulos Funcionais

### 3.1 Dashboard de Compras & Analytics Executivo
**Páginas:** `ComprasDashboard.tsx`, `DashboardExecutivo.tsx`, `BuyerPerformanceDashboard.tsx`, `SupplierPerformance.tsx`.
**Componentes-chave:** `ExecutiveDashboard`, `DraggableDashboard` (drag-drop com `dashboardLayoutStore`), `KpiCard`/`EnhancedKpiCard`, `PipelineChart`, `RiskHeatMap`, `SLADistributionChart`, `SLABySupplierAnalysis`, `SavingsGoalPanel`, `PurchaseClimateWidget`, `CriticalAlertsBar`, `AdvancedProcurementKPIs`, `ExecutiveDrillDownModal`, `ExecutiveChartsRow`, `ExecutiveTablesRow`, `ExecutiveFiltersBar`, `BuyerPerformancePanel`, `BuyerDrilldownModal`, `BuyerComparisonView`.
**Hooks:** `useDashboardKPIs`, `useDashboardFilters`, `useExecutiveDashboardData`, `useBuyerPerformanceData`, `usePersistentFilters`.
**Recursos:** KPIs em tempo real, sparklines, comparação YoY/MoM, filtros persistentes (período/categoria/fornecedor), favoritos (`dashboard_filter_favorites`), metas configuráveis (`kpiTargetsStore`), heatmap de risco, drilldown por comprador, alertas críticos no topo, dashboard rearranjável com persistência.

### 3.2 Solicitações (Wizard multi-etapas)
**Página:** `Solicitacoes.tsx` + `solicitacoesHelpers.ts`.
**Componentes:** `NovaSolicitacaoModal`, `SolicitacaoFormSteps`, `SolicitacaoReviewStep`, `SolicitacaoCard`, `SolicitacaoKanban`.
**Hook:** `useSolicitacoes` (CRUD + realtime).
**Tabelas:** `solicitacoes` (status: pendente, em_cotacao, aprovada, em_andamento, concluida, rejeitada, cancelada).
**Automações SQL:**
- `auto_approve_low_value_solicitacao` (auto-aprova < R$ 1000 + notifica solicitante).
- `validate_solicitacao_status_transition` (state machine).
- `trg_solicitacao_approved_transition` (aprovada → cotacao).
- `trg_pedido_entregue_transition` (atualiza solicitação para concluída + cria pagamento).
- `auto_transition_solicitacao_on_cotacao_approval` / `auto_transition_solicitacao_on_pedido_delivery`.
- Validação de orçamento via `check_budget_availability(centro_custo, valor)`.

### 3.3 Cotações & Comparador
**Página:** `Cotacao.tsx` (suporta `/cotacao/:id`).
**Componentes:** `ComparadorCotacoes`, `VisualComparadorCotacoes` (`ComparadorCharts`), `RankingCotacoes`, `PriceComparator`, `CotacaoManualModal`, `BuscaAutomatica`.
**Hook:** `useCotacoes`.
**Tabela:** `cotacoes` (scores: preço, prazo, qualidade, total — calculados automaticamente).
**Automações:** `validate_cotacao_status_transition`, `trg_cotacao_approved_transition` (selecionada=true → solicitação para em_andamento). Edge `check-cotacao-followup` para lembretes.

### 3.4 Pedidos & Workflow Kanban
**Páginas:** `Pedidos.tsx`, `KanbanWorkflow.tsx`, `GerarOrdem.tsx` (+ `gerarOrdemHelpers`), `Acompanhamento.tsx`.
**Componentes:** `PedidoTimeline`/`EnhancedPedidoTimeline`, `StatusTimeline`, `KanbanBoard`, `OrderPreviewModal`, `PedidoDetailsDialog`, `PedidoMobileCard`, `PedidosKPIs`, `DeliveryCalendar`.
**Hook:** `usePedidos`.
**Tabelas:** `pedidos`, `pedido_itens`, `order_contracts`.
**Automações:** `validate_pedido_status_transition`, `auto_create_pagamento_on_delivery`, `auto_calculate_delivery_penalty` (multas contratuais), `auto_update_supplier_score_on_delivery` (score 1-5 baseado em on-time rate), `trigger_update_saldo_on_pedido` (saldo comprometido do fornecedor).

### 3.5 Recebimento (offline-capable)
**Página:** `RecebimentoOffline.tsx` + `ReceivingFormView.tsx` + `recebimentoHelpers`.
**Componentes:** `ReceivingModal`, `QualityChecklistModal`, `MobileRefreshWrapper`.
**Hooks:** `useOfflineSync`, `useImageCompression`.
**Tabela:** `receiving_checklists` (scores: packaging, conformity, quantity, documentation → `overall_score` via trigger `calc_checklist_overall_score`).
**Recursos:** captura de fotos com compressão, persistência em IndexedDB enquanto offline, sync automático ao reconectar (`OfflineIndicator`).

### 3.6 Contas a Pagar & Three-Way Match
**Página:** `Pagamentos.tsx`.
**Componentes:** `PagamentoFinancialDashboard` (Fluxo de Caixa Projetado, Aging Report, Concentração, Calendário), `PagamentoAdvancedKPIs` (DPO, projeções 30/60/90), `ThreeWayMatchPanel`, `PagamentoModal`, `PagamentoScheduleModal`, `PagamentoDetailModal`, `PagamentoAdvancedFilters`, `PagamentoExportPanel`, `PagamentoNotificationsWidget`, `PagamentoMobileCard`.
**Hook:** `usePagamentos`.
**Tabelas:** `pagamentos`, `payment_history` (trilha de pagamentos parciais), `creditos_fornecedor`, `notification_preferences`.
**Automações:** `validate_pagamento_status_transition` (state machine pendente↔aprovado↔agendado↔pago↔parcial↔atrasado↔cancelado), `trigger_update_saldo_on_pagamento`. Storage `comprovantes` para upload de PDFs.

### 3.7 Contratos Executáveis & SLA
**Página:** `Contratos.tsx`.
**Componentes:** `ContractModal`, `ContractDetailsModal`, `ContractDetailsTabs`, `ContractItemsEditor`, `ContractSLASection`, `DigitalSignature`, `PenaltyEscalationConfigPanel`, `SLASettingsPanel`, `SupplierThresholdConfig`.
**Tabelas:** `contracts`, `contract_items`, `contract_documents`, `contract_history`, `contract_penalties`, `penalty_escalation_config`, `order_contracts`.
**Recursos:** SLA de entrega configurável, multas automáticas (`penalty_rate_per_day`, `penalty_cap_percent`), bloqueio automático de fornecedor por baixa pontuação (`auto_block_low_score_supplier`), escalação de penalidades (`apply_penalty_escalation`), assinatura digital, geração de PDF via Edge `generate-contract-pdf`, edge `check-expiry-alerts` para vencimentos.

### 3.8 Fornecedores 360° + Portal
**Páginas:** `Fornecedores.tsx`, `PortalFornecedor.tsx`.
**Componentes:** `FornecedorModal`, `FornecedorMobileCard`, `SupplierScorecard`, `SupplierRankingPanel`, `SupplierRiskAnalysis`, `SupplierAlertsPanel`, `SupplierBonificationsPanel`, `SupplierChat`/`ChatArea`, `HistoricoComprasModal`, `PriceHistoryModal`.
**Hooks:** `useFornecedores`, `useContactNotes`, `usePurchaseHistory`.
**Tabelas:** `fornecedores` (saldo_comprometido recalculado), `contact_notes`, `supplier_bonifications`, `supplier_compliance_summary` (view).

### 3.9 Qualificação & Compliance
**Páginas:** `QualificacaoFornecedores.tsx`, `ComplianceDashboard.tsx`.
**Componentes:** `QualificationHistoryTimeline`.
**Hook:** `useSupplierQualification`.
**Tabelas:** `supplier_documents`, `qualification_requirements`, `qualification_history`, `supplier_qualification_scores`.
**Automação:** `calculate_supplier_qualification_score` (document 50% + compliance 30% + expiry 20% → status: qualified / partially_qualified / pending / disqualified) com `trigger_recalculate_qualification_score`. Edge `check-expiry-alerts` notifica vencimentos.

### 3.10 Devoluções (RMA) & Créditos
**Página:** `Devolucoes.tsx` + `DevolucoesModals` + `devolucoesData`.
**Hooks:** `useDevolucoes`.
**Tabelas:** `devolucoes`, `devolucao_itens`, `creditos_fornecedor` (gerados ao fechar devolução, aplicáveis em `pagamentos.utilizado_em_pagamento_id`).

### 3.11 Catálogo de Produtos & Spot
**Páginas:** `CatalogoProdutos.tsx`, `CatalogoSpot.tsx` + `SpotFinancialTab` + `spotHelpers`.
**Hooks:** `useProdutos`, `useSpotIntegration`.
**Tabelas:** `produtos`, `spot_pedidos`, `spot_sessions`.
**Edge:** `spot-proxy` (autenticação via `SPOT_USERNAME`/`SPOT_PASSWORD`, sessão persistida).

### 3.12 Licitações
**Página:** `Licitacoes.tsx` + `LicitacaoDetailDialog`.
**Hook:** `useLicitacoes`.
**Tabelas:** `licitacoes`, `licitacao_propostas`.

### 3.13 Recompra Inteligente
**Página:** `RecompraInteligente.tsx`.
**Tabela:** `repurchase_suggestions` (alimentada por edge `ai-demand-prediction`).

### 3.14 Documentos Fiscais (XML NF-e)
**Página:** `DocumentosFiscais.tsx`.
**Tabela:** `fiscal_documents` (chave_acesso, valores fiscais, reconciliation_status). Reconciliação testada em `fiscalReconciliation.test.ts`.

### 3.15 Orçamentos Departamentais
**Página:** `Orcamentos.tsx`.
**Hook:** `useBudgetManagement`.
**Tabela:** `department_budgets` (anual/mensal por centro de custo).
**Função:** `check_budget_availability` retorna disponibilidade para validar solicitações.

### 3.16 Histórico, Relatórios & Auditoria
**Páginas:** `HistoricoCompras.tsx` (`HistoricoFornecedoresTab`, `HistoricoProdutosTab`, `HistoricoRegistrosTab`, `HistoricoDrilldownModal`), `Relatorios.tsx` + `RelatoriosCharts`, `RelatorioNegociacoes.tsx`, `Auditoria.tsx`.
**Hooks:** `usePurchaseHistory`.
**Tabela:** `audit_logs` (com `sanitize_audit_metadata` removendo session_token, mfa_code, password, etc.). Service `auditService.ts` centraliza inserções.
**Exportação:** `lib/exportData.ts` (CSV/JSON/Excel).

---

## 4. Inteligência Artificial (Lovable AI Gateway)

| Edge Function | Modelo | Função |
|---|---|---|
| `ai-supplier-suggestion` | Gemini 2.5 Flash | Sugere fornecedores com base em histórico, score e categoria |
| `ai-demand-prediction` | Gemini 2.5 Pro | Prevê demanda e popula `repurchase_suggestions` |
| `ai-supplier-risk` | GPT-5 Mini | Analisa risco financeiro/operacional/compliance |
| `ai-negotiation` | GPT-5 | Sugere táticas de negociação, persiste em `negotiation_analyses` |
| `weekly-report` | Gemini 2.5 Pro | Resumo executivo semanal (envio via Resend) |

Componentes UI: `AISupplierSuggestion`, `DemandPredictionPanel`, `SupplierRiskAnalysis`, `NegociacaoIA` page.

---

## 5. Segurança

**Autenticação:** Email/senha + WebAuthn/Passkeys (`useWebAuthn`, edges `webauthn-register`/`webauthn-authenticate`, tabelas `webauthn_credentials`/`webauthn_challenges` com `cleanup_expired_challenges`).

**MFA:** TOTP via `useMFA` + `mfa_settings` + `MFASettings` UI.

**Account lockout:** `account_lockouts` + `record_failed_login` (5 falhas/15min, backoff exponencial 1→30min) + `is_account_locked` + `clear_login_lockout` + `useAccountLockout`.

**IP & Geo:** `blocked_ips` (auto-block após 5 falhas via `log_login_attempt` + `is_ip_blocked` + `is_ip_whitelisted`), `ip_whitelist`, `blocked_countries`, `allowed_countries`, `geo_settings`, `geo_access_logs`. Hook `useGeoRestriction`. Painéis `BlockedIPsPanel`, `IPWhitelistPanel`, `BlockedCountriesPanel`, `GeoWhitelistPanel`, `GeoAccessLogsPanel`.

**Rate Limit:** `rate_limit_logs` + `RateLimitDashboard`.

**Sessões:** `active_sessions` (com `sanitize_session_token` redactando tokens) + `ActiveSessionsPanel` + `useSessionIdleTimeout`.

**Permissões granulares:** `permissions` + `role_permissions` + `has_permission` + `usePermissions` + `PermissionMatrix` + `PermissionGate`/`withPermission` HOC.

**Logs:** `security_logs` + `log_security_event` + `SecurityLogsPanel` + `useSecurityLogs`. `login_attempts` + `LoginAttemptsPanel` + `get_failed_login_count`.

**Reset de senha:** `password_reset_requests`/`password_reset_tokens` + `usePasswordResetRequests` + `PasswordResetRequestsPanel` + `PasswordStrengthIndicator`.

**RLS:** Todas as tabelas com RLS ativo. `has_role` SECURITY DEFINER previne recursão.

**Página central:** `Seguranca.tsx`. Auditoria em `Auditoria.tsx` com sanitização automática de campos sensíveis.

---

## 6. Integrações Externas

| Integração | Mecanismo | Detalhes |
|---|---|---|
| Spot (B2B externo) | Edge `spot-proxy` | Login persistente em `spot_sessions`, pedidos em `spot_pedidos` |
| n8n | Webhooks | Documentado em `docs/GUIA_AUTOMACOES_N8N.md` |
| External DB | Edge `external-db-bridge` | Bridge para banco externo legado |
| Push notifications | Edge `send-push-notification` + VAPID | `push_subscriptions` + `useRealPushNotifications` |
| Email transacional | Resend API | Usado em `weekly-report` e alertas |
| Lovable AI Gateway | `LOVABLE_API_KEY` | Gemini + GPT-5 (sem chave externa) |

**Cron jobs (edges agendadas):** `check-sla-alerts`, `check-approval-escalations`, `check-cotacao-followup`, `check-expiry-alerts`, `weekly-report`.

---

## 7. UX Avançado

| Recurso | Componente/Hook |
|---|---|
| Onboarding tour | `OnboardingTour`, `tourStepDefinitions`, `TourVisualComponents`, `useTourPreferences`, `user_tour_preferences` |
| Command Palette (Ctrl+K) | `CommandPalette` |
| Atalhos de teclado | `useKeyboardShortcuts`, `KeyboardShortcutsDialog` |
| FAB de ações rápidas | `QuickActionsFAB` |
| Vistos recentemente | `RecentlyViewedPanel`, `useRecentlyViewed` |
| Undo global (toast) | `useGlobalUndo`, `undoStore`, `UndoToast`, `UndoIndicator` |
| Celebrations | `celebration.tsx`, `celebration-particles.tsx` |
| Empty states ilustrados | `illustrated-empty-state`, `empty-state-illustrations` |
| Skeletons contextuais | `contextual-skeletons`, `DomainSkeletons`, `LayoutSkeletons` |
| Busca avançada | `enhanced-search`, `AdvancedSearch`, `useFuseSearch` (Fuse.js) |
| Bulk operations | `EnhancedBulkActionsBar`, `BulkOperationsPreview`, `useBulkOperations` |
| Filter favorites | `FilterFavoritesManager`, `usePersistentFilters` |
| Drag-drop dashboard | `DraggableDashboard`, `dashboardLayoutStore` |
| Theme toggle | `ThemeToggle` |
| Breadcrumbs + back inteligente | `Breadcrumbs`, `SmartBackButton` |
| Guard de mudanças não salvas | `UnsavedChangesGuard` |
| Progress bar de navegação | `NavigationProgressBar` |
| Prefetch | `PrefetchLink`, `usePrefetch` |
| Scroll restoration | `useScrollRestoration` |
| Animações | `MotionComponents`, `motionVariants` (Framer Motion) |
| Feedback toasts | `useFeedback`, `feedbackToast`, `FeedbackSettingsPanel` |
| Notificações | `RealNotificationCenter`, `NotificationSettingsPanel`, `useApprovalNotifications` |

---

## 8. Mobile & PWA

- **Bottom Navigation** (`BottomNavigation.tsx`) — visível em <md.
- **Swipe gestures** (`SwipeableListItem`, `useMobileGestures`).
- **Pull-to-refresh** (`MobileRefreshWrapper`).
- **Offline sync** (`useOfflineSync`, `OfflineIndicator`) — IndexedDB para recebimento.
- **PWA install prompt** (`PWAInstallPrompt`, manifest + service worker).
- **Mobile cards** dedicados: `PedidoMobileCard`, `PagamentoMobileCard`, `FornecedorMobileCard`.
- **Image compression** (`useImageCompression`, `lib/imageCompression.ts`) para uploads em conexões fracas.
- **Hook** `use-mobile` para breakpoint detection.

---

## 9. Acessibilidade

- `SkipLinks` para navegação por teclado.
- `VisuallyHidden` para screen readers.
- `AdvancedAccessibility` (controles de fonte, contraste, motion).
- `AccessibilityStyles` global.
- `accessibilityHelpers` (focus trap, ARIA helpers).
- ARIA labels em todos os componentes shadcn customizados.

---

## 10. Telemetria & Observabilidade

- **Página:** `AdminTelemetria.tsx` + `telemetriaHelpers` + `TelemetryCharts`.
- **Tabela:** `query_telemetry` (latência, throughput, erros).
- **Hook:** `useRealtimeSubscription` para subscriptions Postgres.
- **Testes dedicados:** `queryTelemetry.test.ts`.

---

## 11. Camada de Dados (67 tabelas)

**Suprimentos:** solicitacoes, cotacoes, pedidos, pedido_itens, produtos, categorias, fornecedores.
**Financeiro:** pagamentos, payment_history, creditos_fornecedor, department_budgets.
**Contratos:** contracts, contract_items, contract_documents, contract_history, contract_penalties, penalty_escalation_config, order_contracts.
**Compliance:** supplier_documents, qualification_requirements, qualification_history, supplier_qualification_scores, supplier_compliance_summary (view), supplier_bonifications.
**Aprovações:** approval_rules, approval_workflows, approval_steps, approval_delegations, approval_history.
**Fiscal/RMA:** fiscal_documents, devolucoes, devolucao_itens, receiving_checklists.
**IA/Spot:** repurchase_suggestions, negotiation_analyses, spot_pedidos, spot_sessions.
**Licitações:** licitacoes, licitacao_propostas.
**Auth/Profile:** profiles, user_roles, user_tour_preferences, contact_notes.
**Segurança:** account_lockouts, active_sessions, login_attempts, security_logs, blocked_ips, ip_whitelist, blocked_countries, allowed_countries, geo_settings, geo_access_logs, rate_limit_logs, mfa_settings, webauthn_credentials, webauthn_challenges, password_reset_requests, password_reset_tokens, permissions, role_permissions.
**UX/Notif:** notifications, notification_preferences, push_subscriptions, dashboard_filter_favorites.
**Auditoria/Telemetria:** audit_logs, query_telemetry.

**Funções SQL chave:** `has_role`, `has_permission`, `get_user_role`, `find_approval_rule`, `get_effective_approver`, `check_escalation`, `calculate_supplier_qualification_score`, `recalculate_saldo_comprometido`, `check_budget_availability`, `generate_sequential_number`, `log_security_event`, `log_login_attempt`, `is_account_locked`, `record_failed_login`, `clear_login_lockout`, `is_ip_blocked`, `is_ip_whitelisted`, `cleanup_expired_challenges`, `handle_new_user` (cria profile + role buyer no signup).

**Triggers de validação (state machines):** `validate_solicitacao_status_transition`, `validate_cotacao_status_transition`, `validate_pedido_status_transition`, `validate_pagamento_status_transition`.

**Triggers de automação:** `auto_approve_low_value_solicitacao`, `auto_create_pagamento_on_delivery`, `auto_calculate_delivery_penalty`, `auto_update_supplier_score_on_delivery`, `auto_block_low_score_supplier`, `apply_penalty_escalation`, `trg_solicitacao_approved_transition`, `trg_cotacao_approved_transition`, `trg_pedido_entregue_transition`, `trigger_update_saldo_on_pedido`, `trigger_update_saldo_on_pagamento`, `trigger_recalculate_qualification_score`, `calc_checklist_overall_score`, `update_updated_at_column`, `update_approval_updated_at`, `sanitize_audit_metadata`, `sanitize_session_token`.

**Storage:** `documentos` (privado, contratos/qualificação), `comprovantes` (privado, pagamentos).

**Realtime:** Habilitado em tabelas-chave para sincronização entre usuários.

---

## 12. Edge Functions (15)

| Função | verify_jwt | Propósito |
|---|:-:|---|
| `ai-supplier-suggestion` | false | Sugestão de fornecedor por IA |
| `ai-demand-prediction` | false | Predição de demanda |
| `ai-supplier-risk` | false | Análise de risco |
| `ai-negotiation` | false | Coach de negociação |
| `webauthn-register` | false | Registro de passkey |
| `webauthn-authenticate` | false | Login passkey |
| `send-push-notification` | false | Push via VAPID |
| `check-sla-alerts` | false | Cron — alertas de SLA |
| `check-approval-escalations` | false | Cron — escalonamento |
| `check-cotacao-followup` | false | Cron — follow-up cotações |
| `check-expiry-alerts` | false | Cron — vencimentos (contratos/docs) |
| `spot-proxy` | false | Proxy autenticado para Spot |
| `external-db-bridge` | false | Bridge para banco externo |
| `generate-contract-pdf` | false | Geração PDF de contrato |
| `weekly-report` | false | Relatório semanal por email |

---

## 13. Hooks Customizados (48)

**Dados/CRUD:** `useSolicitacoes`, `useCotacoes`, `usePedidos`, `usePagamentos`, `useFornecedores`, `useProdutos`, `useDevolucoes`, `useLicitacoes`, `useContactNotes`, `usePurchaseHistory`, `useBudgetManagement`, `useSupplierQualification`, `useSpotIntegration`.
**Dashboards:** `useDashboardKPIs`, `useDashboardFilters`, `useExecutiveDashboardData`, `useBuyerPerformanceData`, `usePersistentFilters`.
**Aprovações:** `useApprovalWorkflow`, `useApprovalNotifications`.
**Auth/Segurança:** `useAuth`, `usePermissions`, `useMFA`, `useWebAuthn`, `useAccountLockout`, `useGeoRestriction`, `useSessionIdleTimeout`, `useSecurityLogs`, `usePasswordResetRequests`.
**UX:** `useFeedback`, `useGlobalUndo`, `useRecentlyViewed`, `useTourPreferences`, `useKeyboardShortcuts`, `useFuseSearch`, `useScrollRestoration`, `usePrefetch`, `useAnimatedValue`, `useBulkOperations`.
**Mobile/Offline:** `use-mobile`, `useMobileGestures`, `useOfflineSync`, `useImageCompression`, `useRealPushNotifications`, `useFileUpload`.
**Realtime:** `useRealtimeSubscription`.
**UI:** `use-toast`.

---

## 14. Cobertura de Testes (37 suites / 961 testes)

**Business (26 suites):** accountSecurity, approvalEscalation, approvalMultiLevel, approvalWorkflow, bulkOperations, contracts, cotacoes, creditosFornecedor, dashboardFilters, dashboardKPIs, dataIntegrity, devolucoes, externalDbBridge, fileUpload, fiscalReconciliation, fornecedorValidation, notificacoesPagamento, notificationLogic, offlineSync, pagamentos, pagamentosAdvanced, pedidoLifecycle, queryTelemetry, slaCalculation, stressAndEdgeCases, supplierQualification.
**Security (3):** inputValidation, permissions, rbac.
**Stores (3):** kpiTargetsStore, slaSettingsStore, undoStore.
**Search (1):** fuseSearch.
**Services (1):** auditService.
**Types (1):** typeValidation.
**Misc (2):** example, utils.

---

## 15. Backlog Residual / Pendências Conhecidas

Consultar `docs/ANALISE_GAPS_MELHORIAS.md`. Principais itens em aberto:
- Integração ERP fiscal (SEFAZ direto) — atualmente upload manual de XML.
- Boleto/PIX automatizado em pagamentos.
- App nativo (atualmente PWA).
- BI externo (Power BI/Metabase) — atualmente dashboards internos.

---

## 16. Apêndices

### 16.1 Rotas completas (40 rotas)
`/auth`, `/`, `/compras`, `/cotacao`, `/cotacao/:id`, `/solicitacoes`, `/pedidos`, `/pagamentos`, `/fornecedores`, `/acompanhamento`, `/gerar-ordem`, `/relatorios`, `/relatorios/negociacoes`, `/aprovacoes`, `/supplier-performance`, `/dashboard-executivo`, `/buyer-performance`, `/historico-compras`, `/contratos`, `/compliance`, `/auditoria`, `/seguranca`, `/catalogo-spot`, `/qualificacao-fornecedores`, `/orcamentos`, `/negociacao-ia`, `/kanban`, `/documentos-fiscais`, `/recompra-inteligente`, `/devolucoes`, `/catalogo-produtos`, `/licitacoes`, `/recebimento`, `/admin/telemetria`, `/portal-fornecedor`, `*` (NotFound).

### 16.2 Variáveis de ambiente
`.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
**Secrets (server-side):** `LOVABLE_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SPOT_USERNAME`, `SPOT_PASSWORD`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

### 16.3 Stores Zustand (5)
`buyerAlertsStore`, `dashboardLayoutStore`, `kpiTargetsStore`, `slaSettingsStore`, `undoStore`.

### 16.4 Documentação relacionada
- `LEVANTAMENTO_FUNCIONALIDADES_COMPLETO.md` (versão anterior, mantida como histórico).
- `AUDITORIA_FUNCIONALIDADES.md` (status de implementação por feature).
- `SISTEMA_COMPRAS_DOCUMENTACAO.md` (visão de produto).
- `PROCESSO_COMPRAS_POP.md` (POPs operacionais).
- `KPIS_SLAS_METRICAS.md` (definições de métricas).
- `CHECKLISTS_OPERACIONAIS.md` (rotinas).
- `GUIA_AUTOMACOES_N8N.md` (workflows externos).
- `ANALISE_GAPS_MELHORIAS.md` (backlog).

---

**Maturidade do sistema:** ≥ 95%. **Cobertura de testes:** 961/961 verde. **Sincronização GitHub ↔ Lovable:** bidirecional automática.
