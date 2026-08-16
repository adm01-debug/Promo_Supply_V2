# L01 — Rotas e Páginas Núcleo

> Auditoria por leitura integral do código. Nada aqui vem de README, DOCS ou comentários.
> Sem acesso a runtime/banco: qualquer afirmação sobre conteúdo de tabela, execução de job
> ou resposta de edge function está marcada como `NAO_VERIFICADO (runtime)`.
>
> **Convenção de classificação usada para telas sem persistência por natureza** (404, painel de
> branding, página de documentação estática): elas não podem exibir "fio completo até o banco".
> Quando a ausência de camada de dados é *correta pelo propósito da tela*, marquei ✅ e declarei
> `N/A por natureza` na coluna de dados. Quando a tela **finge** ter dados (KPI numérico fixo,
> badge de status inventado), marquei 🟦 — é dado fictício, não simplicidade.

## Resumo

| Classificação | Contagem |
| :--- | :--- |
| ✅ IMPLEMENTADO_TOTAL | 30 de 57 |
| 🟨 IMPLEMENTADO_PARCIAL | 12 de 57 |
| 🟦 SUGERIDO_OU_INICIADO | 12 de 57 |
| ⬛ MORTO_OU_ABANDONADO | 3 de 57 |

Checagem bidirecional de rotas (a mais valiosa do lote), resultado:

- **53 alvos `lazy(() => import(...))` declarados em `AppRoutes.tsx` → 53 arquivos existem.
  Zero rotas apontando para página inexistente.** (verificado arquivo a arquivo)
- **Zero páginas órfãs.** Os 3 arquivos `.tsx` do meu escopo que não têm rota
  (`admin/AlertSubscriptionsPanel.tsx`, `admin/ScanRunsSlaCard.tsx`, `auth/AuthBranding.tsx`)
  são subcomponentes com importador comprovado, não páginas.

O grosso do débito **não** está em roteamento — está em **KPIs numéricos hardcoded em telas
administrativas** e em **botões renderizados sem `onClick`**.

---

## Tabela de evidências

### Infraestrutura de boot e roteamento

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Bootstrap React + StrictMode | ✅ | `src/main.tsx:50-54` | N/A por natureza | — |
| Registro de Service Worker (PWA) | ✅ | `src/main.tsx:6` (`virtual:pwa-register`), `src/main.tsx:38-48` (`registerSW` + prompt de refresh); tipo declarado em `src/vite-env.d.ts:18-27` | Cache do SW (runtime) | Ativação efetiva do SW = `NAO_VERIFICADO (runtime)` |
| Recuperação do estado de acessibilidade no boot | ✅ | `src/main.tsx:10-35` — lê/reescreve `localStorage['accessibility-settings']` e limpa classes do `<html>` | localStorage | — |
| Stack de providers (Auth→Theme→Persist→A11y→Tooltip→Router→Nav→ErrorBoundary→Suspense) | ✅ | `src/App.tsx:60-87` | N/A | — |
| Isolamento do cache React Query por usuário (PersistGate) | ✅ | `src/App.tsx:36-50` — `buster: user?.id ?? 'anon'` (linha 44) sobre `persister` de `@/lib/query-client` | Storage do persister | — |
| Barra de progresso de navegação | ✅ | `src/App.tsx:22` (`useNProgress`), chamado dentro de `AppContent` renderizado em `App.tsx:76` | N/A | — |
| Monitor de performance global | ✅ | `src/App.tsx:54` (`usePerformanceMonitor()`) | Depende de `@/hooks/usePerformanceMonitor` (fora do lote) | Destino da métrica não verificável neste lote |
| Tabela de rotas (`AnimatedRoutes`) | ✅ | `src/routes/AppRoutes.tsx:69-156`; 53 imports lazy nas linhas 11-67, todos resolvidos para arquivo existente | N/A | — |
| Redirect raiz `/` → `/compras` | ✅ | `src/routes/AppRoutes.tsx:84` | N/A | — |
| Guarda de sessão (Shell protegido) | ✅ | `src/routes/AppRoutes.tsx:83` `<ProtectedRoute><Shell/></ProtectedRoute>`; implementação em `src/features/auth/components/ProtectedRoute.tsx:12` | Sessão Supabase (fora do lote) | Lógica interna do guard pertence a outro lote |
| Guarda de papel `admin` nas 12 rotas `/admin/*` | ✅ | `src/routes/AppRoutes.tsx:123-134` (`requiredRole="admin"`), checagem em `ProtectedRoute.tsx:30` (`hasRole`) | RBAC (fora do lote) | — |
| Guarda de papel `['supplier','admin']` no portal | ✅ | `src/routes/AppRoutes.tsx:136` | RBAC (fora do lote) | — |
| Rota dev-only do harness XBZ | ✅ | `src/routes/AppRoutes.tsx:140-146` — condicionada a `import.meta.env.DEV`, some em produção | N/A | — |
| Catch-all 404 | ✅ | `src/routes/AppRoutes.tsx:148-152` → `src/pages/NotFound.tsx:66` | N/A | — |
| `AnimatedRoutes` — nome vs. comportamento | 🟨 | `src/routes/AppRoutes.tsx:69-74`: nome promete transição animada, mas não há `AnimatePresence`/`motion`; `location` é lido (linha 70) e só repassado a `<Routes location>` (linha 74) | N/A | Animação de transição de rota nunca foi implementada; o nome do símbolo mente |

### Autenticação (`src/pages/auth/`)

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Login por email/senha | ✅ | UI `auth/Auth.tsx:284-318` → `handleLogin` `Auth.tsx:81-145` → `signIn` (`Auth.tsx:107`, de `@/features/auth`) | Supabase Auth + RPC `log_login_attempt` (`Auth.tsx:112`; assinatura existe em `src/integrations/supabase/types.ts`) | — |
| Cadastro (signup) com política de senha | ✅ | Schema Zod `Auth.tsx:25-38` → form `Auth.tsx:383-444` → `signUp` `Auth.tsx:175` | Supabase Auth | — |
| Bloqueio de conta por tentativas | ✅ | `Auth.tsx:46` (`useAccountLockout`), gatilhos `Auth.tsx:85-88`, `Auth.tsx:125`, `Auth.tsx:140` | RPCs `is_account_locked`, `record_failed_login`, `clear_login_lockout` (`src/hooks/useAccountLockout.ts:46,76,120`) | — |
| Login por Passkey (WebAuthn) | ✅ | Botão `Auth.tsx:352-376` → `authenticateWithPasskey` `Auth.tsx:365` | Edge function `webauthn-authenticate` (`src/hooks/useWebAuthn.ts:185,231`) + tabela `webauthn_credentials` (`useWebAuthn.ts:62`) | — |
| Indicador de senha vazada (Pwned) | ✅ | `Auth.tsx:414-417` (`PasswordStrengthIndicator` + `onStrengthChange`), bloqueio no submit `Auth.tsx:151-154` | Componente fora do lote | Origem da checagem HIBP = fora do lote |
| Login com Google (OAuth) | 🟨 | `Auth.tsx:335-341` — usa `import('@/integrations/lovable/index')` e `lovable.auth.signInWithOAuth('google')`, **não** `supabase.auth`; módulo existe (`src/integrations/lovable/index.ts:14`) | Provedor Lovable, fora do fluxo Supabase do resto do app | Caminho de auth paralelo ao do resto do sistema; sucesso do OAuth = `NAO_VERIFICADO (runtime)`. Sem `navigate()` no sucesso (só trata `result?.error`) |
| Links "Termos de Uso" / "Política de Privacidade" | 🟦 | `Auth.tsx:448` e `Auth.tsx:450` — ambos `href="#"` | Nenhuma | Documentos e rotas nunca criados |
| Redirect pós-login para `/` | ✅ | `Auth.tsx:65-69` e `Auth.tsx:143` | N/A | — |
| Painel de branding do login | ✅ | `auth/AuthBranding.tsx:23-60`, consumido em `Auth.tsx:40,215` | N/A por natureza | — |

### Dashboards (`src/pages/dashboard/`)

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Dashboard de Compras — KPIs | ✅ | UI `dashboard/ComprasDashboard.tsx:134-197` → `useDashboardKPIs(currentFilters)` `ComprasDashboard.tsx:92` | RPC `get_compras_dashboard_metrics` (`src/hooks/useDashboardKPIs.ts:75`) | Se a RPC retorna dados = `NAO_VERIFICADO (runtime)` |
| Dashboard de Compras — filtros persistidos por conta | ✅ | UI `ComprasDashboard.tsx:288-351` → `useAccountFilters('compras-dashboard', …)` `ComprasDashboard.tsx:86-90` | Tabela `user_filter_preferences` (`src/hooks/useAccountFilters.ts:62,89,166,222`) | — |
| Dashboard de Compras — combos Categoria/Fornecedor | ✅ | `ComprasDashboard.tsx:99-115` | `supabase.from('categorias')` (linha 102) e `.from('fornecedores')` (linha 111) | — |
| Dashboard de Compras — atualização realtime | ✅ | `ComprasDashboard.tsx:125-128` (`useRealtimeSubscription` sobre `solicitacoes, pedidos, cotacoes, pagamentos`) | Realtime Supabase | Entrega de eventos = `NAO_VERIFICADO (runtime)` |
| Dashboard de Compras — botão "VER TUDO" das urgências | 🟦 | `ComprasDashboard.tsx:216` — `onClick={() => {}}` | Nenhuma | Handler nunca escrito: botão visível e inerte |
| Dashboard de Compras — 8 widgets no `switch` sem chamador | ⬛ | Casos definidos em `ComprasDashboard.tsx:245-254` (`supplier-alerts`, `supplier-ranking`, `buyer-performance`, `savings-goal`, `delivery-calendar`, `demand-prediction`, `risk-heatmap`, `active-sourcing`). Único chamador de `getWidgetComponent` são `ComprasDashboard.tsx:355-356` e `362-368`, que passam apenas 4 KPIs + `chart-pipeline`, `trend-charts`, `sourcing-intelligence`, `dashboard-insights`, `urgent-items` | Nenhuma (nunca montados) | Nenhum caminho de execução alcança esses 8 `case`; os `lazy()` de linhas 49-57 nunca são resolvidos |
| Dashboard de Compras — `DraggableDashboard` / `FilterFavoritesManager` / `SLADistributionChart` importados sem uso | ⬛ | Import `ComprasDashboard.tsx:30`, `:33`, `:47` — grep no arquivo inteiro retorna apenas a linha do import, zero uso em JSX | Nenhuma | O layout arrastável (que justificaria os 8 widgets acima) foi importado mas nunca renderizado |
| Dashboard de Compras — gravação do layout | 🟨 | `ComprasDashboard.tsx:78` desestrutura `saveToDb`, `ComprasDashboard.tsx:96` chama apenas `loadFromDb('compras')`; `saveToDb` não aparece mais no arquivo | Store `dashboardLayoutStore` | Fio quebrado: layout é lido do banco mas nunca gravado — usuário não consegue persistir alteração |
| Dashboard de Compras — imports mortos (`Link`, `Badge`, `performanceMonitor`) | ⬛ | `ComprasDashboard.tsx:12`, `:16`, `:41` — nenhuma ocorrência além do import | Nenhuma | Lixo de refatoração |
| Dashboard Executivo | ✅ | `dashboard/DashboardExecutivo.tsx:12` → `ExecutiveDashboard` → `useExecutiveDashboardData()` (`src/components/compras/ExecutiveDashboard.tsx:50`) | Tabelas `pedidos`, `solicitacoes`, `fornecedores`, `contracts`, `approval_workflows`, `categorias` via `fetchAllRows` (`src/hooks/useExecutiveDashboardData.ts:33,44,55,66,77,88`) | — |
| Dashboard Executivo — tour de onboarding | ✅ | `DashboardExecutivo.tsx:7,13-18` (`useOnboardingTour('dashboard-executivo')`) | Persistência do tour fora do lote | — |

### Auditoria, Segurança e Compliance

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Trilha de auditoria — listagem paginada e filtrada | ✅ | UI `auditoria/Auditoria.tsx:228-356` → `loadLogs` `Auditoria.tsx:37-49` → `fetchAuditLogs` | Tabela `audit_logs` (`src/services/auditService.ts:37,62`) + RPC `current_tenant_id` (`auditService.ts:21`) | — |
| Trilha de auditoria — export CSV + log do próprio export | ✅ | `Auditoria.tsx:65-85` (`exportToCSV` linha 76, `auditHelpers.logExport` linha 79) | `audit_logs` (escrita) | — |
| Trilha de auditoria — log de visualização da página | ✅ | `Auditoria.tsx:56-58` (`auditHelpers.logView`) | `audit_logs` | — |
| Central de Segurança — KPIs do topo | ✅ | `seguranca/Seguranca.tsx:29` (`getStats()`) renderizado em `Seguranca.tsx:48-104` | Tabelas `security_logs`, `login_attempts`, `blocked_ips`, `ip_whitelist`, `rate_limit_logs`, `active_sessions` (`src/hooks/useSecurityLogs.ts:80,96,112,127,142,158`) | — |
| Central de Segurança — 15 abas (MFA, Passkeys, IPs, Geo, Logs, Permissões, Tours…) | 🟨 | Triggers `Seguranca.tsx:108-175`, conteúdos `Seguranca.tsx:178-307`; todos os painéis vêm de `@/components/security/*` e `@/components/notifications/*` (imports `Seguranca.tsx:7-22`) | Fora deste lote | A página é apenas casca de abas; a prova do fio de dados de cada painel pertence ao lote de `src/components/security/` |
| Central de Segurança — card "Configurações de Sessão" | 🟦 | `Seguranca.tsx:192-244`: "24 horas" (`:208`), "Ativo" (`:216`), "TOTP + Email" (`:224`), "Por IP" (`:232`) — todos literais no JSX, nenhum estado ou query | Nenhuma | Painel decorativo que aparenta refletir configuração real do sistema |
| Central de Segurança — imports mortos (`useState`, `MainLayout`) | ⬛ | `Seguranca.tsx:1` e `Seguranca.tsx:3` — nenhum uso no restante do arquivo | Nenhuma | Sobra de refatoração de layout |
| Compliance — ranking de fornecedores | ✅ | UI `compliance/ComplianceDashboard.tsx:167-253` → `fetchData` `:42-56` | View `supplier_compliance_summary` (`ComplianceDashboard.tsx:45`) | Se a view tem linhas = `NAO_VERIFICADO (runtime)` |
| Compliance — regras de escalonamento (leitura) | ✅ | `ComplianceDashboard.tsx:257-304` ← `supabase.from('penalty_escalation_config')` (`:46`) | `penalty_escalation_config` | — |
| Compliance — elegibilidade a bonificação | ✅ | `ComplianceDashboard.tsx:327-355`; regra em `:328` (`on_time_rate>=95 && penalty_count===0 && avg_quality_score>=4`) derivada do mesmo dataset | Derivado de `supplier_compliance_summary` | — |
| Compliance — helpers de KPI/ordenação/status | ✅ | `compliance/complianceHelpers.ts:40-66`, cobertos por `compliance/__tests__/complianceHelpers.test.ts` (30 casos) | Puro | — |
| Compliance — estado de carregamento | 🟨 | `ComplianceDashboard.tsx:35` declara `loading`, `:53` chama `setLoading(false)`; a variável `loading` **nunca é lida** no JSX (grep no arquivo só devolve a linha 35) | — | Durante a carga a tabela exibe "Nenhum fornecedor encontrado" em vez de skeleton: falso negativo para o usuário |
| Compliance — painéis de CRUD acoplados | 🟨 | `ComplianceDashboard.tsx:373` (`SupplierBonificationsPanel`) e `:376` (`PenaltyEscalationConfigPanel`), renderizados **fora** do `<Tabs>` que fecha em `:370` | Fora do lote | Comentário em `:369` promete uma aba de CRUD que nunca foi criada; os painéis ficam empilhados abaixo das abas |

### Telemetria e Configurações

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Telemetria — listagem de queries lentas | ✅ | UI `admin-telemetria/AdminTelemetria.tsx:227-269` → query `:39-51` | `supabase.from("query_telemetry")` (`:43`), filtros por severidade (`:44`) e janela (`:42`) | — |
| Telemetria — limpeza de dados >7 dias | ✅ | Botão `AdminTelemetria.tsx:111` → `handleCleanup` `:53-58` | `DELETE` em `query_telemetry` (`:55`) | — |
| Telemetria — export CSV | ✅ | `AdminTelemetria.tsx:99` → `exportCSV` (`telemetriaHelpers.ts:75-106`) | Blob local | — |
| Telemetria — export PDF | ✅ | `AdminTelemetria.tsx:100` → `exportPDF` (`telemetriaHelpers.ts:108-152`, `jspdf` + `jspdf-autotable` por import dinâmico) | Arquivo local | — |
| Telemetria — top ofensores e estatísticas | ✅ | `AdminTelemetria.tsx:79` (`computeStats`) → `telemetriaHelpers.ts:52-73`; coberto por `admin-telemetria/__tests__/telemetriaHelpers.test.ts` (33 casos) | Puro | — |
| Telemetria — simulação de estresse | 🟨 | Botão `AdminTelemetria.tsx:101-110` → `handleRunSimulation` `:60-77` → `supabase.functions.invoke('system-simulation')` (`:65`); função existe em `supabase/functions/system-simulation` | Edge function `system-simulation` | **Bug**: `:70` lê `data.error`, campo inexistente no tipo declarado em `:32-37` (`success/total/avgDuration/details`) — o toast de sucesso imprime `undefined falhas`. Além disso `:150` exibe "100% VALIDADO" como literal fixo, independente do resultado |
| Telemetria — abas "Logs da Aplicação" e "Alertas de Sistema" | 🟨 | `AdminTelemetria.tsx:272-278` → `AppLogsView` / `SystemAlertsView` (`@/components/admin/telemetry/*`, imports `:15,17`) | Fora do lote | Fio de dados a provar no lote de `src/components/admin/` |
| Centros de Custo — CRUD | ✅ | UI `configuracoes/ConfiguracoesCentroCusto.tsx:160-235` (dialog) e `:306-315` (ações) → `handleSave` `:95-135`, `handleDelete` `:137-147` | `supabase.from('cost_centers')` `.update` (`:117`), `.insert` (`:124`), `.delete` (`:140`) | — |
| Centros de Custo — combo de gestor | ✅ | `ConfiguracoesCentroCusto.tsx:195-206` ← query `:52-59` | `supabase.from('profiles')` (`:55`) | — |
| Centros de Custo — hierarquia (Centro pai) | 🟨 | `SelectItem value="none"` em `:215`; `handleSave` grava `parent_id: form.parent_id \|\| null` (`:109`) | `cost_centers.parent_id` | **Bug**: escolher "Nenhum" grava a string literal `"none"` em `parent_id` (não `null`), o que quebra a FK/uuid. `NAO_VERIFICADO (runtime)` se o banco rejeita ou grava sujo |
| Centros de Custo — colSpan da tabela | 🟨 | `:264` e `:270` usam `colSpan={4}` numa tabela de 7 colunas (`:252-258`) | — | Estados de vazio/carregando desalinham visualmente |
| Centros de Custo — imports mortos (`MainLayout`) | 🟦 | `ConfiguracoesCentroCusto.tsx:2` — sem uso; JSX abre direto em `PageTransition` (`:151`) | Nenhuma | — |

### Admin — Saúde do Sistema (`src/pages/admin/`)

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Health Dashboard — consolidação de 7 fontes | ✅ | `admin/HealthDashboard.tsx:136-231` (`fetchHealth`), consumido em `:235-240` | View `v_system_health_overview` (`:148`), tabelas `health_scan_runs` (`:165`) e `system_alerts` (`:177`, `:210`), RPCs `alerts_severity_timeseries` (`:191`), `alerts_mttr_by_type` (`:197`), `alerts_noisy_scanners` (`:203`) — todos presentes em `types.ts` | Se há alertas = `NAO_VERIFICADO (runtime)` |
| Health Dashboard — resolução de alerta com nota | ✅ | Dialog `:800-850` → `resolveMutation` `:246-263` | RPC `resolve_alert` (`:248`) | — |
| Health Dashboard — push realtime de alertas críticos | ✅ | `:341-364` — canal `system_alerts_admin`, INSERT em `public.system_alerts` (`:346`), toast em CRITICAL/EMERGENCY (`:350-354`) e `refetch()` (`:356`) | Realtime Supabase | Entrega = `NAO_VERIFICADO (runtime)` |
| Health Dashboard — filtros + export CSV de alertas | ✅ | Filtros `:676-721` sobre `filteredAlerts` `:289-305`; `exportCsv` `:307-332` | Blob local a partir de `open_alerts` | — |
| Health Dashboard — gráfico de severidade 7d | ✅ | `:412-462` (recharts) alimentado por `pivotTimeseries` (`:123-134`) sobre a RPC de `:191` | RPC `alerts_severity_timeseries` | — |
| Health Dashboard — link "Detalhes" do alerta | 🟨 | `:763` — `<a href={/admin/health/alerts/${row.id}}>` dentro de `Button asChild` | N/A | Âncora nativa em vez de `<Link>`: recarrega a SPA inteira e descarta o cache do React Query. A rota de destino existe (`AppRoutes.tsx:134`) |
| Detalhe do alerta + timeline | ✅ | `admin/AlertDetail.tsx:65-77` → `supabase.functions.invoke('health-dashboard?alert_id=…')` (`:69-72`); UI `:101-261` | Edge function `health-dashboard` (existe em `supabase/functions/health-dashboard`) | Resposta real = `NAO_VERIFICADO (runtime)`. Note a **inconsistência arquitetural**: `HealthDashboard` lê tabelas direto, `AlertDetail` passa por edge function |
| Runbooks operacionais por `alert_type` | ✅ | `admin/alertRunbooks.ts:13-113` (8 runbooks + genérico), consumido em `AlertDetail.tsx:10,79`, coberto por `admin/__tests__/alertRunbooks.test.ts` (19 casos) | Constante versionada em código (intencional, `alertRunbooks.ts:3`) | — |
| Assinaturas de alerta (CRUD + snooze + canais) | ✅ | `admin/AlertSubscriptionsPanel.tsx:161-343`; importado por `HealthDashboard.tsx:22,788` | `supabase.from("alert_subscriptions")`: select `:68`, insert `:91`, update `:119` e `:131`, delete `:144` | Se o dispatcher respeita `snoozed_until` = `NAO_VERIFICADO (runtime)`; validação de URL Slack/webhook está no cliente (`:78-90`) |
| SLA dos jobs de manutenção + histórico por scanner | ✅ | `admin/ScanRunsSlaCard.tsx:194-303`; importado por `HealthDashboard.tsx:23,652` | RPC `admin_scan_runs_sla_status` (`:56`), tabelas `health_scan_runs` (`:77`) e `system_alerts` (`:64`) | — |
| Saúde de Dependências — snapshot com fallback | ✅ | `admin/DependencyHealth.tsx:184-210`: tenta edge function (`:188`), cai para `fetch('/dependency-health.json')` (`:202`); badge de origem em `:446-456` | Edge function `dependency-health` + arquivo estático | O JSON estático refletir a realidade = `NAO_VERIFICADO (runtime)` |
| Saúde de Dependências — "Atualizar agora" e "Atualizar & commitar" | ✅ | Botões `:466-488` → `makeRefreshMutationFn` `:261-275` (POST na edge function, `?dispatchCi=true` em `:264`); cooldown de CI `:368-389` | Edge function `dependency-health` | — |
| Saúde de Dependências — score de tree-shaking e histórico | ✅ | Score `:762-805`, sparklines `:1183-1202`, diff entre snapshots `:239-258`; histórico via `fetchHistory` `:46-52` | Edge function `dependency-health?history=true` | — |
| Saúde de Dependências — artefato de smoke test de PR | ✅ | `:75-81` (`fetchPrSmoke`), card `:1000-1156` com tratamento explícito de `ok/empty/skipped/error` | Edge function `dependency-health?prSmoke=true` → API do GitHub | Token do GitHub configurado = `NAO_VERIFICADO (runtime)`; o próprio código trata a ausência (`:1052-1060`) |
| Migração de Storage por tenant | ✅ | UI `admin/StorageMigration.tsx:71-214`; contagem `:35-42`, execução `:47-69` | RPC `count_legacy_storage_urls` (`:38`) + edge function `migrate-storage-paths` (`:50-53`), ambos existentes | Resultado real da migração = `NAO_VERIFICADO (runtime)` |

### Admin — Integrações e Configuração

| Funcionalidade | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
| :--- | :--- | :--- | :--- | :--- |
| Conectores ERP — listagem e log de sincronização | ✅ | UI `admin/ERPConnections.tsx:100-166` e `:180-211` ← queries `:26-48` | `supabase.from('erp_connections')` (`:30`) e `.from('erp_sync_log')` (`:41`) | — |
| Conectores ERP — botão "Sync Forn." | ✅ | `:149-158` → `syncMutation` `:50-66` → `supabase.functions.invoke('erp-sync', { action:'pull', entity:'fornecedor' })` (`:53-55`) | Edge function `erp-sync` (existe) | Só sincroniza a entidade fixa `'fornecedor'`; nenhum seletor de entidade na UI |
| Conectores ERP — 5 botões sem handler | 🟦 | "Configurar Nova Conexão" `:80-82`; "Documentação de API" `:119`; engrenagem por conexão `:159-161`; "Ver Log Completo" `:208-210`; "Configurar Campos" `:224` — nenhum tem `onClick` | Nenhuma | Toda a configuração de conexão/mapeamento é inexistente; a tela só lê e dispara um sync fixo |
| Conectores ERP — `organizationId` obtido e ignorado | 🟨 | `:23` desestrutura `organizationId` do `useAuth()`; nenhuma query o utiliza (`:30`, `:41` sem filtro de tenant) | — | Escopo por tenant depende inteiramente de RLS; se a RLS falhar, vaza entre organizações. `NAO_VERIFICADO (runtime)` |
| Catálogos PunchOut — listagem | ✅ | `admin/PunchOutCatalogs.tsx:62-98` ← query `:11-23` | `supabase.from('punchout_catalogs')` com join em `fornecedores` (`:15-19`) | — |
| Catálogos PunchOut — "Testar Setup" | 🟨 | `:88-90` → `handleLaunch` `:25-43` → `supabase.functions.invoke('punchout-setup')` (`:27`) | Edge function `punchout-setup` (existe) | Abre `data.mock_redirect` (`:37-39`) — o nome do campo declara que a edge function devolve destino **simulado**, não a sessão PunchOut real |
| Catálogos PunchOut — botões "Novo Catálogo" e engrenagem | 🟦 | `:52-54` e `:91-93` — sem `onClick` | Nenhuma | Não existe caminho para criar ou editar catálogo pela UI |
| SSO — configuração SAML (toggle, metadata URL, domínios) | ✅ | UI `admin/SSOConfig.tsx:111-217` → `upsertConfigMutation` `:36-54`; domínios `handleAddDomain` `:68-86` / `removeDomain` `:88-94` | `supabase.from('sso_configurations').upsert()` (`:39-43`), leitura filtrada por `tenant_id` (`:29`) | — |
| SSO — guarda de admin na própria página | ✅ | `SSOConfig.tsx:56-64` (early return quando `!isAdmin`), redundante com o guard de rota (`AppRoutes.tsx:125`) | — | — |
| SSO — botão "Gerar Token SCIM" | 🟦 | `:205-207` — sem `onClick` | Nenhuma | O provisionamento SCIM é anunciado (`:194`, endpoint em `:202`) mas não há como emitir credencial; a edge function `scim-v2` existe no repositório e fica inalcançável por esta tela |
| SSO — endpoints do SP hardcoded | 🟨 | `:264` e `:268` — `https://trwgmplubeqxrxpncdgf.supabase.co/...` literais no JSX, enquanto `:202` usa `window.location.origin` | — | Project ref fixo no código: quebra em qualquer outro ambiente/projeto Supabase |
| Workflow & Compliance — templates e regras SoD (leitura) | ✅ | UI `admin/WorkflowAdmin.tsx:112-148` e `:172-216` ← queries `:16-38` | `supabase.from("workflow_templates")` (`:20`) e `.from("workflow_sod_rules")` (`:32`) | Somente leitura |
| Workflow & Compliance — KPIs "Violações Bloqueadas" e "SLA de Aprovação" | 🟦 | `:85` → `<div>0</div>` literal; `:94` → `<div>--</div>` literal | Nenhuma | Métricas anunciadas como monitoramento de compliance e nunca calculadas. Os dois primeiros cards (`:67`, `:76`) são reais (contagem dos arrays) |
| Workflow & Compliance — 4 botões de escrita sem handler | 🟦 | "Novo Workflow" `:54-56`; "Configurar" `:136`; "Adicionar Regra" `:167-169`; "Editar" `:204` | Nenhuma | Nenhum caminho de criação/edição de workflow ou regra SoD existe; a tela é read-only apesar de se apresentar como editor |
| Workflow & Compliance — "Workflow Designer Canvas" | 🟦 | `:152-160` — bloco `border-dashed` com ícone e texto convidando a "selecionar um template para abrir o editor visual" | Nenhuma | O editor visual não existe; o alias de import na rota (`AppRoutes.tsx:58` chama o módulo de `WorkflowDesigner`) reforça a promessa não cumprida |
| Workflow & Compliance — aba "Monitoramento Realtime" | 🟦 | `:221-240` — dois cards com texto fixo "Nenhum workflow ativo no momento." e "Aguardando dados de telemetria."; nenhuma query, nenhum estado | Nenhuma | Aba inteiramente estática |
| Painel Fiscal — tabela de eventos | ✅ | `admin/FiscalDashboard.tsx:101-135` ← query `:11-23` | `supabase.from("fiscal_events")` (`:15`) | — |
| Painel Fiscal — 4 KPIs e 2 badges de status | 🟦 | `:60` (`128`), `:70` (`5`), `:80` (`2`), `:90` (`1.4s`), textos comparativos `:61` ("+12% em relação ao mês anterior") e `:91`; badges "SEFAZ: Online" `:48` e "Focus NFe: OK" `:49` | Nenhuma | Números e status de disponibilidade da SEFAZ **inventados no JSX**. Nada consulta contagem de NFe nem faz health-check do provedor |
| Sourcing Pipeline — pipeline e savings tracker | ✅ | `admin/SourcingPipeline.tsx:121-152` e `:161-197` ← queries `:11-38` | `supabase.from("sourcing_projects")` com join `categorias` (`:15-19`) e `.from("savings_tracker")` (`:31`) | — |
| Sourcing Pipeline — total realizado de savings | ✅ | `:56` (`reduce` sobre `actual_saving`), exibido em `:68` | Derivado de `savings_tracker` | — |
| Sourcing Pipeline — 5 métricas hardcoded | 🟦 | "Meta Q2: R$ 2.5M" `:67`; "8 em negociação final" `:80`; "Pipeline Value R$ 12.4M" `:89`; "Avg. Saving Target 14.2%" `:99` com benchmark "12.0%" `:100`; "Categorias Estratégicas 12" `:109` com "Matriz de Kraljic atualizada" `:110` | Nenhuma | 5 de 6 números da faixa superior são literais. Só "Projetos Ativos" (`:79`) é calculado |
| Sourcing Pipeline — imports mortos (`format`, `ptBR`) | 🟦 | `:7-8` — nenhum uso no arquivo | Nenhuma | — |
| Documentação técnica do desenvolvedor | 🟦 | `admin/DeveloperDocs.tsx:10-233` — os 4 documentos são **strings literais** embutidas no bundle; nada lê `DOCS/` em disco. "Copiar Path" (`:236-239`, `:305`) apenas copia um caminho de texto | Nenhuma | Conteúdo congelado no código: diverge do repositório real assim que `DOCS/` muda. Ver achado #2 |
| Documentação — botão "Ver Repo" | 🟦 | `:259` — `window.open('https://github.com', '_blank')`, sem owner/repo | Nenhuma | Abre a home do GitHub |
| Documentação — card "Status do Projeto" | 🟦 | `:381` ("Tipagem TS 100%"), `:384` (barra `w-[100%]`), `:388` ("Segurança RLS: Ativo"), `:392` ("Arquitetura: Modular") | Nenhuma | Selo de qualidade auto-atribuído, sem nenhuma medição por trás |
| Página 404 | ✅ | `pages/NotFound.tsx:8-64`; registra a rota inválida em `:11-13` (`logger.warn`), oferece volta para `/` (`:46`) e `history.back()` (`:53-54`) | N/A por natureza | Cores fixas `bg-[#0a0a0f]` / `text-white` (`:16`) ignoram o tema claro configurado em `App.tsx:63` |

---

## Achados graves

Ordenados por gravidade (impacto sobre decisão de negócio ou risco operacional).

1. **Painel Fiscal apresenta números fabricados como se fossem operação real.**
   `src/pages/admin/FiscalDashboard.tsx:60,70,80,90` exibem "128 NFe autorizadas", "5 pendentes",
   "2 erros/rejeições" e "1.4s de latência SEFAZ" — todos literais no JSX. Os badges
   "SEFAZ: Online" (`:48`) e "Focus NFe: OK" (`:49`) afirmam disponibilidade de sistemas externos
   sem nenhum health-check. Só a tabela inferior (`:121`, `fiscal_events`) é real. Um operador fiscal
   olhando essa tela conclui que há 2 rejeições a tratar quando o número não corresponde a nada.

2. **Sourcing Pipeline: 5 das 6 métricas estratégicas são literais.**
   `src/pages/admin/SourcingPipeline.tsx:67` ("Meta Q2: R$ 2.5M"), `:80` ("8 em negociação final"),
   `:89` ("R$ 12.4M"), `:99-100` ("14.2% vs 12.0% benchmark mercado"), `:109-110` ("12 categorias,
   Matriz de Kraljic atualizada"). São exatamente os números que uma diretoria usaria para decidir
   alocação de sourcing. Apenas `:79` (projetos ativos) e `:68` (savings realizado) vêm do banco.

3. **Workflow & Compliance se apresenta como editor mas é somente leitura.**
   Quatro botões de escrita sem handler: `src/pages/admin/WorkflowAdmin.tsx:54` (Novo Workflow),
   `:136` (Configurar), `:167` (Adicionar Regra), `:204` (Editar). O canvas prometido é um
   placeholder tracejado (`:152-160`) e a aba de monitoramento é texto fixo (`:221-240`). Pior:
   o KPI "Violações Bloqueadas" é `0` hardcoded (`:85`) — uma tela de compliance afirmando
   permanentemente que nenhuma segregação de funções foi violada, sem consultar nada.

4. **Provisionamento SCIM anunciado e inalcançável.**
   `src/pages/admin/SSOConfig.tsx:194-208` documenta a base URL do SCIM (`:202`) e oferece
   "Gerar Token SCIM" (`:205`) sem `onClick`. A edge function `scim-v2` existe no repositório
   (`supabase/functions/scim-v2`), portanto há backend construído que nenhuma tela consegue ativar.

5. **Project ref do Supabase hardcoded na configuração de SSO.**
   `src/pages/admin/SSOConfig.tsx:264` e `:268` fixam
   `https://trwgmplubeqxrxpncdgf.supabase.co/auth/v1/sso/saml/...` como ACS URL e Entity ID
   entregues ao cliente para configurar o IdP. Em staging ou em outro projeto, o administrador
   copia endpoints do ambiente errado. A mesma tela já sabe fazer certo em `:202`
   (`window.location.origin`).

6. **Bug de gravação: "Centro de Custo Pai = Nenhum" grava a string `"none"`.**
   `src/pages/configuracoes/ConfiguracoesCentroCusto.tsx:215` define `SelectItem value="none"`,
   e `:109` grava `parent_id: form.parent_id || null` — `"none"` é truthy, então vai literal para
   a coluna. Efeito no banco (rejeição por FK/uuid ou dado sujo) é `NAO_VERIFICADO (runtime)`.

7. **Layout do dashboard de compras é lido mas nunca gravado.**
   `src/pages/dashboard/ComprasDashboard.tsx:78` obtém `saveToDb` do store e `:96` só chama
   `loadFromDb('compras')`. `saveToDb` não aparece em nenhum outro ponto do arquivo. Combinado
   com o `DraggableDashboard` importado e nunca renderizado (`:30`) e com os 8 widgets do `switch`
   sem chamador (`:245-254`), a funcionalidade "dashboard personalizável" está pela metade:
   a infraestrutura existe, a UI que a acionaria nunca foi montada.

8. **Bug no relatório de simulação de telemetria.**
   `src/pages/admin-telemetria/AdminTelemetria.tsx:70` faz
   `toast.success(\`... ${data.error} falhas\`)`, mas o tipo declarado em `:32-37` não tem campo
   `error` — o toast imprime `undefined`. Na mesma tela, `:150` exibe "100% VALIDADO" como texto
   fixo, independentemente do que a edge function retornar.

9. **Botão "VER TUDO" das urgências é inerte.**
   `src/pages/dashboard/ComprasDashboard.tsx:216` — `onClick={() => {}}`. Fica no card de
   "Urgências Detectadas", exatamente onde o comprador clicaria sob pressão.

10. **Documentação técnica congelada no bundle e desatualizada.**
    `src/pages/admin/DeveloperDocs.tsx:11` e `:255` chamam o projeto de **"Freight Quest"** — este
    repositório é `promo-supply-v2` e a própria tela de login se identifica como "PROMO SUPPLY"
    (`src/pages/auth/AuthBranding.tsx:31`). Os 4 documentos são strings literais (`:10-233`), não
    leitura de `DOCS/`, então divergem do repositório por construção. O card "Status do Projeto"
    (`:381-392`) declara "Tipagem TS 100%" e "Segurança RLS: Ativo" sem medir nada.

11. **`ERPConnections` obtém `organizationId` e não o usa em nenhuma query.**
    `src/pages/admin/ERPConnections.tsx:23` vs. `:30` e `:41` (selects sem filtro de tenant).
    O isolamento fica 100% dependente de RLS. Estado real das políticas = `NAO_VERIFICADO (runtime)`.

12. **`PunchOutCatalogs` navega para um destino explicitamente simulado.**
    `src/pages/admin/PunchOutCatalogs.tsx:37-39` abre `data.mock_redirect`. O nome do campo
    devolvido pela edge function `punchout-setup` declara que a sessão PunchOut é fake.

13. **Compliance esconde o estado de carregamento.**
    `src/pages/compliance/ComplianceDashboard.tsx:35` declara `loading` e nunca o lê. Enquanto a
    query roda, a tabela exibe "Nenhum fornecedor encontrado" (`:246`) — um falso negativo em uma
    tela de risco contratual.

14. **Login com Google usa um caminho de auth paralelo.**
    `src/pages/auth/Auth.tsx:335-341` importa `@/integrations/lovable/index` e chama
    `lovable.auth.signInWithOAuth('google')`, enquanto todo o resto do app (`:107`, `:175`) usa
    `useAuth`/Supabase. Não há `navigate()` no caminho de sucesso — só tratamento de erro (`:340`).

15. **Página 404 ignora o tema.**
    `src/pages/NotFound.tsx:16` fixa `bg-[#0a0a0f] text-white`, enquanto `src/App.tsx:63` configura
    `ThemeProvider` com `defaultTheme="system"`. No tema claro, a tela de erro aparece escura.

---

## Rotas órfãs e páginas órfãs

**Rotas apontando para páginas inexistentes: NENHUMA.**
Extraí os 53 especificadores de `lazy(() => import("@/pages/..."))` de `AppRoutes.tsx:11-67`
e verifiquei a existência de cada arquivo `.tsx`. Todos os 53 resolvem:

`dashboard/ComprasDashboard`, `cotacao/Cotacao`, `solicitacoes/Solicitacoes`, `pedidos/Pedidos`,
`pagamentos/Pagamentos`, `fornecedores/Fornecedores`, `acompanhamento/Acompanhamento`,
`gerar-ordem/GerarOrdem`, `relatorios/Relatorios`, `relatorio-negociacoes/RelatorioNegociacoes`,
`aprovacoes/Aprovacoes`, `auditoria/Auditoria`, `fornecedores/SupplierPerformance`,
`dashboard/DashboardExecutivo`, `buyer/BuyerPerformanceDashboard`, `historico/HistoricoCompras`,
`contratos/Contratos`, `compliance/ComplianceDashboard`, `auth/Auth`, `seguranca/Seguranca`,
`catalogo-spot/CatalogoSpot`, `catalogo-xbz/CatalogoXbz`, `qualificacao/QualificacaoFornecedores`,
`orcamentos/Orcamentos`, `negociacao-ia/NegociacaoIA`, `kanban/KanbanWorkflow`,
`documentos/DocumentosFiscais`, `recompra/RecompraInteligente`, `devolucoes/Devolucoes`,
`catalogo-produtos/CatalogoProdutos`, `estoque/GestaoEstoque`, `sourcing/Sourcing`,
`sourcing/RFxCreate`, `sourcing/RFxDetails`, `sourcing/AuctionRoom`, `licitacoes/Licitacoes`,
`recebimento/RecebimentoOffline`, `admin-telemetria/AdminTelemetria`, `admin/DependencyHealth`,
`admin/SSOConfig`, `admin/PunchOutCatalogs`, `admin/ERPConnections`, `admin/FiscalDashboard`,
`admin/SourcingPipeline`, `admin/WorkflowAdmin`, `admin/DeveloperDocs`, `admin/StorageMigration`,
`admin/HealthDashboard`, `admin/AlertDetail`, `portal-fornecedor/PortalFornecedor`,
`configuracoes/ConfiguracoesCentroCusto`, `NotFound`, `dev/XbzNetworkPanelHarness`.

**Páginas órfãs no meu escopo: NENHUMA.**
Os únicos `.tsx` dos meus diretórios sem rota própria são subcomponentes, e cada um tem
importador comprovado por grep em todo `src/`:

| Arquivo | Importador comprovado |
| :--- | :--- |
| `src/pages/admin/AlertSubscriptionsPanel.tsx` | `src/pages/admin/HealthDashboard.tsx:22` (import) e `:788` (uso) |
| `src/pages/admin/ScanRunsSlaCard.tsx` | `src/pages/admin/HealthDashboard.tsx:23` (import) e `:652` (uso) |
| `src/pages/auth/AuthBranding.tsx` | `src/pages/auth/Auth.tsx:40` (import) e `:215` (uso) |
| `src/pages/admin/alertRunbooks.ts` | `src/pages/admin/AlertDetail.tsx:10` (import) e `:79` (uso) |
| `src/pages/admin-telemetria/telemetriaHelpers.ts` | `src/pages/admin-telemetria/AdminTelemetria.tsx:24` |
| `src/pages/compliance/complianceHelpers.ts` | `src/pages/compliance/ComplianceDashboard.tsx:30` |

**Observações sobre rotas (não são órfãs, mas merecem registro):**

- `AppRoutes.tsx:58` importa `@/pages/admin/WorkflowAdmin` com o alias local `WorkflowDesigner`.
  O alias promete um designer visual que não existe (ver achado #3). Renomear o alias ou o arquivo
  eliminaria a confusão.
- `AppRoutes.tsx:86-87`: `/cotacao` e `/cotacao/:id` montam **o mesmo componente** `Cotacao`,
  diferindo apenas no `variant` do `RouteSkeleton` (`"table"` vs `"form"`). Comportamento real
  depende do componente, que está fora deste lote.
- `AppRoutes.tsx:137`: `/configuracoes-centro-custo` é a única rota de configuração e **não** exige
  papel de admin, embora permita CRUD de orçamento e alçada de aprovação
  (`ConfiguracoesCentroCusto.tsx:110-111`). Proteção efetiva depende exclusivamente de RLS —
  `NAO_VERIFICADO (runtime)`.
- Rotas `/admin/*` protegidas por **duas** camadas: `ProtectedRoute` externo (`:83`) e
  `ProtectedRoute requiredRole="admin"` interno (`:123-134`). `SSOConfig` adiciona uma terceira
  checagem própria (`SSOConfig.tsx:56`). Redundante, mas não é defeito.

---

## Dados fictícios encontrados

Varredura explícita por `Math.random()`, `TODO`, `FIXME`, `stub`, `em breve`, `coming soon`,
`not implemented`, `mock`, `onClick={() => {}}` e flags de feature em todo o escopo.

**`Math.random()`: 0 ocorrências.**
**`TODO` / `FIXME` / `not implemented` / "em breve" / "coming soon": 0 ocorrências.**
**Feature flags desligadas: 0 ocorrências.**

O dado fictício deste lote não está em TODOs — está em **literais no JSX se passando por métrica**:

| Onde | Evidência | O que finge ser |
| :--- | :--- | :--- |
| Painel Fiscal — NFe autorizadas | `admin/FiscalDashboard.tsx:60-61` | `128` NFe + "+12% vs mês anterior" |
| Painel Fiscal — pendentes | `admin/FiscalDashboard.tsx:70-71` | `5` pendentes + "processamento automático ativo" |
| Painel Fiscal — erros | `admin/FiscalDashboard.tsx:80-81` | `2` rejeições + "ação manual necessária" |
| Painel Fiscal — latência | `admin/FiscalDashboard.tsx:90-91` | `1.4s` "latência SEFAZ em tempo real" |
| Painel Fiscal — disponibilidade externa | `admin/FiscalDashboard.tsx:48-49` | Badges "SEFAZ: Online" e "Focus NFe: OK" |
| Sourcing — meta trimestral | `admin/SourcingPipeline.tsx:67` | "Meta Q2: R$ 2.5M" |
| Sourcing — negociações | `admin/SourcingPipeline.tsx:80` | "8 em negociação final" |
| Sourcing — pipeline value | `admin/SourcingPipeline.tsx:89` | "R$ 12.4M" |
| Sourcing — saving target | `admin/SourcingPipeline.tsx:99-100` | "14.2%" vs "12.0% benchmark mercado" |
| Sourcing — categorias | `admin/SourcingPipeline.tsx:109-110` | "12" + "Matriz de Kraljic atualizada" |
| Workflow — violações SoD | `admin/WorkflowAdmin.tsx:85` | `0` violações bloqueadas |
| Workflow — SLA | `admin/WorkflowAdmin.tsx:94` | `--` |
| Telemetria — integridade da simulação | `admin-telemetria/AdminTelemetria.tsx:150` | "100% VALIDADO" |
| Segurança — políticas de sessão | `seguranca/Seguranca.tsx:208,216,224,232` | "24 horas", "Ativo", "TOTP + Email", "Por IP" |
| DeveloperDocs — status do projeto | `admin/DeveloperDocs.tsx:381,384,388,392` | "Tipagem TS 100%", barra `w-[100%]`, "RLS Ativo", "Modular" |
| DeveloperDocs — conteúdo dos 4 documentos | `admin/DeveloperDocs.tsx:10-233` | Documentação "do repositório", na verdade string no bundle, referindo-se a "Freight Quest" |
| PunchOut — destino da sessão | `admin/PunchOutCatalogs.tsx:37-39` | Campo `mock_redirect` da edge function `punchout-setup` |

**Botões renderizados sem handler (UI que promete ação inexistente):**

| Arquivo:linha | Rótulo |
| :--- | :--- |
| `dashboard/ComprasDashboard.tsx:216` | "VER TUDO" (`onClick={() => {}}`) |
| `admin/ERPConnections.tsx:80` | "Configurar Nova Conexão" |
| `admin/ERPConnections.tsx:119` | "Documentação de API" |
| `admin/ERPConnections.tsx:159` | engrenagem por conexão |
| `admin/ERPConnections.tsx:208` | "Ver Log Completo" |
| `admin/ERPConnections.tsx:224` | "Configurar Campos" |
| `admin/PunchOutCatalogs.tsx:52` | "Novo Catálogo" |
| `admin/PunchOutCatalogs.tsx:91` | engrenagem por catálogo |
| `admin/SSOConfig.tsx:205` | "Gerar Token SCIM" |
| `admin/WorkflowAdmin.tsx:54` | "Novo Workflow" |
| `admin/WorkflowAdmin.tsx:136` | "Configurar" (por template) |
| `admin/WorkflowAdmin.tsx:167` | "Adicionar Regra" |
| `admin/WorkflowAdmin.tsx:204` | "Editar" (por regra SoD) |
| `auth/Auth.tsx:448,450` | "Termos de Uso" e "Política de Privacidade" (`href="#"`) |

**Código morto / imports sem uso:**

| Arquivo:linha | Símbolo | Prova de ausência de uso |
| :--- | :--- | :--- |
| `dashboard/ComprasDashboard.tsx:30` | `DraggableDashboard` | grep no arquivo devolve só a linha do import |
| `dashboard/ComprasDashboard.tsx:33` | `FilterFavoritesManager` | idem |
| `dashboard/ComprasDashboard.tsx:47` | `SLADistributionChart` | idem (lazy nunca referenciado no `switch`) |
| `dashboard/ComprasDashboard.tsx:12,16,41` | `Link`, `Badge`, `performanceMonitor` | idem |
| `dashboard/ComprasDashboard.tsx:245-254` | 8 `case` do `switch` | único chamador (`:355-368`) nunca passa esses ids |
| `seguranca/Seguranca.tsx:1,3` | `useState`, `MainLayout` | sem uso no corpo do componente |
| `configuracoes/ConfiguracoesCentroCusto.tsx:2` | `MainLayout` | JSX abre em `PageTransition` (`:151`) |
| `admin/SourcingPipeline.tsx:7-8` | `format`, `ptBR` | sem uso |
| `admin/PunchOutCatalogs.tsx:1` | `React, { useState }` | nenhum estado local no componente |
| `admin/WorkflowAdmin.tsx:1` | `React` | JSX transform automático; `useState` é usado (`:14`) |
| `admin/DeveloperDocs.tsx:4` | `Layout as Architecture` | alias sem uso |
| `compliance/ComplianceDashboard.tsx:35` | variável `loading` | declarada, só `setLoading` é chamado (`:53`) |
| `dashboard/ComprasDashboard.tsx:78` | `saveToDb` | desestruturado, nunca invocado |
| `admin/ERPConnections.tsx:23` | `organizationId` | desestruturado, nenhuma query o usa |

---

## Verificação dos objetos de banco citados

Confirmei contra `src/integrations/supabase/types.ts` (tipos gerados) que **todos** os objetos
invocados pelas telas deste lote estão declarados. Isso prova que o nome existe no schema
tipado — **não** prova que a tabela tem linhas nem que a função executa: isso é
`NAO_VERIFICADO (runtime)`.

Tabelas/views: `query_telemetry`, `alert_subscriptions`, `system_alerts`, `health_scan_runs`,
`v_system_health_overview`, `sso_configurations`, `erp_connections`, `erp_sync_log`,
`punchout_catalogs`, `fiscal_events`, `sourcing_projects`, `savings_tracker`,
`workflow_templates`, `workflow_sod_rules`, `supplier_compliance_summary`,
`penalty_escalation_config`, `cost_centers`, `profiles`, `categorias`, `fornecedores`,
`audit_logs`, `user_filter_preferences`.

RPCs: `log_login_attempt`, `count_legacy_storage_urls`, `admin_scan_runs_sla_status`,
`alerts_severity_timeseries`, `alerts_mttr_by_type`, `alerts_noisy_scanners`, `resolve_alert`,
`get_compras_dashboard_metrics`, `is_account_locked`, `record_failed_login`,
`clear_login_lockout`, `current_tenant_id`.

Edge functions invocadas por este lote e presentes em `supabase/functions/`:
`system-simulation`, `health-dashboard`, `dependency-health`, `migrate-storage-paths`,
`erp-sync`, `punchout-setup`, `webauthn-authenticate`. Também existe `scim-v2`, cujo
acionamento pela UI está faltando (achado #4).

---

## Limites desta auditoria

- **Sem runtime e sem banco.** Nenhuma afirmação sobre volume de dados, execução de scanners,
  entrega de eventos realtime ou resposta de edge function foi feita como fato.
- **Fronteira do lote.** Telas que são apenas casca de composição — `Seguranca` (15 painéis de
  `components/security/`), `AdminTelemetria` (abas de `components/admin/telemetry/`),
  `ComplianceDashboard` (2 painéis de CRUD de `components/compras/`) — foram classificadas 🟨
  porque não consigo provar o fio de dados **dentro do meu escopo**. Isso é limite de recorte,
  não necessariamente defeito do código; o lote que cobre `src/components/` deve fechar a prova.
  A única exceção é `DashboardExecutivo`, onde segui a cadeia até
  `src/hooks/useExecutiveDashboardData.ts:33` e pude marcar ✅ com evidência.
- **RLS não auditada.** Várias telas deste lote consultam tabelas sem filtro explícito de tenant
  (`ERPConnections.tsx:30,41`; `HealthDashboard.tsx:148,210` — este último documentado como
  system-wide intencional em `:146` e `:208`). Se o isolamento está correto depende das políticas
  no banco: `NAO_VERIFICADO (runtime)`.
- **Não executei build, lint nem testes.** Os imports mortos listados vêm de grep por símbolo no
  arquivo, não de saída de linter.

---

## ARQUIVOS LIDOS

/home/user/promo-supply-v2/src/App.tsx
/home/user/promo-supply-v2/src/main.tsx
/home/user/promo-supply-v2/src/index.css
/home/user/promo-supply-v2/src/vite-env.d.ts
/home/user/promo-supply-v2/src/routes/AppRoutes.tsx
/home/user/promo-supply-v2/src/pages/NotFound.tsx
/home/user/promo-supply-v2/src/pages/admin/AlertDetail.tsx
/home/user/promo-supply-v2/src/pages/admin/AlertSubscriptionsPanel.tsx
/home/user/promo-supply-v2/src/pages/admin/DependencyHealth.tsx
/home/user/promo-supply-v2/src/pages/admin/DeveloperDocs.tsx
/home/user/promo-supply-v2/src/pages/admin/ERPConnections.tsx
/home/user/promo-supply-v2/src/pages/admin/FiscalDashboard.tsx
/home/user/promo-supply-v2/src/pages/admin/HealthDashboard.tsx
/home/user/promo-supply-v2/src/pages/admin/PunchOutCatalogs.tsx
/home/user/promo-supply-v2/src/pages/admin/SSOConfig.tsx
/home/user/promo-supply-v2/src/pages/admin/ScanRunsSlaCard.tsx
/home/user/promo-supply-v2/src/pages/admin/SourcingPipeline.tsx
/home/user/promo-supply-v2/src/pages/admin/StorageMigration.tsx
/home/user/promo-supply-v2/src/pages/admin/WorkflowAdmin.tsx
/home/user/promo-supply-v2/src/pages/admin/alertRunbooks.ts
/home/user/promo-supply-v2/src/pages/admin/__tests__/alertRunbooks.test.ts
/home/user/promo-supply-v2/src/pages/admin-telemetria/AdminTelemetria.tsx
/home/user/promo-supply-v2/src/pages/admin-telemetria/telemetriaHelpers.ts
/home/user/promo-supply-v2/src/pages/admin-telemetria/__tests__/telemetriaHelpers.test.ts
/home/user/promo-supply-v2/src/pages/auth/Auth.tsx
/home/user/promo-supply-v2/src/pages/auth/AuthBranding.tsx
/home/user/promo-supply-v2/src/pages/dashboard/ComprasDashboard.tsx
/home/user/promo-supply-v2/src/pages/dashboard/DashboardExecutivo.tsx
/home/user/promo-supply-v2/src/pages/auditoria/Auditoria.tsx
/home/user/promo-supply-v2/src/pages/seguranca/Seguranca.tsx
/home/user/promo-supply-v2/src/pages/compliance/ComplianceDashboard.tsx
/home/user/promo-supply-v2/src/pages/compliance/complianceHelpers.ts
/home/user/promo-supply-v2/src/pages/compliance/__tests__/complianceHelpers.test.ts
/home/user/promo-supply-v2/src/pages/configuracoes/ConfiguracoesCentroCusto.tsx

### Arquivos fora do escopo consultados parcialmente (grep dirigido, não leitura integral)

Consultados apenas para fechar a cadeia de evidência de camada de dados. **Não** os audito aqui;
listo por transparência para que a recontagem do meu escopo não os inclua.

/home/user/promo-supply-v2/src/features/auth/components/ProtectedRoute.tsx (linhas 9, 12, 30)
/home/user/promo-supply-v2/src/hooks/useDashboardKPIs.ts (linha 75)
/home/user/promo-supply-v2/src/hooks/useAccountFilters.ts (linhas 62, 89, 166, 222)
/home/user/promo-supply-v2/src/hooks/useSecurityLogs.ts (linhas 80-159, 245)
/home/user/promo-supply-v2/src/hooks/useAccountLockout.ts (linhas 46, 76, 120)
/home/user/promo-supply-v2/src/hooks/useWebAuthn.ts (linhas 62, 185, 231, 284)
/home/user/promo-supply-v2/src/hooks/useExecutiveDashboardData.ts (linhas 1-110)
/home/user/promo-supply-v2/src/components/compras/ExecutiveDashboard.tsx (linhas 1-99)
/home/user/promo-supply-v2/src/services/auditService.ts (linhas 21, 37, 62)
/home/user/promo-supply-v2/src/integrations/lovable/index.ts (linhas 14-15)
/home/user/promo-supply-v2/src/integrations/supabase/types.ts (grep de nomes de tabela e RPC)
/home/user/promo-supply-v2/supabase/functions/ (listagem de diretórios)
