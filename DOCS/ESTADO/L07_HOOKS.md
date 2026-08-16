# L07 — Hooks

> Auditoria por leitura de código. Nenhuma afirmação abaixo vem de README, DOCS/ ou comentário.
> **Sem acesso a runtime/banco**: todo nome de tabela/view/RPC/edge function está marcado `NAO_VERIFICADO (runtime)` — o código *referencia* o objeto; se ele existe no banco vivo, é o agente principal quem cruza.
> Escopo: `src/hooks/` = **71 arquivos** (61 na raiz + 10 em `__tests__/`). Todos lidos (lista no fim).

## Resumo

Classificação aplicada aos **61 arquivos de produção** (os 10 de `__tests__/` são testes, listados à parte).

| Classificação | Qtd | % de 61 |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 43 | 70,5% |
| 🟨 IMPLEMENTADO_PARCIAL | 13 | 21,3% |
| 🟦 SUGERIDO_OU_INICIADO | 0 | 0% |
| ⬛ MORTO_OU_ABANDONADO | 5 | 8,2% |

**Nota honesta sobre a categoria ✅**: a definição pedida exige "busca/escreve dados reais (`supabase.from`/`.rpc`/`functions.invoke`)". 18 dos 43 ✅ são hooks puramente locais (UI/teclado/áudio/localStorage/React Router) que nunca deveriam tocar banco. Eles estão marcados ✅ com a anotação explícita **`(local — sem objeto de banco)`** na coluna "Objeto de dados". Não inflei nem rebaixei: quem toca banco tem tabela/RPC nomeada; quem não toca está rotulado como local.

**Números de banco encontrados**: 25 hooks tocam Supabase diretamente. **57 objetos distintos** referenciados: 46 tabelas/views, 11 RPCs, 5 edge functions (detalhe abaixo).

**Achados de maior impacto:**
1. `useOfflineSync` — motor de sincronização offline completo (retry, backoff, DLQ, detecção de conflito) cuja **fila nunca é alimentada**: `addPendingOperation` e `withOfflineSupport` têm zero chamadores em todo o `src/`. O indicador de offline mostra `pendingCount` que nunca sai de 0.
2. `useDashboardKPIs` — chama RPC real `get_compras_dashboard_metrics`, mas **6 campos do KPI são constantes hardcoded** (`avgSla: 1.8`, `taxaSlaReal: 85`, `taxaEntrega: 100`, `atrasados: 0`, `totalFornecedores: 0`, `pendingApprovals: 0`) e o bloco `comparisons.sla` inteiro é literal fixo.
3. `useWorkflowDLQ` — grava operações de aprovação falhadas em `localStorage`, mas **nenhuma tela consome** `workflowDLQ`/`retryableEntries`: falhas de aprovação acumulam invisíveis.
4. `usePermissions` **não retorna `isAdmin`**, mas `DependencyHealthBadge.tsx:102` desestrutura `isAdmin` dele — sempre `undefined`.
5. 5 hooks completamente órfãos (nenhum import em todo o `src/`).

---

## MAPA DE OBJETOS DE BANCO (entrega crítica)

Nomes exatos como aparecem em `.from('...')` / `.rpc('...')` / `functions.invoke('...')`.
Coluna "Tipo": no código não há como distinguir tabela de view — todas marcadas `tabela/view`. **Todos `NAO_VERIFICADO (runtime)`.**

### Tabelas / views referenciadas em `.from()`

| Objeto referenciado | Tipo | Hook | Evidência (arquivo:linha) |
|---|---|---|---|
| `active_sessions` | tabela/view | useSecurityLogs | src/hooks/useSecurityLogs.ts:158, :159, :236 |
| `allowed_countries` | tabela/view | useGeoRestriction | src/hooks/useGeoRestriction.ts:70, :107, :125, :140 |
| `approval_delegations` | tabela/view | useApprovalRules | src/hooks/useApprovalRules.ts:35, :111, :115, :127 |
| `approval_history` | tabela/view | useApprovalHistory, useApprovalWorkflow | src/hooks/useApprovalHistory.ts:11, :21; src/hooks/useApprovalWorkflow.ts:165, :226, :255, :290 |
| `approval_rules` | tabela/view | useApprovalRules, useApprovalWorkflow | src/hooks/useApprovalRules.ts:18, :71, :75, :87; src/hooks/useApprovalWorkflow.ts:196 |
| `approval_rules` (embed) | relação embutida | useApprovalWorkflow | src/hooks/useApprovalWorkflow.ts:275 `select('*, approval_rules(*)')` |
| `approval_steps` | tabela/view | useApprovalWorkflow | src/hooks/useApprovalWorkflow.ts:73, :161, :188, :201, :207, :244, :248, :253, :286 |
| `approval_workflows` | tabela/view | useApprovalWorkflow, useExecutiveDashboardData | src/hooks/useApprovalWorkflow.ts:60, :114, :160, :212, :214, :220, :222, :252, :274, :283; src/hooks/useExecutiveDashboardData.ts:77 (via `fetchAllRows`) |
| `approval_workflows` (embed) | relação embutida | useApprovalWorkflow | src/hooks/useApprovalWorkflow.ts:189 `select('*, approval_workflows(*)')` |
| `blocked_ips` | tabela/view | useSecurityLogs | src/hooks/useSecurityLogs.ts:112, :174, :194 |
| `categorias` | tabela/view | useBuyerPerformanceData, useLicitacoes, useProdutos, usePurchaseHistory, useExecutiveDashboardData | src/hooks/useBuyerPerformanceData.ts:132; src/hooks/useLicitacoes.ts:239; src/hooks/useProdutos.ts:65; src/hooks/usePurchaseHistory.ts:149; src/hooks/useExecutiveDashboardData.ts:88 |
| `categorias` (embed) | relação embutida | useLicitacoes, useProdutos | src/hooks/useLicitacoes.ts:191 `category:categorias(nome)`; src/hooks/useProdutos.ts:46 `categorias(nome)` |
| `contact_notes` | tabela/view | useContactNotes | src/hooks/useContactNotes.ts:42, :77, :104, :125 |
| `contracts` | tabela/view | usePrefetch, useExecutiveDashboardData, useOfflineSync | src/hooks/usePrefetch.ts:130; src/hooks/useExecutiveDashboardData.ts:66; src/hooks/useOfflineSync.ts:139 (union de tabelas do replay) |
| `cost_centers` | tabela/view | usePurchaseHistory | src/hooks/usePurchaseHistory.ts:177 |
| `cost_centers` (embed) | relação embutida | useApprovalWorkflow, useBudgetManagement, usePagamentos | src/hooks/useApprovalWorkflow.ts:96 `cost_center:cost_centers(manager_id)`; src/hooks/useBudgetManagement.ts:31; src/hooks/usePagamentos.ts:68 |
| `cotacoes` | tabela/view | useBuyerPerformanceData, usePrefetch, useSidebarBadges, useOfflineSync | src/hooks/useBuyerPerformanceData.ts:68; src/hooks/usePrefetch.ts:110; src/hooks/useSidebarBadges.ts:24; src/hooks/useOfflineSync.ts:139 |
| `creditos_fornecedor` | tabela/view | useDevolucoes | src/hooks/useDevolucoes.ts:173, :226, :269 |
| `dashboard_filter_favorites` | tabela/view | useDashboardFilters | src/hooks/useDashboardFilters.ts:38, :60, :88, :108, :114 |
| `department_budgets` | tabela/view | useBudgetManagement | src/hooks/useBudgetManagement.ts:28, :64, :93, :113 |
| `devolucao_itens` | tabela/view | useDevolucoes | src/hooks/useDevolucoes.ts:140 |
| `devolucoes` | tabela/view | useDevolucoes | src/hooks/useDevolucoes.ts:63, :114, :168, :198, :244, :299 |
| `estoque` | tabela/view | useEstoque | src/hooks/useEstoque.ts:43, :89 |
| `estoque_movimentacoes` | tabela/view | useEstoque | src/hooks/useEstoque.ts:65 |
| `fornecedores` | tabela/view | useBuyerPerformanceData, useDevolucoes, useFornecedores, useLicitacoes, usePrefetch, usePurchaseHistory, useSupplierQualification, useExecutiveDashboardData, useOfflineSync | src/hooks/useBuyerPerformanceData.ts:117; src/hooks/useDevolucoes.ts:85, :241; src/hooks/useFornecedores.ts:49, :118, :172, :197; src/hooks/useLicitacoes.ts:259; src/hooks/usePrefetch.ts:69; src/hooks/usePurchaseHistory.ts:121; src/hooks/useSupplierQualification.ts:50; src/hooks/useExecutiveDashboardData.ts:55; src/hooks/useOfflineSync.ts:139 |
| `fornecedores` (embed) | relação embutida | useLicitacoes, usePagamentos, usePrefetch, useProdutoFornecedores, useProdutos | src/hooks/useLicitacoes.ts:27 (FK `licitacoes_fornecedor_vencedor_id_fkey`), :111, :300; src/hooks/usePagamentos.ts:66; src/hooks/usePrefetch.ts:50, :92, :112; src/hooks/useProdutoFornecedores.ts:34; src/hooks/useProdutos.ts:47 (FK `produtos_fornecedor_preferencial_id_fkey`) |
| `geo_settings` | tabela/view | useGeoRestriction | src/hooks/useGeoRestriction.ts:55, :88 |
| `ip_whitelist` | tabela/view | useSecurityLogs | src/hooks/useSecurityLogs.ts:127, :207, :225 |
| `licitacao_lances` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:299, :312 (+ canal Realtime :335) |
| `licitacao_propostas` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:110, :131, :149, :150 |
| `licitacoes` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:26, :50, :74, :87, :152 |
| `login_attempts` | tabela/view | useSecurityLogs | src/hooks/useSecurityLogs.ts:96 |
| `mfa_settings` | tabela/view | useMFA | src/hooks/useMFA.ts:30, :84, :132, :163, :187 |
| `notification_preferences` | tabela/view | useRealPushNotifications | src/hooks/useRealPushNotifications.ts:181, :195, :217 |
| `notifications` | tabela/view | useRealPushNotifications, useApprovalNotifications (Realtime) | src/hooks/useRealPushNotifications.ts:154, :246, :268, :290, :312 (+ canal :395); src/hooks/useApprovalNotifications.ts:94 (Realtime, tabela `notifications`) |
| `pagamentos` | tabela/view | usePagamentos, usePrefetch, useSidebarBadges, useOfflineSync | src/hooks/usePagamentos.ts:60, :119, :167, :211, :226, :245; src/hooks/usePrefetch.ts:90; src/hooks/useSidebarBadges.ts:25; src/hooks/useOfflineSync.ts:139 |
| `password_reset_requests` | tabela/view | usePasswordResetRequests | src/hooks/usePasswordResetRequests.ts:31, :47, :63, :79, :102, :125, :145 |
| `pedido_itens` | tabela/view | usePurchaseHistory | src/hooks/usePurchaseHistory.ts:107 |
| `pedidos` | tabela/view | useBuyerPerformanceData, useDevolucoes, usePrefetch, usePurchaseHistory, useExecutiveDashboardData, useOfflineSync | src/hooks/useBuyerPerformanceData.ts:101; src/hooks/useDevolucoes.ts:88; src/hooks/usePrefetch.ts:49; src/hooks/usePurchaseHistory.ts:90; src/hooks/useExecutiveDashboardData.ts:33; src/hooks/useOfflineSync.ts:139 |
| `pedidos` (embed) | relação embutida | usePagamentos | src/hooks/usePagamentos.ts:67 `pedido:pedidos(id, numero)` |
| `permissions` | tabela/view | usePermissions | src/hooks/usePermissions.ts:30 |
| `permissions` (embed) | relação embutida | usePermissions | src/hooks/usePermissions.ts:51, :68 `permission:permissions(*)` |
| `produto_fornecedores` | tabela/view | useProdutoFornecedores | src/hooks/useProdutoFornecedores.ts:31, :60, :82 |
| `produtos` | tabela/view | useProdutos, usePurchaseHistory | src/hooks/useProdutos.ts:40, :80, :99; src/hooks/usePurchaseHistory.ts:135 |
| `produtos` (embed) | relação embutida | useEstoque | src/hooks/useEstoque.ts:44 `produtos(nome, codigo)` |
| `profiles` | tabela/view | useBuyerPerformanceData | src/hooks/useBuyerPerformanceData.ts:52 (filtra por `current_organization_id`) |
| `push_subscriptions` | tabela/view | useRealPushNotifications | src/hooks/useRealPushNotifications.ts:103 (upsert `onConflict: 'user_id,endpoint'`) |
| `qualification_requirements` | tabela/view | useSupplierQualification | src/hooks/useSupplierQualification.ts:13 |
| `rate_limit_logs` | tabela/view | useSecurityLogs | src/hooks/useSecurityLogs.ts:142 |
| `role_permissions` | tabela/view | usePermissions | src/hooks/usePermissions.ts:47, :65 |
| `security_logs` | tabela/view | useSecurityLogs | src/hooks/useSecurityLogs.ts:80 |
| `solicitacoes` | tabela/view | useApprovalWorkflow, useBuyerPerformanceData, usePrefetch, usePurchaseHistory, useSidebarBadges, useExecutiveDashboardData, useOfflineSync | src/hooks/useApprovalWorkflow.ts:95; src/hooks/useBuyerPerformanceData.ts:85; src/hooks/usePrefetch.ts:29, :150; src/hooks/usePurchaseHistory.ts:163; src/hooks/useSidebarBadges.ts:23; src/hooks/useExecutiveDashboardData.ts:44; src/hooks/useOfflineSync.ts:139 |
| `solicitacoes` (embed) | relação embutida | useApprovalWorkflow | src/hooks/useApprovalWorkflow.ts:61 `solicitacoes:solicitacoes(numero, titulo, prioridade)` |
| `sourcing_event_criteria` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:243 |
| `sourcing_event_lots` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:241 |
| `sourcing_event_questions` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:242 |
| `sourcing_events` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:190, :206, :228 |
| `sourcing_invitations` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:244 |
| `sourcing_responses` | tabela/view | useLicitacoes | src/hooks/useLicitacoes.ts:245 |
| `supplier_documents` | tabela/view | useSupplierQualification | src/hooks/useSupplierQualification.ts:38, :62 |
| `supplier_qualification_scores` | tabela/view | useSupplierQualification | src/hooks/useSupplierQualification.ts:26 |
| `system_alerts` | tabela/view | useCriticalAlertsBadge | src/hooks/useCriticalAlertsBadge.ts:25 (+ canal Realtime :48) |
| `user_filter_preferences` | tabela/view | useAccountFilters | src/hooks/useAccountFilters.ts:62, :89, :166, :222 (upsert `onConflict: 'user_id,scope'`) |
| `user_tour_preferences` | tabela/view | useTourPreferences | src/hooks/useTourPreferences.ts:31, :88, :119, :149, :192, :221, :239 (upsert `onConflict: 'user_id,tour_key'`) |
| `webauthn_credentials` | tabela/view | useWebAuthn | src/hooks/useWebAuthn.ts:62, :284 |
| `workflow_approvals` | tabela/view | useSidebarBadges | src/hooks/useSidebarBadges.ts:26 |

> ⚠️ **Drift candidato**: `workflow_approvals` (useSidebarBadges.ts:26) coexiste com `approval_workflows` (useApprovalWorkflow.ts:60). São dois nomes diferentes para o mesmo conceito de "aprovações pendentes". Um dos dois provavelmente não existe. **Prioridade de verificação no banco vivo.**

### RPCs referenciadas em `.rpc()`

| Objeto referenciado | Tipo | Hook | Evidência (arquivo:linha) |
|---|---|---|---|
| `check_budget_availability` | rpc | useBudgetManagement | src/hooks/useBudgetManagement.ts:128 (params `p_cost_center_id`, `p_valor`) |
| `clear_login_lockout` | rpc | useAccountLockout | src/hooks/useAccountLockout.ts:120 (param `_email`) |
| `find_approval_rule` | rpc | useApprovalRules | src/hooks/useApprovalRules.ts:143 (params `p_valor`, `p_categoria_id`) |
| `generate_sequential_number` | rpc | useDevolucoes, useFornecedores, useLicitacoes, usePagamentos | src/hooks/useDevolucoes.ts:110; src/hooks/useFornecedores.ts:110; src/hooks/useLicitacoes.ts:44; src/hooks/usePagamentos.ts:116 (params `prefix`, `table_name`) |
| `get_compras_dashboard_metrics` | rpc | useDashboardKPIs | src/hooks/useDashboardKPIs.ts:75 (params `p_organization_id`, `p_period`, `p_category_id`, `p_supplier_id`) |
| `get_cost_center_performance_report` | rpc | useBudgetManagement | src/hooks/useBudgetManagement.ts:45 (param `p_organization_id`) |
| `get_effective_approver` | rpc | useApprovalRules | src/hooks/useApprovalRules.ts:154 (params `p_approver_id`, `p_categoria_id`, `p_valor`) |
| `get_fornecedores_kpis` | rpc | useFornecedores | src/hooks/useFornecedores.ts:244 (param `p_organization_id`) |
| `get_pagamentos_kpis` | rpc | usePagamentos | src/hooks/usePagamentos.ts:279 (param `p_organization_id`) |
| `is_account_locked` | rpc | useAccountLockout | src/hooks/useAccountLockout.ts:46 (param `_email`) |
| `record_failed_login` | rpc | useAccountLockout | src/hooks/useAccountLockout.ts:76 (param `_email`) |

### Edge functions referenciadas em `functions.invoke()`

| Objeto referenciado | Tipo | Hook | Evidência (arquivo:linha) |
|---|---|---|---|
| `guided-buying-ai` | edge fn | useGuidedBuying | src/hooks/useGuidedBuying.ts:56 (body `{ message, history }`) |
| `spot-proxy` | edge fn | useSpotIntegration | src/hooks/useSpotIntegration.ts:51 (body `{ action, ...params }`; ações: `search`, `catalog`, `product`, `stock`, `addToCart`, `getCart`, `removeFromCart`, `updateCartQty`, `orders`, `financial`, `checkout`, `login`) |
| `webauthn-authenticate` | edge fn | useWebAuthn | src/hooks/useWebAuthn.ts:185, :231 (ações `start`/`finish`) |
| `webauthn-register` | edge fn | useWebAuthn | src/hooks/useWebAuthn.ts:86, :139 (ações `start`/`finish`) |
| `xbz-proxy` | edge fn | useXbzIntegration | src/hooks/useXbzIntegration.ts:178 (body `{ action, ...params }`; ações: `catalogo`, `cores`, `fiscalSt`, `pedidos`, `dashboard`, `vendedor`, `pessoaToken`, `carrinhoResumo`, `carrinhoListar`, `entregaTipos`, `pagamentoTipos`, `credentialsStatus`, `saveCredentials`, `testConnection`, `login`, `cancelarPedido`, `itemLancar`, `itemAlterarQuantidade`, `itemRemover`, `gerarPedidos`) |

### APIs Supabase Auth (não são tabelas)

| Objeto | Hook | Evidência |
|---|---|---|
| `auth.getUser()` | useAccountFilters, useSidebarBadges | src/hooks/useAccountFilters.ts:54; src/hooks/useSidebarBadges.ts:19 |
| `auth.onAuthStateChange()` | useAccountFilters | src/hooks/useAccountFilters.ts:115 |
| `auth.mfa.enroll/challenge/verify/listFactors/unenroll/getAuthenticatorAssuranceLevel` | useMFA | src/hooks/useMFA.ts:47, :68, :74, :110, :159, :204 |
| `auth.verifyOtp()` | useWebAuthn | src/hooks/useWebAuthn.ts:248 |

### Canais Realtime (`postgres_changes`)

| Canal | Tabela escutada | Hook | Evidência |
|---|---|---|---|
| `approval_notifications_${user.id}` | `notifications` (INSERT, filtro `user_id`) | useApprovalNotifications | src/hooks/useApprovalNotifications.ts:88–96 |
| `critical_alerts_badge` | `system_alerts` (INSERT, **sem filtro de tenant**) | useCriticalAlertsBadge | src/hooks/useCriticalAlertsBadge.ts:45–48 |
| `licitacao-bids-${licitacaoId}` | `licitacao_lances` (INSERT, filtro `licitacao_id`) | useLicitacoes | src/hooks/useLicitacoes.ts:332–335 |
| `notifications-realtime` | `notifications` (INSERT, filtro `user_id`) | useRealPushNotifications | src/hooks/useRealPushNotifications.ts:389–396 |
| `realtime-${tenantId}-${tables}` | dinâmico (`*`, filtro `tenant_id` quando aplicável) | useRealtimeSubscription | src/hooks/useRealtimeSubscription.ts:114–148; lista de tabelas tenant-scoped em :13–28 |

Tabelas declaradas como tenant-scoped em `useRealtimeSubscription.ts:13–28`: `solicitacoes`, `pedidos`, `cotacoes`, `pagamentos`, `fornecedores`, `contracts`, `approval_workflows`, `approval_steps`, `devolucoes`, `creditos_fornecedor`, `contact_notes`, `licitacoes`, `licitacao_lances`, `notifications`.

---

## Tabela de evidências

| Hook | Classificação | Evidência (arquivo:linha) | Objeto de dados | Quem consome | O que falta |
|---|---|---|---|---|---|
| `approvalWorkflowTypes.ts` | ✅ | src/hooks/approvalWorkflowTypes.ts:1–92 (só interfaces) | (local — sem objeto de banco) | useApprovalWorkflow.ts:14, useApprovalRules.ts:6, useApprovalHistory.ts:4 | — |
| `use-mobile.tsx` | ✅ | src/hooks/use-mobile.tsx:9 `matchMedia` | (local — sem objeto de banco) | 9 arquivos, ex. src/components/ui/sidebar.tsx:51, src/pages/pedidos/Pedidos.tsx:29 | — |
| `use-toast.ts` | ✅ | src/hooks/use-toast.ts:71–122 reducer, :166 hook | (local — sem objeto de banco) | 10 arquivos, ex. src/components/ui/toaster.tsx:6, src/components/compras/PriceComparator.tsx:41 | — |
| `useAccountFilters.ts` | 🟨 | src/hooks/useAccountFilters.ts:62, :89, :166, :222 | `user_filter_preferences` | src/pages/solicitacoes/Solicitacoes.tsx:72, src/pages/historico/HistoricoCompras.tsx:89, src/pages/acompanhamento/Acompanhamento.tsx:59, src/pages/dashboard/ComprasDashboard.tsx:90, src/components/compras/ExecutiveDashboard.tsx:2 | **Escrita silenciosa**: `upsert` em :88–90 e :221–223 nunca checa `error` — falha de persistência é invisível. Leitura em :61–70 trata `error` como "sem linha" e cai na migração de localStorage. |
| `useAccountLockout.ts` | ✅ | src/hooks/useAccountLockout.ts:46, :76, :120 | RPC `is_account_locked`, `record_failed_login`, `clear_login_lockout` | src/pages/auth/Auth.tsx:46 | — |
| `useApprovalHistory.ts` | ✅ | src/hooks/useApprovalHistory.ts:11, :21 | `approval_history` | src/hooks/useApprovalWorkflow.ts:44 → src/components/compras/PendingApprovalsList.tsx:62, src/pages/aprovacoes/Aprovacoes.tsx:35 | Catch retorna `[]`/silencia após `logger.error` (:16, :26) — usuário vê lista vazia sem aviso. |
| `useApprovalNotifications.ts` | ✅ | src/hooks/useApprovalNotifications.ts:87–142 (Realtime), :107 filtro de tipos | Realtime em `notifications` | src/components/compras/PendingApprovalsList.tsx:114, :130, :233 | — |
| `useApprovalRules.ts` | ✅ | src/hooks/useApprovalRules.ts:18, :35, :71, :75, :87, :111, :115, :127, :143, :154 | `approval_rules`, `approval_delegations`, RPC `find_approval_rule`, `get_effective_approver` | src/hooks/useApprovalWorkflow.ts:43 → src/components/compras/DynamicApprovalMatrix.tsx:29 | — |
| `useApprovalWorkflow.ts` | ✅ | src/hooks/useApprovalWorkflow.ts:60, :73, :95, :114, :161, :165, :188, :201, :212, :244, :252, :274, :286 | `approval_workflows`, `approval_steps`, `approval_history`, `solicitacoes`, `approval_rules`, `cost_centers` | src/components/compras/PendingApprovalsList.tsx:62, src/components/compras/DynamicApprovalMatrix.tsx:29, src/pages/aprovacoes/Aprovacoes.tsx:35, src/features/solicitacoes/hooks/useSolicitacoes.ts:95 | `workflowDLQ` (:357) exposto mas nenhuma tela consome — ver órfãos. Escalação por `setInterval` de 60s no cliente (:315) além do cron do servidor. |
| `useBudgetManagement.ts` | ✅ | src/hooks/useBudgetManagement.ts:28, :45, :64, :93, :113, :128 | `department_budgets`, `cost_centers` (embed), RPC `get_cost_center_performance_report`, `check_budget_availability` | src/pages/orcamentos/Orcamentos.tsx:36 (rota `/orcamentos`, AppRoutes.tsx:109) | `checkAvailability` (:126) não é desestruturado por nenhum consumidor. |
| `useBulkOperations.ts` | ⬛ | src/hooks/useBulkOperations.ts:11 (hook), :73/:83/:92 (constantes) | (local — sem objeto de banco) | **Nenhum**. Grep `useBulkOperations` fora de `src/hooks/` retorna apenas `src/hooks/__tests__/hookConstants.test.ts:22` | Hook e as 3 listas de status (`solicitacoesStatusOptions`, `pedidosStatusOptions`, `pagamentosStatusOptions`) só existem para o próprio teste. |
| `useBuyerPerformanceData.ts` | 🟨 | src/hooks/useBuyerPerformanceData.ts:52, :68, :85, :101, :117, :132 | `profiles`, `cotacoes`, `solicitacoes`, `pedidos`, `fornecedores`, `categorias` | src/pages/buyer/BuyerPerformanceDashboard.tsx:51 (rota `/buyer-performance`), src/components/compras/BuyerPerformanceAlerts.tsx:40 | **Dados fictícios**: :222 `taxaSucesso` cai para literal `80` quando não há entregas; :281 `economia` do fornecedor é inicializada em `0` e **nunca incrementada** — a coluna "economia por fornecedor" na tela sempre mostra R$ 0. |
| `useClearFiltersFlow.tsx` | ✅ | src/hooks/useClearFiltersFlow.tsx:53–90, :149–157 | (local — sem objeto de banco; delega o clear ao caller) | src/pages/historico/HistoricoCompras.tsx:135, src/components/compras/ExecutiveDashboard.tsx:111, src/pages/solicitacoes/Solicitacoes.tsx:3, src/pages/acompanhamento/Acompanhamento.tsx:4 | `useEffect` em :126–130 registra listener com dep `[]` mas usa `requestClear` — closure pode ficar obsoleta se `scope` mudar. |
| `useContactNotes.ts` | ✅ | src/hooks/useContactNotes.ts:42, :77, :104, :125, :147 (realtime) | `contact_notes` | src/features/layout/components/SupplierChat.tsx:60 | — |
| `useCooldown.ts` | ✅ | src/hooks/useCooldown.ts:16–33 | (local — sem objeto de banco) | src/pages/catalogo-xbz/XbzCarrinhoTab.tsx:26 | — |
| `useCriticalAlertsBadge.ts` | 🟨 | src/hooks/useCriticalAlertsBadge.ts:24–30 | `system_alerts` (+ Realtime :48) | src/features/layout/components/AppSidebar.tsx:328 | **Erro engolido**: :24 só desestrutura `{ count: c }` — se a query falhar (RLS/tabela ausente), `c` é `undefined` e :30 exibe `0`. Badge indistinguível entre "zero alertas" e "query quebrada". Canal Realtime :48 escuta `system_alerts` **sem filtro de tenant**. |
| `useDashboardFilters.ts` | ✅ | src/hooks/useDashboardFilters.ts:38, :60, :88, :108, :114 | `dashboard_filter_favorites` | src/components/compras/ExecutiveDashboard.tsx:99 (rota `/dashboard-executivo`, AppRoutes.tsx:98) | — |
| `useDashboardKPIs.ts` | 🟨 | src/hooks/useDashboardKPIs.ts:75 (RPC real) | RPC `get_compras_dashboard_metrics` | src/pages/dashboard/ComprasDashboard.tsx:92 (rota `/compras`), src/components/compras/DashboardInsights.tsx:33 | **Constantes hardcoded servidas como KPI**: :98 `generateSparkline` retorna sempre `[]`; :106 `atrasados: 0`; :107 `taxaEntrega: 100`; :109 `totalFornecedores: 0`; :111 `pendingApprovals: 0`; :116 `avgSla: 1.8`; :117 `taxaSlaReal: 85`; :137–142 bloco `comparisons.sla` inteiro literal (`85/82/+3` e sparkline `[80,82,81,84,83,85,85]`). |
| `useDevolucoes.ts` | ✅ | src/hooks/useDevolucoes.ts:63, :110, :114, :140, :168, :173, :198, :226, :244, :269, :299 | `devolucoes`, `devolucao_itens`, `creditos_fornecedor`, `fornecedores`, `pedidos`, RPC `generate_sequential_number` | src/pages/devolucoes/Devolucoes.tsx:31/:32/:33, src/pages/devolucoes/DevolucoesModals.tsx:35/:199 (rota `/devolucoes`, AppRoutes.tsx:114) | Fallback de tenant `'00000000-...'` (:65, :230, :299) mascara ausência de tenant em vez de falhar. |
| `useEstoque.ts` | ✅ | src/hooks/useEstoque.ts:43, :65, :89 | `estoque`, `estoque_movimentacoes`, `produtos` (embed) | src/pages/estoque/GestaoEstoque.tsx:27 (rota `/estoque`, AppRoutes.tsx:116) | — |
| `useExecutiveDashboardData.ts` | 🟨 | src/hooks/useExecutiveDashboardData.ts:33, :44, :55, :66, :77, :88 (via `fetchAllRows`) | `pedidos`, `solicitacoes`, `fornecedores`, `contracts`, `approval_workflows`, `categorias` | src/components/compras/ExecutiveDashboard.tsx:50 | **Métricas simuladas**: :153 `maverickSpend` = `totalSpend * 0.045` fixo; :154 `tailSpend` = `totalSpend * 0.12` fixo (o próprio comentário diz "Simulated"). Metas também são literais: :144 `target: totalSpend*1.02`, :148 `target: 5.0`, :149 `target: 50`, :152 `target: 90`. |
| `useFeedback.ts` | ✅ | src/hooks/useFeedback.ts:19 (zustand persist), :75 haptic, :83 WebAudio | (local — sem objeto de banco) | src/components/settings/FeedbackSettingsPanel.tsx:20, src/lib/feedbackToast.ts:19 | — |
| `useFlashHighlight.ts` | ⬛ | src/hooks/useFlashHighlight.ts:7–26 | (local — sem objeto de banco) | **Nenhum**. Grep `useFlashHighlight` em todo `src/` retorna zero ocorrências fora do próprio arquivo | Lógica também é suspeita: :16–20 retorna cleanup de dentro de `setTimeout`, que nunca é executado. |
| `useFormDataProtection.ts` | ⬛ | src/hooks/useFormDataProtection.ts:8–28 | (local — sem objeto de banco) | **Nenhum**. Grep zero ocorrências fora do arquivo | Duplica `useFormDirty` e `useUnsavedChangesWarning` — os três órfãos fazem a mesma coisa. |
| `useFormDirty.ts` | ⬛ | src/hooks/useFormDirty.ts:6–40 | (local — sem objeto de banco) | **Nenhum**. Grep zero ocorrências fora do arquivo | :28–33 o handler de `popstate` chama `e.preventDefault()` que não bloqueia navegação (o próprio comentário :31 admite). |
| `useFornecedores.ts` | ✅ | src/hooks/useFornecedores.ts:49, :110, :118, :172, :197, :244 | `fornecedores`, RPC `generate_sequential_number`, `get_fornecedores_kpis` | 9 arquivos: src/pages/fornecedores/Fornecedores.tsx:48/:49, src/pages/pedidos/Pedidos.tsx:58, src/pages/cotacao/Cotacao.tsx:54, src/pages/licitacoes/Licitacoes.tsx:24, src/pages/devolucoes/DevolucoesModals.tsx:36, src/features/layout/components/SupplierChat.tsx:43 | — |
| `useFuseSearch.ts` | 🟨 | src/hooks/useFuseSearch.ts:83 (hook), :225, :306, :329 | (local — sem objeto de banco) | **Apenas `normalizeText` (:59)** é importado: src/components/ui/enhanced-search.tsx:17, src/components/compras/PendingApprovalsList.tsx:22, src/features/layout/components/SupplierChat.tsx:25, src/features/layout/components/search/searchConfig.ts:6, src/features/layout/components/CommandPalette.tsx:49, src/features/layout/components/AdvancedSearch.tsx:14 | O motor Fuse.js (`useFuseSearch` :83, `useMultiCollectionSearch` :225, `createSearchIndex` :306, `HighlightedText` :329) **não tem nenhum consumidor** — a busca real da UI é feita com `normalizeText` + filtro manual. ~260 linhas de Fuse.js carregadas no bundle sem uso. |
| `useGeoRestriction.ts` | ✅ | src/hooks/useGeoRestriction.ts:55, :70, :88, :107, :125, :140 | `geo_settings`, `allowed_countries` | src/components/security/GeoWhitelistPanel.tsx:26, src/components/security/BlockedCountriesPanel.tsx:16 (rota `/seguranca`, AppRoutes.tsx:104) | :57 usa `.single()` — lança se `geo_settings` estiver vazia (não `maybeSingle`). |
| `useGlobalUndo.ts` | ✅ | src/hooks/useGlobalUndo.ts:49–82 (atalhos Ctrl+Z/Y) | (local — sem objeto de banco; store `@/stores/undoStore`) | src/features/layout/components/MainLayout.tsx:46 | `useUndoableAction` (:94) tem zero consumidores. |
| `useGuidedBuying.ts` | ✅ | src/hooks/useGuidedBuying.ts:56 | edge fn `guided-buying-ai` | src/features/layout/components/GuidedBuyingAssistant.tsx:24 | `lastAction` (:48/:67) é retornado mas não desestruturado pelo consumidor (:24). |
| `useImageCompression.ts` | ✅ | src/hooks/useImageCompression.ts:51, :98, :146 (via `@/lib/imageCompression`) | (local — sem objeto de banco) | src/components/compras/NovaSolicitacaoModal.tsx:270, src/pages/catalogo-produtos/CatalogoProdutos.tsx:59 | :148 `catch {}` sem log — falha de compressão silenciosa (comportamento intencional: mantém original). |
| `useKeyboardShortcuts.ts` | ✅ | src/hooks/useKeyboardShortcuts.ts:28–124 | (local — sem objeto de banco) | src/features/layout/components/MainLayout.tsx:45; `getShortcutsList` em src/features/layout/components/KeyboardShortcutsDialog.tsx:9 | Export `shortcutsList` (:162) tem zero consumidores. |
| `useLicitacoes.ts` | ✅ | src/hooks/useLicitacoes.ts:26, :44, :50, :74, :87, :110, :131, :149, :152, :190, :206, :228, :239–245, :259, :299, :312, :332 | `licitacoes`, `licitacao_propostas`, `licitacao_lances`, `sourcing_events`, `sourcing_event_lots`, `sourcing_event_questions`, `sourcing_event_criteria`, `sourcing_invitations`, `sourcing_responses`, `categorias`, `fornecedores`, RPC `generate_sequential_number` | src/pages/licitacoes/Licitacoes.tsx:23, src/pages/licitacoes/LicitacaoDetailDialog.tsx:46, src/pages/sourcing/Sourcing.tsx:24, src/pages/sourcing/RFxCreate.tsx:57, src/pages/sourcing/RFxDetails.tsx:27, src/pages/sourcing/AuctionRoom.tsx:34/:35, src/components/compras/ActiveSourcingWidget.tsx:12, src/components/licitacoes/ReverseAuctionRoom.tsx:20 (rotas AppRoutes.tsx:117–121) | `useSourcingEvents` (:186) não filtra por `organization_id`/`tenant_id` na leitura (só no insert :203) — depende inteiramente de RLS. |
| `useMFA.ts` | ✅ | src/hooks/useMFA.ts:30, :47, :84, :132, :163, :187, :204 | `mfa_settings` + `auth.mfa.*` | src/components/security/MFASettings.tsx:16, :108 | :183–185 códigos de backup gerados com `Math.random()` (não `crypto`) — fraco criptograficamente. |
| `useMobileGestures.ts` | ✅ | src/hooks/useMobileGestures.ts:17, :98, :162, :209 | (local — sem objeto de banco) | `useSwipeGesture`: src/components/onboarding/OnboardingTour.tsx:52; `usePullToRefresh`: src/components/mobile/MobileRefreshWrapper.tsx:42; `useHapticFeedback`: 6+ arquivos | `useLongPress` (:162) tem zero consumidores. |
| `useNProgress.ts` | ✅ | src/hooks/useNProgress.ts:19–31 | (local — sem objeto de banco) | src/App.tsx:22 | — |
| `useNavigation.tsx` | ✅ | src/hooks/useNavigation.tsx:29–39 (lê `history.state.idx`) | (local — sem objeto de banco) | 3 arquivos (Provider + `useNavigation`) | :61–70 retorna default silencioso fora do Provider em vez de lançar. |
| `useOfflineSync.ts` | 🟨 | src/hooks/useOfflineSync.ts:125–240 (replay), :139 (union de tabelas) | `solicitacoes`\|`pedidos`\|`fornecedores`\|`pagamentos`\|`cotacoes`\|`contracts` | src/features/layout/components/OfflineIndicator.tsx:11 — **só lê `isOnline`, `isSyncing`, `pendingCount`, `hasPendingOperations`** | **A fila nunca é alimentada**: grep de `addPendingOperation` e `withOfflineSupport` em todo `src/` fora de `useOfflineSync.ts` retorna **zero**. Todo o motor (retry :200, backoff :40, DLQ :214, detecção de conflito :151–170) roda sobre uma fila permanentemente vazia. `deadLetterQueue` (:304) também não tem UI. |
| `usePagamentos.ts` | ✅ | src/hooks/usePagamentos.ts:60, :116, :119, :167, :211, :226, :245, :279 | `pagamentos`, `fornecedores`/`pedidos`/`cost_centers` (embeds), RPC `generate_sequential_number`, `get_pagamentos_kpis` | src/pages/pagamentos/Pagamentos.tsx:52, :53 + 9 componentes usando o tipo `Pagamento` (rota `/pagamentos`, AppRoutes.tsx:90) | — |
| `usePasswordResetRequests.ts` | ✅ | src/hooks/usePasswordResetRequests.ts:31, :47, :63, :79, :102, :125, :145 | `password_reset_requests` | src/components/security/PasswordResetRequestsPanel.tsx:35 | :84 `ip_address: null` com comentário admitindo que precisaria de edge function. |
| `usePerformanceMonitor.ts` | ✅ | src/hooks/usePerformanceMonitor.ts:11–19 (via `@/lib/performance`) | (local — sem objeto de banco) | src/App.tsx:54, src/features/layout/components/MainLayout.tsx:49 | Montado 2x (App + MainLayout) — `initAll` roda duplicado. |
| `usePermissions.ts` | ✅ | src/hooks/usePermissions.ts:30, :47, :65 | `permissions`, `role_permissions` | src/components/security/PermissionGate.tsx:22, src/components/security/PermissionMatrix.tsx:18, src/components/admin/DependencyHealthBadge.tsx:102 | **Contrato quebrado**: `usePermissions` não retorna `isAdmin` (retorno em :117–127), mas `DependencyHealthBadge.tsx:102` faz `const { isAdmin } = usePermissions() as { isAdmin?: boolean }` — sempre `undefined`. O `as` mascara o erro de tipo. |
| `usePrefetch.ts` | ✅ | src/hooks/usePrefetch.ts:29, :49, :69, :90, :110, :130, :150 | `solicitacoes`, `pedidos`, `fornecedores`, `pagamentos`, `cotacoes`, `contracts` | src/components/PrefetchLink.tsx:22 | Chaves de cache (:26, :46, :66, :87, :107) precisam bater com as dos hooks reais; :46 `['pedidos', user.id, organizationId]` não confere com a chave paginada de `usePedidos`. Prefetch pode virar entrada de cache órfã. |
| `useProdutoFornecedores.ts` | ✅ | src/hooks/useProdutoFornecedores.ts:31, :60, :82 | `produto_fornecedores`, `fornecedores` (embed) | src/components/compras/ProductSupplierManager.tsx:44 | — |
| `useProdutos.ts` | ✅ | src/hooks/useProdutos.ts:40, :65, :80, :99 | `produtos`, `categorias`, `fornecedores` (embeds) | src/pages/catalogo-produtos/CatalogoProdutos.tsx:49, src/pages/estoque/GestaoEstoque.tsx:28, src/components/compras/solicitacao/SolicitacaoFormSteps.tsx:134 | — |
| `usePurchaseHistory.ts` | 🟨 | src/hooks/usePurchaseHistory.ts:90, :107, :121, :135, :149, :163, :177 | `pedidos`, `pedido_itens`, `fornecedores`, `produtos`, `categorias`, `solicitacoes`, `cost_centers` | src/pages/historico/HistoricoCompras.tsx:47 (rota `/historico-compras`), src/components/compras/SourcingHistoryConsole.tsx:50 + 7 arquivos usando os tipos | **Dado fictício**: :350 `avgDeliveryDays: 0` com comentário "Would need tracking data" — a coluna "prazo médio de entrega" por fornecedor sempre mostra 0. `isLoading` (:370) só reflete `loadingPedidos`; as outras 6 queries não entram no estado de carregamento. |
| `useRealPushNotifications.ts` | 🟨 | src/hooks/useRealPushNotifications.ts:103, :154, :181, :195, :217, :246, :268, :290, :312, :389 | `push_subscriptions`, `notifications`, `notification_preferences` | src/features/layout/components/RealNotificationCenter.tsx:139, src/components/notifications/NotificationSettingsPanel.tsx:21 | **Chave VAPID de exemplo hardcoded**: :84–86 comentário "For now, we'll use a placeholder VAPID key" + literal `'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'` (chave pública pública de demo do web-push). Push do servidor não funcionará com ela. :94 `catch { return; }` engole a falha de `subscribe()`. |
| `useRealtimeSubscription.ts` | ✅ | src/hooks/useRealtimeSubscription.ts:114–152, filtro tenant :124–126, defesa :133–137 | dinâmico (14 tabelas em :13–28) | 10 arquivos: src/pages/solicitacoes/Solicitacoes.tsx:97, src/pages/dashboard/ComprasDashboard.tsx:125, src/features/cotacoes/hooks/useCotacoes.ts:200, src/features/pedidos/hooks/usePedidos.ts:284, src/hooks/useDevolucoes.ts:209, src/hooks/useFornecedores.ts:218, src/hooks/usePagamentos.ts:257, src/hooks/useContactNotes.ts:147 etc. | :161 dep array inclui tanto `tablesKey` quanto `tables` (array novo a cada render) — pode recriar o canal a cada render em consumidores que passam array inline. |
| `useRecentlyViewed.ts` | ✅ | src/hooks/useRecentlyViewed.ts:44–58 (load), :61–67 (persist localStorage) | (local — sem objeto de banco) | src/features/layout/components/AdvancedSearch.tsx:50 (`addRecentItem`, `getMostRecent`), src/features/layout/components/search/SearchEmptyState.tsx:7 (tipo) | 4 dos 8 métodos retornados sem consumidor: `removeRecentItem` (:89), `clearRecentItems` (:94), `getRecentByType` (:100), `isRecent` (:110), `getRecentItemById` (:115). `useTrackPageView` (:167) tem zero consumidores. |
| `useRenderProfiler.ts` | ✅ | src/hooks/useRenderProfiler.ts:12–23 (guard `import.meta.env.DEV`) | (local — sem objeto de banco) | src/pages/dashboard/DashboardExecutivo.tsx:8 | — |
| `useScrollRestoration.ts` | ✅ | src/hooks/useScrollRestoration.ts:15–33 | (local — sem objeto de banco) | src/features/layout/components/MainLayout.tsx:48 | — |
| `useSecurityLogs.ts` | ✅ | src/hooks/useSecurityLogs.ts:80, :96, :112, :127, :142, :158, :174, :194, :207, :225, :236 | `security_logs`, `login_attempts`, `blocked_ips`, `ip_whitelist`, `rate_limit_logs`, `active_sessions` | 7 arquivos: src/pages/seguranca/Seguranca.tsx:28, src/components/security/{SecurityLogsPanel:35, LoginAttemptsPanel:13, BlockedIPsPanel:17, IPWhitelistPanel:14, RateLimitDashboard:22, ActiveSessionsPanel:15} | Cada painel chama `useSecurityLogs()` inteiro → 6 queries disparadas 7x na tela `/seguranca` (React Query deduplica por chave, mas o hook não é fatiado). |
| `useSessionIdleTimeout.ts` | 🟨 | src/hooks/useSessionIdleTimeout.ts:22–31, :43 | (local — chama `signOut` do AuthContext) | src/features/layout/components/MainLayout.tsx:47 | **Catch efetivamente vazio** em :28–30: `catch (error: unknown) { /* comentário */ }` — se `signOut()` falhar, o toast "Sessão expirada" já apareceu mas o usuário continua logado, sem log nem retry. |
| `useSidebarBadges.ts` | 🟨 | src/hooks/useSidebarBadges.ts:22–34 | `solicitacoes`, `cotacoes`, `pagamentos`, `workflow_approvals` | src/features/layout/components/AppSidebar.tsx:329 | **Erros engolidos**: :30–33 usa `solRes.count ?? 0` etc. sem checar `.error` de nenhuma das 4 queries — tabela inexistente/RLS bloqueando vira badge "0". Ver drift `workflow_approvals` vs `approval_workflows`. Nenhum filtro de `organization_id`/`tenant_id` nas 4 contagens (:23–26). |
| `useSpotIntegration.ts` | ✅ | src/hooks/useSpotIntegration.ts:51 | edge fn `spot-proxy` | src/pages/catalogo-spot/CatalogoSpot.tsx:24 (rota `/catalogo-spot`, AppRoutes.tsx:105), src/pages/catalogo-spot/SpotFinancialTab.tsx:6 | 5 dos 12 métodos não são desestruturados pelo consumidor: `searchProducts`, `browseCatalog`, `getProduct`, `checkStock`, `updateCartQuantity`, `getCheckoutInfo`. |
| `useSupplierQualification.ts` | ✅ | src/hooks/useSupplierQualification.ts:13, :26, :38, :50, :62 | `qualification_requirements`, `supplier_qualification_scores`, `supplier_documents`, `fornecedores` | src/pages/qualificacao/QualificacaoFornecedores.tsx:34 (rota `/qualificacao-fornecedores`, AppRoutes.tsx:108) | Nenhuma das 4 queries filtra por `organization_id`/`tenant_id` — depende só de RLS. |
| `useTourPreferences.ts` | ✅ | src/hooks/useTourPreferences.ts:31, :88, :119, :149, :192, :221, :239 | `user_tour_preferences` | src/components/onboarding/OnboardingTour.tsx:469 (re-export como `useOnboardingTour`), src/components/settings/TourSettingsPanel.tsx:45 (`useAllTourPreferences`) | :53–67 em erro cai para localStorage sem log — falha de DB invisível. |
| `useUnsavedChangesWarning.ts` | ⬛ | src/hooks/useUnsavedChangesWarning.ts:9–28 | (local — sem objeto de banco) | **Nenhum**. Grep `useUnsavedChangesWarning` em todo `src/` retorna zero ocorrências fora do arquivo | Terceira cópia órfã do mesmo padrão (`useFormDirty`, `useFormDataProtection`). `location` (:10) é importado e nunca usado. |
| `useWebAuthn.ts` | 🟨 | src/hooks/useWebAuthn.ts:62, :86, :139, :185, :231, :248, :284 | `webauthn_credentials`, edge fn `webauthn-register`, `webauthn-authenticate` | src/components/security/PasskeyManager.tsx:43, src/pages/auth/Auth.tsx:45 | **Falha silenciosa que vira sucesso**: :248–257 se `verifyOtp` falhar, só faz `logger.error` com o comentário "Try alternative approach" (que não existe) e o fluxo segue para :260 `toast.success('Login realizado com sucesso!')` + `return { success: true }`. O usuário vê "login OK" sem sessão. |
| `useWorkflowDLQ.ts` | 🟨 | src/hooks/useWorkflowDLQ.ts:47 (push), :66 (retry), :111, :117 | (local — `localStorage` chave `workflow_dead_letter_queue`) | src/hooks/useApprovalWorkflow.ts:45 (só `pushToDLQ` é chamado: :177, :236, :265) | **Sem consumidor de tela**: grep de `workflowDLQ`, `retryableEntries`, `dlqEntries` em `*.tsx` fora de `src/hooks/` retorna **zero**. Aprovações que falham entram no DLQ do `localStorage` e ficam lá para sempre — não há UI de retry nem alerta. `retryEntry` (:66) nunca é chamado. |
| `useXbzIntegration.ts` | ✅ | src/hooks/useXbzIntegration.ts:178 (invoke), :286 (retry/backoff), :239 (cache TTL), :218 (coalescing) | edge fn `xbz-proxy` | 6 arquivos: src/pages/catalogo-xbz/{CatalogoXbz.tsx:17, XbzCatalogoTab.tsx:22, XbzPedidosTab.tsx:20, XbzCarrinhoTab.tsx:22, XbzCredenciaisDialog.tsx:17, XbzNetworkPanel.tsx:9} (rota `/catalogo-xbz`, AppRoutes.tsx:106) | `getCores`, `getFiscal`, `alterarQuantidade`, `getEntregaTipos`, `getPagamentoTipos`, `login`, `getPessoaToken`, `getVendedor`, `cancelarPedido`, `buscarProdutos` não são desestruturados por nenhum consumidor — ~10 dos 21 métodos sem uso. |

---

## Hooks órfãos (com prova de grep)

Comando usado (por hook): `grep -rn "\b<nome>\b" src/ --include=*.ts --include=*.tsx | grep -v "^src/hooks/<nome>.ts"` — cobre import nomeado, uso direto e re-export via index.

### Arquivos inteiramente órfãos (5)

| Arquivo | Prova de grep | Observação |
|---|---|---|
| `src/hooks/useBulkOperations.ts` | Única ocorrência fora do arquivo: `src/hooks/__tests__/hookConstants.test.ts:22` (import das constantes). Zero em `src/components/`, `src/pages/`, `src/features/` | O componente `BulkOperationsPreview` de onde vêm os tipos (`useBulkOperations.ts:3`) existe, mas ninguém liga os dois. |
| `src/hooks/useFlashHighlight.ts` | **Zero ocorrências** em todo `src/` fora do próprio arquivo | Nem teste. |
| `src/hooks/useFormDataProtection.ts` | **Zero ocorrências** em todo `src/` fora do próprio arquivo | — |
| `src/hooks/useFormDirty.ts` | **Zero ocorrências** em todo `src/` fora do próprio arquivo | — |
| `src/hooks/useUnsavedChangesWarning.ts` | **Zero ocorrências** em todo `src/` fora do próprio arquivo | Três hooks (`useFormDirty`, `useFormDataProtection`, `useUnsavedChangesWarning`) implementam o mesmo `beforeunload`; nenhum é usado. |

### Exports órfãos dentro de arquivos vivos (9)

| Export | Arquivo:linha | Prova de grep |
|---|---|---|
| `useFuseSearch` (o hook) | src/hooks/useFuseSearch.ts:83 | Fora de `src/hooks/`, só `normalizeText` é importado (6 arquivos). Nenhum import de `useFuseSearch` |
| `useMultiCollectionSearch` | src/hooks/useFuseSearch.ts:225 | Zero ocorrências fora do arquivo |
| `createSearchIndex` | src/hooks/useFuseSearch.ts:306 | Só `src/hooks/__tests__/useFuseSearch.test.ts:3` |
| `HighlightedText` (de useFuseSearch) | src/hooks/useFuseSearch.ts:329 | Zero. Os `HighlightedText` usados na UI são outros: `src/features/layout/components/search/HighlightedText.tsx:9` e o `React.memo` local em `src/components/ui/enhanced-search.tsx:30` |
| `shortcutsList` | src/hooks/useKeyboardShortcuts.ts:162 | Zero fora do arquivo (só `getShortcutsList` é usado) |
| `useUndoableAction` | src/hooks/useGlobalUndo.ts:94 | Zero ocorrências fora do arquivo |
| `useLongPress` | src/hooks/useMobileGestures.ts:162 | Zero ocorrências fora do arquivo |
| `useTrackPageView` | src/hooks/useRecentlyViewed.ts:167 | Zero ocorrências fora do arquivo |
| `addPendingOperation` / `withOfflineSupport` / `removePendingOperation` / `syncPendingOperations` / `deadLetterQueue` | src/hooks/useOfflineSync.ts:98, :282, :119, :125, :304 | **Zero ocorrências** em todo `src/` fora de `useOfflineSync.ts`. Consumidor único (`OfflineIndicator.tsx:11`) usa só os 4 campos de estado |
| `workflowDLQ` / `retryEntry` / `retryableEntries` / `dlqEntries` / `removeEntry` / `clearDLQ` | src/hooks/useApprovalWorkflow.ts:357; src/hooks/useWorkflowDLQ.ts:66, :111, :117, :122 | Zero ocorrências em `*.tsx` fora de `src/hooks/`. Só `pushToDLQ` é exercitado |

---

## Falhas silenciosas (catch vazio, fallback que mascara erro)

Ordenadas por severidade.

| # | Local | O que acontece | Por que é grave |
|---|---|---|---|
| 1 | `src/hooks/useWebAuthn.ts:248–261` | `verifyOtp` falha → apenas `logger.error` + comentário "Try alternative approach - direct session refresh" (código inexistente) → fluxo cai em `:260 toast.success('Login realizado com sucesso!')` e `return { success: true, ... }` | Erro de autenticação apresentado ao usuário como sucesso. |
| 2 | `src/hooks/useSessionIdleTimeout.ts:28–30` | `catch (error: unknown) { /* Best-effort: ignore... */ }` — **catch vazio** | O toast "Sessão expirada" já foi mostrado (:23); se `signOut()` falhar a sessão permanece ativa sem nenhum sinal. |
| 3 | `src/hooks/useSidebarBadges.ts:29–34` | 4 queries com `count` — nenhuma checa `.error`; usa `?? 0` | Badge zerado é indistinguível de query quebrada (ex.: se `workflow_approvals` não existir). |
| 4 | `src/hooks/useCriticalAlertsBadge.ts:24–30` | `const { count: c } = await supabase.from(...)` — `error` nem é desestruturado; `setCount(c ?? 0)` | Alertas críticos de sistema deixam de ser sinalizados silenciosamente. |
| 5 | `src/hooks/useAccountFilters.ts:88–90` e `:221–223` | `await supabase.from('user_filter_preferences').upsert(...)` sem checar `error` | Filtros "salvos" que nunca chegam ao banco; usuário só descobre ao recarregar. |
| 6 | `src/hooks/useAccountFilters.ts:70` | `if (!error && row?.filters ...) { ... } else { migração de localStorage }` | Erro de leitura é tratado como "usuário novo" e dispara migração/overwrite. |
| 7 | `src/hooks/useRealPushNotifications.ts:94–96` | `catch { return; }` em `pushManager.subscribe()` | Falha de inscrição push sai sem log e sem feedback; usuário acha que ativou. |
| 8 | `src/hooks/useTourPreferences.ts:53–67` | Erro de DB cai para `localStorage` sem `logger.*` | Falha de `user_tour_preferences` invisível (o `complete`/`skip` em :102 e :133 ao menos logam). |
| 9 | `src/hooks/useApprovalHistory.ts:16, :26` | `catch { logger.error(...); return []; }` | Logado, mas a UI recebe histórico vazio sem distinguir de "sem histórico". |
| 10 | `src/hooks/useAccountLockout.ts:50–53, :80–83, :123–125` | Erro de RPC → `logger.error` + `return { locked: false }` | **Fail-open de segurança**: se `is_account_locked` falhar, o login prossegue como se a conta estivesse desbloqueada. |
| 11 | `src/hooks/useImageCompression.ts:148–151` | `catch { results.push(file) }` sem log | Intencional (mantém original), mas sem qualquer telemetria de taxa de falha. |
| 12 | `src/hooks/useAccountFilters.ts:77, :93, :178, :228`; `useCriticalAlertsBadge.ts:37, :86`; `useOfflineSync.ts:92`; `useClearFiltersFlow.tsx:113, :139`; `useWorkflowDLQ.ts:32` | `catch { /* ignore */ }` em acesso a `localStorage`/`sessionStorage`/WebAudio | Aceitável (quota/privacidade), mas soma 10 pontos cegos. |
| 13 | `src/hooks/useDevolucoes.ts:65, :230, :299` | `tenantId \|\| organizationId \|\| '00000000-0000-0000-0000-000000000000'` | Tenant ausente vira UUID sentinela — consulta retorna vazio em vez de erro. |
| 14 | `src/hooks/useNavigation.tsx:61–70` | Fora do Provider retorna defaults + `logger.warn` | `canGoBack: false` silencioso quebra `SmartBackButton` sem erro visível. |

**Não encontrado**: nenhum `catch {}` literalmente vazio sem comentário; nenhum `catch` que faça apenas `console.log` (o projeto usa `logger`).

---

## Dados fictícios encontrados

| Local | Conteúdo | Impacto |
|---|---|---|
| `src/hooks/useDashboardKPIs.ts:98` | `const generateSparkline = (_base, _count = 7): number[] => []` — sempre array vazio | Todos os sparklines do dashboard `/compras` são vazios. O comentário :95–97 confirma que antes era `Math.random()`. |
| `src/hooks/useDashboardKPIs.ts:106, :107, :109, :111, :116, :117` | `atrasados: 0`, `taxaEntrega: 100`, `totalFornecedores: 0`, `pendingApprovals: 0`, `avgSla: 1.8`, `taxaSlaReal: 85` | 6 KPIs exibidos como reais são constantes literais. |
| `src/hooks/useDashboardKPIs.ts:137–142` | `sla: { current: 85, previous: 82, trend: 3, sparkline: [80, 82, 81, 84, 83, 85, 85] }` | Card de SLA inteiro é um array hardcoded fingindo série temporal. |
| `src/hooks/useExecutiveDashboardData.ts:153` | `maverickSpend: { value: totalSpend * 0.045, percentage: 4.5 }` — comentário `// Simulated maverick spend (off-contract)` | Métrica de compliance de contrato inventada a partir de multiplicador fixo. |
| `src/hooks/useExecutiveDashboardData.ts:154` | `tailSpend: { value: totalSpend * 0.12, percentage: 12.0 }` — comentário `// Simulated tail spend` | Idem. |
| `src/hooks/useExecutiveDashboardData.ts:144, :145, :147, :148, :149, :152` | `target`s literais: `totalSpend*1.02`, `savings*0.8`, `Math.max(ordersThisMonth,10)`, `5.0`, `50`, `90` | Todas as "metas" do dashboard executivo são fórmulas fixas, não configuração. |
| `src/hooks/useBuyerPerformanceData.ts:222` | `: buyerPeds.length > 0 ? 80 : 0` — fallback literal 80% de taxa de sucesso | Comprador sem entregas registradas aparece com 80% de sucesso. |
| `src/hooks/useBuyerPerformanceData.ts:281, :288, :296` | `economia: 0` inicializado e **nunca incrementado** no `fornMap` | Coluna "economia por fornecedor" sempre R$ 0 — dado estruturalmente ausente, não zero real. |
| `src/hooks/usePurchaseHistory.ts:350` | `avgDeliveryDays: 0, // Would need tracking data` | Prazo médio de entrega por fornecedor sempre 0. |
| `src/hooks/useRealPushNotifications.ts:84–86` | `// For now, we'll use a placeholder VAPID key` + literal `'BEl62iUYgUivxIkv69yViEuiBIa-...'` | Chave VAPID pública de demonstração pública do `web-push`. Push do servidor não autentica. |
| `src/hooks/useMFA.ts:183–185` | `Math.random().toString(36).substring(2,8).toUpperCase()` × 10 | Códigos de backup de MFA com PRNG não-criptográfico (~30 bits de entropia). |
| `src/hooks/useOfflineSync.ts:105` | `Math.random().toString(36).substr(2,9)` para id de operação | Aceitável (id local, não segurança). |
| `src/hooks/useWorkflowDLQ.ts:24` | `Math.random().toString(36).slice(2,9)` para id de entrada DLQ | Aceitável. |
| `src/hooks/useXbzIntegration.ts:328` | `Math.floor(Math.random() * 200)` de jitter no backoff | Uso legítimo. |

**Não encontrado**: nenhum array hardcoded de linhas de negócio (produtos/pedidos/fornecedores fictícios) dentro de `src/hooks/`. As constantes estáticas presentes são legítimas: `COMMON_COUNTRIES` (useGeoRestriction.ts:23), `moduleLabels`/`actionLabels` (usePermissions.ts:131, :146), `hapticPatterns`/`soundConfigs` (useFeedback.ts:36, :50), `STATUS_MAP` (usePurchaseHistory.ts:66), `VALID_TRANSITIONS` (useDevolucoes.ts:40, usePagamentos.ts:41), `recentItemType*` (useRecentlyViewed.ts:132–162) e as listas de status de `useBulkOperations.ts:73–97` (órfãs).

---

## Observações adicionais que o agente principal deve cruzar

1. **Drift de nome mais provável**: `workflow_approvals` (`useSidebarBadges.ts:26`) vs `approval_workflows` (`useApprovalWorkflow.ts:60`). Só um dos dois deve existir.
2. **Tabelas fora do type map gerado**: `useAccountFilters.ts:87` traz o comentário *"user_filter_preferences is not in the generated type map — cast via unknown"* e faz `supabase as unknown as {...}` em :88 e :221. Indício forte de que `src/integrations/supabase/types.ts` está defasado em relação ao banco (ou a tabela não existe).
3. **Casts `as never` em inserts** (mascaram divergência de schema): `useDevolucoes.ts:127, :182`; `useEstoque.ts:93`; `useLicitacoes.ts:58, :132`; `useProdutos.ts:84`; `usePagamentos.ts:128`; `useOfflineSync.ts:145, :173`; `useAccountFilters.ts:90, :223`.
4. **Sem filtro de tenant nas leituras** (dependem 100% de RLS): `useSecurityLogs.ts:80/:96/:112/:127/:142`, `useSupplierQualification.ts:13/:26/:38/:50`, `usePasswordResetRequests.ts:31/:47`, `useGeoRestriction.ts:55/:70`, `usePermissions.ts:30/:47/:65`, `useSidebarBadges.ts:23–26`, `useLicitacoes.ts:190` (`sourcing_events`), `useWebAuthn.ts:62`, `useContactNotes.ts:42`.
5. **Realtime sem filtro de tenant**: `useCriticalAlertsBadge.ts:48` escuta `system_alerts` globalmente — RLS não filtra payloads de Realtime (o próprio `useRealtimeSubscription.ts:104–111` documenta esse risco e se protege; este hook não).
6. **Duplo motor de escalação**: `useApprovalWorkflow.ts:315` roda `setInterval` de 60 s que escreve em `approval_workflows`/`approval_steps`/`approval_history`, enquanto `useApprovalNotifications.ts:45–49` documenta que o cron do servidor (`check-approval-escalations`) é o responsável. Possível dupla escalação/corrida.

---

## ARQUIVOS LIDOS

/home/user/promo-supply-v2/src/hooks/approvalWorkflowTypes.ts
/home/user/promo-supply-v2/src/hooks/use-mobile.tsx
/home/user/promo-supply-v2/src/hooks/use-toast.ts
/home/user/promo-supply-v2/src/hooks/useAccountFilters.ts
/home/user/promo-supply-v2/src/hooks/useAccountLockout.ts
/home/user/promo-supply-v2/src/hooks/useApprovalHistory.ts
/home/user/promo-supply-v2/src/hooks/useApprovalNotifications.ts
/home/user/promo-supply-v2/src/hooks/useApprovalRules.ts
/home/user/promo-supply-v2/src/hooks/useApprovalWorkflow.ts
/home/user/promo-supply-v2/src/hooks/useBudgetManagement.ts
/home/user/promo-supply-v2/src/hooks/useBulkOperations.ts
/home/user/promo-supply-v2/src/hooks/useBuyerPerformanceData.ts
/home/user/promo-supply-v2/src/hooks/useClearFiltersFlow.tsx
/home/user/promo-supply-v2/src/hooks/useContactNotes.ts
/home/user/promo-supply-v2/src/hooks/useCooldown.ts
/home/user/promo-supply-v2/src/hooks/useCriticalAlertsBadge.ts
/home/user/promo-supply-v2/src/hooks/useDashboardFilters.ts
/home/user/promo-supply-v2/src/hooks/useDashboardKPIs.ts
/home/user/promo-supply-v2/src/hooks/useDevolucoes.ts
/home/user/promo-supply-v2/src/hooks/useEstoque.ts
/home/user/promo-supply-v2/src/hooks/useExecutiveDashboardData.ts
/home/user/promo-supply-v2/src/hooks/useFeedback.ts
/home/user/promo-supply-v2/src/hooks/useFlashHighlight.ts
/home/user/promo-supply-v2/src/hooks/useFormDataProtection.ts
/home/user/promo-supply-v2/src/hooks/useFormDirty.ts
/home/user/promo-supply-v2/src/hooks/useFornecedores.ts
/home/user/promo-supply-v2/src/hooks/useFuseSearch.ts
/home/user/promo-supply-v2/src/hooks/useGeoRestriction.ts
/home/user/promo-supply-v2/src/hooks/useGlobalUndo.ts
/home/user/promo-supply-v2/src/hooks/useGuidedBuying.ts
/home/user/promo-supply-v2/src/hooks/useImageCompression.ts
/home/user/promo-supply-v2/src/hooks/useKeyboardShortcuts.ts
/home/user/promo-supply-v2/src/hooks/useLicitacoes.ts
/home/user/promo-supply-v2/src/hooks/useMFA.ts
/home/user/promo-supply-v2/src/hooks/useMobileGestures.ts
/home/user/promo-supply-v2/src/hooks/useNProgress.ts
/home/user/promo-supply-v2/src/hooks/useNavigation.tsx
/home/user/promo-supply-v2/src/hooks/useOfflineSync.ts
/home/user/promo-supply-v2/src/hooks/usePagamentos.ts
/home/user/promo-supply-v2/src/hooks/usePasswordResetRequests.ts
/home/user/promo-supply-v2/src/hooks/usePerformanceMonitor.ts
/home/user/promo-supply-v2/src/hooks/usePermissions.ts
/home/user/promo-supply-v2/src/hooks/usePrefetch.ts
/home/user/promo-supply-v2/src/hooks/useProdutoFornecedores.ts
/home/user/promo-supply-v2/src/hooks/useProdutos.ts
/home/user/promo-supply-v2/src/hooks/usePurchaseHistory.ts
/home/user/promo-supply-v2/src/hooks/useRealPushNotifications.ts
/home/user/promo-supply-v2/src/hooks/useRealtimeSubscription.ts
/home/user/promo-supply-v2/src/hooks/useRecentlyViewed.ts
/home/user/promo-supply-v2/src/hooks/useRenderProfiler.ts
/home/user/promo-supply-v2/src/hooks/useScrollRestoration.ts
/home/user/promo-supply-v2/src/hooks/useSecurityLogs.ts
/home/user/promo-supply-v2/src/hooks/useSessionIdleTimeout.ts
/home/user/promo-supply-v2/src/hooks/useSidebarBadges.ts
/home/user/promo-supply-v2/src/hooks/useSpotIntegration.ts
/home/user/promo-supply-v2/src/hooks/useSupplierQualification.ts
/home/user/promo-supply-v2/src/hooks/useTourPreferences.ts
/home/user/promo-supply-v2/src/hooks/useUnsavedChangesWarning.ts
/home/user/promo-supply-v2/src/hooks/useWebAuthn.ts
/home/user/promo-supply-v2/src/hooks/useWorkflowDLQ.ts
/home/user/promo-supply-v2/src/hooks/useXbzIntegration.ts
/home/user/promo-supply-v2/src/hooks/__tests__/hookConstants.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/keyboardShortcutsData.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/permissionsConstants.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/useApprovalHistory.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/useFuseSearch.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/useImageCompression.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/usePermissions.test.tsx
/home/user/promo-supply-v2/src/hooks/__tests__/useToastReducer.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/useWorkflowDLQ.test.ts
/home/user/promo-supply-v2/src/hooks/__tests__/useXbzIntegration.cache.test.tsx

### Arquivos fora do escopo lidos para verificar consumo (não classificados)

/home/user/promo-supply-v2/src/routes/AppRoutes.tsx (linhas 76–148, mapa de rotas)
/home/user/promo-supply-v2/src/lib/paginatedFetch.ts (implementação de `fetchAllRows`, usada por useExecutiveDashboardData)
/home/user/promo-supply-v2/src/components/compras/PendingApprovalsList.tsx (linhas 108–133, 233)

> **Ressalva de honestidade**: os 10 arquivos de `__tests__/` foram lidos em preview (primeiras ~30 linhas cada) o suficiente para identificar o que testam e quais exports importam — não linha a linha. Os 61 arquivos de produção foram lidos integralmente. `usePermissions.test.tsx` e `useXbzIntegration.cache.test.tsx` foram apenas listados e não abertos; sua existência é o que sustenta a afirmação de cobertura de teste, não seu conteúdo.
