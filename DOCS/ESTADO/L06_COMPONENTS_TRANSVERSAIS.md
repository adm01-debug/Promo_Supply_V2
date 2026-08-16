# L06 — Componentes Transversais

Escopo auditado: todos os diretórios de `src/components/` **exceto** `compras/`; `ui/` auditado apenas em altitude.
Data da auditoria: 2026-08-16. Método: leitura de código + grep de importadores em todo `src/`. Nada foi aceito de README/DOCS/comentários.

**Limite declarado:** não houve acesso ao banco nem execução da aplicação. Toda afirmação sobre *conteúdo* de tabelas é `NAO_VERIFICADO (runtime)`. O que foi verificado é a existência de **produtores e consumidores no código** — que é o que determina se uma tabela pode ter dados.

---

## Resumo

Unidades classificadas: **68** (componentes/funcionalidades exportadas fora de `compras/` e `ui/`).

| Classificação | Qtd | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 33 / 68 | 48,5% |
| 🟨 IMPLEMENTADO_PARCIAL | 21 / 68 | 30,9% |
| 🟦 SUGERIDO_OU_INICIADO | 3 / 68 | 4,4% |
| ⬛ MORTO_OU_ABANDONADO | 11 / 68 | 16,2% |

Por diretório:

| Diretório | ✅ | 🟨 | 🟦 | ⬛ | Total |
|---|---|---|---|---|---|
| `security/` | 4 | 11 | 0 | 1 | 16 |
| `accessibility/` | 5 | 2 | 0 | 2 | 9 |
| `pagamentos/` | 9 | 0 | 0 | 0 | 9 |
| `admin/` | 5 | 2 | 2 | 0 | 9 |
| `navigation/` | 5 | 0 | 0 | 0 | 5 |
| `mobile/` | 3 | 0 | 0 | 1 | 4 |
| `atoms/` | 1 | 0 | 1 | 2 | 4 |
| `onboarding/` | 1 | 2 | 0 | 0 | 3 |
| `organisms/` | 2 | 0 | 0 | 1 | 3 |
| `animations/` | 0 | 2 | 0 | 0 | 2 |
| `molecules/` | 0 | 0 | 0 | 2 | 2 |
| `settings/` | 2 | 0 | 0 | 0 | 2 |
| `notifications/` | 0 | 1 | 0 | 0 | 1 |
| `licitacoes/` | 0 | 1 | 0 | 0 | 1 |
| `pwa/` | 1 | 0 | 0 | 0 | 1 |
| `fornecedores/` | 0 | 0 | 0 | 1 | 1 |
| `pedidos/`, `feedback/`, `filters/`, `layout/`, raiz | 5 | 0 | 0 | 0 | 5 |

`ui/` (7.968 linhas) tratado separadamente — ver seção de altitude.

---

## Features transversais (segurança, PWA, a11y, push, onboarding, mobile)

| Feature | Classificação | Ponto de entrada na UI | Evidência (arquivo:linha) | Flag |
|---|---|---|---|---|
| **WebAuthn — registro de passkey** | 🟨 PARCIAL | `/seguranca` → aba "Passkeys" (`src/pages/seguranca/Seguranca.tsx:113,184`) | Fio completo: `PasskeyManager.tsx:43` → `useWebAuthn.ts:86,139` (`supabase.functions.invoke('webauthn-register')`) → `supabase/functions/webauthn-register/index.ts:189` (`insert` em `webauthn_credentials`). **Falta:** nenhuma verificação de attestation; `public_key` grava o `attestationObject` bruto (`webauthn-register/index.ts:192`), não a chave COSE. | Nenhuma |
| **WebAuthn — login por passkey** | 🟨 PARCIAL (grave) | `/auth` → botão passkey (`src/pages/auth/Auth.tsx:365`) | `useWebAuthn.ts:185,231` → `webauthn-authenticate/index.ts:195` (`auth.admin.generateLink`). **Falta:** a palavra `signature` não existe no arquivo — só compara `clientData.challenge` (`webauthn-authenticate/index.ts:170`) e `clientData.type` (`:173`). Ver Achados Graves #1. | Nenhuma |
| **MFA / TOTP** | 🟨 PARCIAL | `/seguranca` → aba "MFA" (`Seguranca.tsx:117,190`) | Real: `useMFA.ts:47` (`supabase.auth.mfa.enroll`), `:74` (`mfa.verify`), persistência em `mfa_settings` (`useMFA.ts:84`). **Falta:** QR nunca é exibido (`MFASettings.tsx:30`), códigos de backup inúteis (`useMFA.ts:183`), MFA nunca exigido no login (`verifyMFA`/`checkMFARequired` sem chamador — `useMFA.ts:217,220`). Ver Achados #2, #3, #4. | Nenhuma |
| **Bloqueio de IP / whitelist de IP** | 🟨 PARCIAL | `/seguranca` → abas "Bloqueados"/"Whitelist" (`Seguranca.tsx:129-137`) | CRUD real: `useSecurityLogs.ts:174,194,207,225`. **Falta:** `is_ip_blocked` definida em `supabase/migrations/20251231120356_...sql:231` tem **zero chamadores** em `src/` e `supabase/functions/`. O comentário "Check if IP is blocked before attempting login" em `src/pages/auth/Auth.tsx:104` não é seguido de nenhuma checagem — a linha seguinte é `const userAgent`. | Nenhuma |
| **Geo-restrição (países)** | 🟨 PARCIAL | `/seguranca` → abas "Geo"/"Países bloqueados" (`Seguranca.tsx:138-145`) | CRUD real: `useGeoRestriction.ts:88,107,125,140`; `BlockedCountriesPanel.tsx:51,75`. **Falta:** nenhum código lê `allowed_countries`/`blocked_countries` para negar acesso (grep em `supabase/functions/` e `src/features/auth`: 0 ocorrências). | Nenhuma |
| **Logs de acesso geográfico** | 🟨 PARCIAL | `/seguranca` → aba "Geo Logs" (`Seguranca.tsx:146`) | Leitura real: `GeoAccessLogsPanel.tsx:33` (`from('geo_access_logs')`). **Falta:** nenhum `INSERT` em `geo_access_logs` no repositório inteiro — só uma policy RLS (`supabase/migrations/20260108121914_...sql:73`). Painel estruturalmente vazio. | Nenhuma |
| **Sessões ativas** | 🟨 PARCIAL | `/seguranca` → aba "Sessões" (`Seguranca.tsx:121,250`) | Leitura real: `useSecurityLogs.ts:158`. **Falta:** nenhum produtor de `active_sessions`; só triggers de sanitização `BEFORE INSERT` (`supabase/migrations/20260403111210_...sql:8`). | Nenhuma |
| **Rate limiting** | ✅ TOTAL | `/seguranca` → aba "Rate Limit" (`Seguranca.tsx:156`) | Leitura: `useSecurityLogs.ts:142`. Escrita real: `supabase/functions/_shared/rate_limit.ts:27` (`rpc("check_rate_limit")`) → `supabase/migrations/20260711150417_...sql:68,76` insere em `rate_limit_logs`. Consumido por ≥10 edge functions (ex.: `webauthn-register`, `spot-api`, `erp-sync`). | Nenhuma |
| **PWA (instalação + offline)** | ✅ TOTAL | Prompt global montado em `src/App.tsx:71` | `PWAInstallPrompt.tsx:44` (`beforeinstallprompt`), `:58` (`deferredPrompt.prompt()`); SW real: `vite.config.ts:34` (`VitePWA`, `registerType:"autoUpdate"`), registro em `src/main.tsx:6,38` (`registerSW`); manifesto e ícones em `public/manifest.webmanifest`, `public/pwa-192x192.png`. | Nenhuma |
| **Notificações push (browser)** | 🟨 PARCIAL (grave) | `/seguranca` → aba "Notificações" (`Seguranca.tsx:109,179`) | Assina de verdade: `useRealPushNotifications.ts:90` (`pushManager.subscribe`) e grava em `push_subscriptions` (`:103`). **Falta:** chave VAPID **placeholder pública hardcoded** (`useRealPushNotifications.ts:86`, com o comentário "In production, this would come from your backend"); e `supabase/functions/send-push-notification/index.ts` tem **zero invocadores** (grep `send-push-notification` fora da própria pasta: só `_shared/contracts.ts:146`). Ver Achado #5. | Nenhuma |
| **Notificação de teste** | 🟨 PARCIAL | Botão "Testar Notificação" (`NotificationSettingsPanel.tsx:268`) | Usa `new Notification(...)` local (`NotificationSettingsPanel.tsx:39`) — não exercita o caminho de push server→cliente. Indica sucesso sem provar entrega remota. | Nenhuma |
| **Acessibilidade (painel + estilos)** | 🟨 PARCIAL | Botão flutuante global (`src/App.tsx:72`) **e** header (`src/features/layout/components/HeaderActions.tsx:81`) | Real: persiste em localStorage (`AdvancedAccessibility.tsx:59`), aplica classes no `<html>` (`:67-73`), CSS injetado (`AccessibilityStyles.tsx:79`), filtros SVG para daltonismo (`:82-91`). **Falta:** (a) `AccessibilityPanel` montado **duas vezes** → dois botões e IDs SVG duplicados (`#protanopia-filter` etc.); (b) fonte OpenDyslexic referenciada (`AccessibilityStyles.tsx:53`) mas nunca carregada — 0 `@font-face`/link no repo → cai em Comic Sans. | Nenhuma |
| **Skip links / leitor de tela** | ✅ TOTAL | `SkipToContent` em `src/App.tsx:70`; `SkipLinks` em `MainLayout.tsx` | Alvo `#main-content` existe (`src/App.tsx:24`); `announceToScreenReader` cria live region real (`AdvancedAccessibility.tsx:85-95`). | Nenhuma |
| **Onboarding / tour guiado** | 🟨 PARCIAL | `/dashboard-executivo` (`src/routes/AppRoutes.tsx:98`) → `DashboardExecutivo.tsx:7,13` | Fio real: `useTourPreferences` grava em `user_tour_preferences` (`src/hooks/useTourPreferences.ts:88,119,149`) com fallback localStorage (`:82,104`). **Falta:** de **21 alvos** `data-tour` definidos (`tourStepDefinitions.ts:11-167`) só **3** existem no JSX (`sidebar`, `notifications`, `pedidos-kpis`). Ver Achado #6. | Nenhuma |
| **Tours de cotação/fornecedor/pedidos/solicitações** | 🟨 PARCIAL | **Nenhum** | `cotacaoTourSteps`, `fornecedorTourSteps`, `pedidosTourSteps`, `solicitacoesTourSteps` (`tourStepDefinitions.ts:47,72,104,136`) — grep em `src/`: consumidos só por `__tests__/tourStepDefinitions.test.ts` e pelo re-export em `OnboardingTour.tsx:472`. Nenhuma página os passa a `<OnboardingTour>`. | Nenhuma |
| **Mobile — bottom nav + badges** | ✅ TOTAL | `MainLayout.tsx` (montado no layout autenticado) | `BottomNavigation.tsx:40-42` conta `solicitacoes`/`pedidos`/`pagamentos` via Supabase `count:'exact'`, refetch 30s (`:52`); navegação real (`:97`). | Nenhuma |
| **Mobile — pull-to-refresh** | ✅ TOTAL | `MainLayout.tsx:154` | `MobileRefreshWrapper.tsx:43` usa `usePullToRefresh` (touch real: `useMobileGestures.ts:202`); handler invalida queries ativas (`MainLayout.tsx:58`). | Nenhuma |
| **Mobile — swipe actions** | ✅ TOTAL | Cards de pedidos/pagamentos/solicitações | `SwipeableListItem.tsx` consumido por `PedidoMobileCard.tsx`, `PagamentoMobileCard.tsx`, `compras/SolicitacaoCard.tsx`; háptico real via `navigator.vibrate` (`useMobileGestures.ts:212`). | Nenhuma |
| **Feature flags (infraestrutura)** | ⬛ INEXISTENTE | — | `.env.example:18-19` declara `VITE_ENABLE_ANALYTICS`/`VITE_ENABLE_DEBUG`, mas o grep de `import.meta.env.*` em todo `src/` retorna **apenas** `DEV`, `PROD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. **Nenhum componente deste lote é controlado por flag.** | — |

---

## Tabela de evidências

### security/

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `PasskeyManager` | 🟨 | `PasskeyManager.tsx:43,57,70`; edge fn `webauthn-register/index.ts:189` | `pages/seguranca/Seguranca.tsx:184` | Verificação de attestation; `public_key` armazenado errado (`webauthn-register/index.ts:192`) |
| `MFASettings` | 🟨 | `MFASettings.tsx:25,39,117`; `useMFA.ts:47,74,84` | `Seguranca.tsx:190` | QR nunca renderizado (`MFASettings.tsx:30` vs `:63`); backup codes com `Math.random()` (`useMFA.ts:183`) em plaintext e sem consumidor |
| `RateLimitDashboard` | ✅ | `RateLimitDashboard.tsx:7`; `useSecurityLogs.ts:142`; produtor `_shared/rate_limit.ts:27` | `Seguranca.tsx:156` | — |
| `PasswordStrengthIndicator` | ✅ | `PasswordStrengthIndicator.tsx:46` (HIBP k-anonymity, `api.pwnedpasswords.com`) | `pages/auth/Auth.tsx:414`; bloqueia signup em `Auth.tsx:151` | — (nota: o 1º arg `isStrong` é descartado em `Auth.tsx:416`) |
| `PermissionMatrix` | ✅ | `PermissionMatrix.tsx:62,71` (`upsert`/`delete` em `role_permissions`); `usePermissions.ts:47` | `Seguranca.tsx` (aba "permissions", `:166`) | — |
| `PermissionGate` | ✅ | `PermissionGate.tsx:22,50` | `Seguranca.tsx:129,151`; `pages/admin/DeveloperDocs.tsx` | — (bypass total para admin em `:26` é intencional mas amplo) |
| `withPermission` (HOC) | ⬛ | `PermissionGate.tsx:58` | **Ninguém** — grep `withPermission` em `src/`: só a própria definição | Sem chamador |
| `ActiveSessionsPanel` | 🟨 | `ActiveSessionsPanel.tsx:8`; `useSecurityLogs.ts:158,236` | `Seguranca.tsx:250` | Zero produtores de `active_sessions` |
| `LoginAttemptsPanel` | 🟨 | `LoginAttemptsPanel.tsx:8`; `useSecurityLogs.ts:96` | `Seguranca.tsx:152` | Produtor existe (`pages/auth/Auth.tsx:112`) mas envia `_ip_address: ''` (`Auth.tsx:114`) → coluna IP sempre vazia e auto-bloqueio por IP (migration `20251231120356:310`) agiria sobre string vazia |
| `SecurityLogsPanel` | 🟨 | `SecurityLogsPanel.tsx:8`; `useSecurityLogs.ts:80` | `Seguranca.tsx:160` | Único produtor de `security_logs` é `webauthn-authenticate/index.ts:218`; login/logout/permissão não geram evento |
| `BlockedIPsPanel` | 🟨 | `BlockedIPsPanel.tsx:12`; `useSecurityLogs.ts:174,194` | `Seguranca.tsx:130` | Sem enforcement (`is_ip_blocked` sem chamador) |
| `IPWhitelistPanel` | 🟨 | `IPWhitelistPanel.tsx:10`; `useSecurityLogs.ts:207,225` | `Seguranca.tsx:134` | Sem enforcement (`is_ip_whitelisted` definida em migration `20251231120356:246`, sem chamador) |
| `BlockedCountriesPanel` | 🟨 | `BlockedCountriesPanel.tsx:40,51,75` | `Seguranca.tsx:142` | Sem enforcement |
| `GeoWhitelistPanel` | 🟨 | `GeoWhitelistPanel.tsx:13,26`; `useGeoRestriction.ts:55,88,107` | `Seguranca.tsx:138` | Sem enforcement |
| `GeoAccessLogsPanel` | 🟨 | `GeoAccessLogsPanel.tsx:33` | `Seguranca.tsx:146` | Zero produtores de `geo_access_logs` |
| `PasswordResetRequestsPanel` | 🟨 | `PasswordResetRequestsPanel.tsx:46,60,66`; `usePasswordResetRequests.ts:79,99,102` | `Seguranca.tsx:125` | `reset_token` é gerado (`usePasswordResetRequests.ts:99`) e gravado (`:108`) mas **nunca lido** — grep `reset_token` fora do hook: 0 → aprovar não redefine senha alguma |

### accessibility/

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `AccessibilityProvider` | ✅ | `AdvancedAccessibility.tsx:55,59,67-73` | `src/App.tsx:67` | — |
| `accessibilityHelpers` | ✅ | `accessibilityHelpers.ts` (sanitize + hidratação) | `AdvancedAccessibility.tsx:30`; `src/main.tsx` (chave de storage) | — (com testes: `__tests__/accessibilityHelpers.test.ts`) |
| `AccessibilityPanel` | 🟨 | `AdvancedAccessibility.tsx:113` | `src/App.tsx:72` **e** `HeaderActions.tsx:81` | Montagem dupla → 2 botões flutuantes + IDs SVG duplicados |
| `AccessibilityStyles` | 🟨 | `AccessibilityStyles.tsx:53,79,82-91` | `AdvancedAccessibility.tsx:101` | OpenDyslexic nunca carregada (0 `@font-face` no repo) |
| `SkipToContent` | ✅ | `AdvancedAccessibility.tsx:337`; alvo em `src/App.tsx:24` | `src/App.tsx:70` | — |
| `SkipLinks` | ✅ | `SkipLinks.tsx` | `features/layout/components/MainLayout.tsx` | — |
| `VisuallyHidden` | ✅ | `VisuallyHidden.tsx:1` | `features/layout/components/AdvancedSearch.tsx` | — |
| `LiveRegion` (×2 definições) | ⬛ | `AdvancedAccessibility.tsx:357` **e** `VisuallyHidden.tsx` (duplicado) | **Ninguém** — grep `<LiveRegion`/`import ... LiveRegion`: 0 fora das definições | Definido duas vezes, usado zero vezes |
| `useFocusTrap` | ⬛ | `AdvancedAccessibility.tsx:375` | **Ninguém** — grep `useFocusTrap(`: 0 | Sem chamador |

### admin/

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `TenantSwitcher` | ✅ | `TenantSwitcher.tsx:15,46`; `features/auth/hooks/useAuth.tsx:94,245` | `HeaderActions.tsx:56` | — (auto-oculta com ≤1 tenant, `:17`) |
| `DependencyHealthBadge` | 🟨 | `DependencyHealthBadge.tsx:107` (`fetch("/dependency-health.json")`) | `HeaderActions.tsx:59` (lazy) | Arquivo é **estático versionado** (`public/dependency-health.json`) com `generatedAt: "2026-08-31"` — data no futuro; nenhum script em `scripts/` o gera |
| `InstallReportPanel` | 🟦 | `InstallReportPanel.tsx:31` (`fetch("/install-report.json")`) | `pages/admin/DependencyHealth.tsx:5` | **`public/install-report.json` não existe** → `throw new Error("HTTP 404")` (`:32`) sempre |
| `DateFnsUsagePanel` | 🟦 | `DateFnsUsagePanel.tsx:40` (`fetch("/datefns-usage.json")`) | `pages/admin/DependencyHealth.tsx:4` | **`public/datefns-usage.json` não existe** → sempre 404 |
| `InstallReportHelp` | ✅ | `InstallReportHelp.tsx` (texto estático de ajuda) | `pages/admin/DependencyHealth.tsx:6` | — |
| `RefreshNowHelp` | ✅ | `RefreshNowHelp.tsx:31` | `pages/admin/DependencyHealth.tsx:7` | — (descreve a edge fn `dependency-health`, que é de fato invocada em `pages/admin/DependencyHealth.tsx:47,76,188`) |
| `AppLogsView` | ✅ | `AppLogsView.tsx:38` (`from("telemetry_logs")`); produtor `supabase/functions/telemetry/index.ts:81` | `pages/admin-telemetria/AdminTelemetria.tsx` | — |
| `SystemAlertsView` | 🟨 | `SystemAlertsView.tsx:29,41`; produtores reais em `xbz-sync-pedidos/index.ts:156` e ≥4 migrations | `pages/admin-telemetria/AdminTelemetria.tsx` | `resolved_by` comentado (`SystemAlertsView.tsx:45`) → resolução sem autoria |
| `TelemetryCharts` | ✅ | `TelemetryCharts.tsx` (deriva das props dos views acima) | `pages/admin-telemetria/AdminTelemetria.tsx` | — |

### pagamentos/ — todos com fio completo

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome |
|---|---|---|---|
| `PagamentoDetailModal` | ✅ | `PagamentoDetailModal.tsx:21,40` (`useQuery` + supabase) | `pages/pagamentos/Pagamentos.tsx` |
| `ThreeWayMatchPanel` | ✅ | `ThreeWayMatchPanel.tsx:17,21,32` (busca NF + pedido reais) | `PagamentoDetailModal.tsx` |
| `PagamentoScheduleModal` | ✅ | `PagamentoScheduleModal.tsx:35`; persistência em `Pagamentos.tsx:281` (`bulkUpdateStatus`) | `pages/pagamentos/Pagamentos.tsx:276` |
| `PagamentoExportPanel` | ✅ | `PagamentoExportPanel.tsx:29-37` (CSV com BOM), `:53-59` (JSON) — Blob + download real | `pages/pagamentos/Pagamentos.tsx` |
| `PagamentoAdvancedFilters` + `applyAdvancedFilters` | ✅ | `PagamentoAdvancedFilters.tsx:221-233` | `pages/pagamentos/Pagamentos.tsx`; testado em `__tests__/applyAdvancedFilters.test.ts` |
| `PagamentoAdvancedKPIs` | ✅ | deriva de `Pagamento[]` real (`usePagamentos`) | `pages/pagamentos/Pagamentos.tsx` |
| `PagamentoFinancialDashboard` | ✅ | idem | `pages/pagamentos/Pagamentos.tsx` |
| `PagamentoNotificationsWidget` | ✅ | idem | `pages/pagamentos/Pagamentos.tsx` |
| `PagamentoMobileCard` | ✅ | usa `SwipeableListItem` real | `pages/pagamentos/Pagamentos.tsx` |

### navigation/ · mobile/ · demais

| Componente | Classificação | Evidência (arquivo:linha) | Quem consome | O que falta |
|---|---|---|---|---|
| `RouteSkeleton` | ✅ | `RouteSkeleton.tsx:16,43` | `routes/AppRoutes.tsx` (~50 rotas) | — |
| `BackToTop` | ✅ | `BackToTop.tsx:14,27` (scroll real + háptico) | `MainLayout.tsx` | — |
| `NavigationProgressBar` | ✅ | `NavigationProgressBar.tsx:12,20-33` | `MainLayout.tsx` | — (progresso 30→100 é temporizado, não real; cosmético por design) |
| `SmartBackButton` | ✅ | `SmartBackButton.tsx:8` (`useNavigation`) | `MainLayout.tsx`; `hooks/useNavigation.tsx` | — |
| `ModernBreadcrumbs` | ✅ | `ModernBreadcrumbs.tsx` | `SmartBackButton.tsx` | — |
| `BottomNavigation` | ✅ | `BottomNavigation.tsx:40-42,97` | `MainLayout.tsx` | — (campo `badgeKey:'aprovacoes'` declarado em `:27` e calculado em `:49` mas nenhum item o usa) |
| `MobileRefreshWrapper` | ✅ | `MobileRefreshWrapper.tsx:33,43` | `MainLayout.tsx:154` | — |
| `SwipeableListItem` | ✅ | `SwipeableListItem.tsx:5` | 4 cards mobile | — |
| `SwipeableTableRow` | ⬛ | `SwipeableListItem.tsx` (export) | **Ninguém** — grep `<SwipeableTableRow`: 0 | Sem chamador |
| `GlobalErrorBoundary` | ✅ | `GlobalErrorBoundary.tsx:63` → `lib/logger.ts:117` (`functions.invoke("telemetry")`) | `src/App.tsx:75` | — (mas o texto "equipe já foi notificada" (`:22`) é falso para usuário deslogado: `logger.ts:114` descarta o batch sem sessão) |
| `ConfirmClearFiltersDialog` | ✅ | `ConfirmClearFiltersDialog.tsx` | `hooks/useClearFiltersFlow.tsx` | — |
| `EliteBackground` | ✅ | `EliteBackground.tsx:3-7` | `MainLayout.tsx`; `pages/auth/AuthBranding.tsx` | — |
| `PrefetchLink` (raiz) | ✅ | `PrefetchLink.tsx:30,33` (chunk + dados) | `features/layout/components/AppSidebar.tsx:196,410,431` | — |
| `PedidoMobileCard` | ✅ | `PedidoMobileCard.tsx` | `pages/pedidos/Pedidos.tsx` | — |
| `FornecedorMobileCard` | ⬛ | `FornecedorMobileCard.tsx:1` (289 linhas) | **Ninguém** — grep `<FornecedorMobileCard`/`import ... FornecedorMobileCard`: 0 | Irmão direto de `PedidoMobileCard`/`PagamentoMobileCard`, que estão em uso; este ficou para trás |
| `ReverseAuctionRoom` | 🟨 | `ReverseAuctionRoom.tsx:20,25`; `useLicitacoes.ts:299,312,332` (`licitacao_lances` + canal realtime) | `pages/licitacoes/Licitacoes.tsx:86` | Wiring de demo: `userFornecedorId={fornecedores[0]?.id} // For demo purposes, use first supplier` (`pages/licitacoes/Licitacoes.tsx:88`) — o lance é sempre atribuído ao 1º fornecedor da lista |
| `FeedbackSettingsPanel` | ✅ | `FeedbackSettingsPanel.tsx:7`; `hooks/useFeedback.ts:20` (zustand `persist`), `:36,50` (padrões háptico/áudio) | `HeaderActions.tsx:97` | — |
| `TourSettingsPanel` | ✅ | `TourSettingsPanel.tsx:4` (`useAllTourPreferences`) → `useTourPreferences.ts:192,221,239` | `Seguranca.tsx:171` | — |
| `OnboardingTour` | 🟨 | `OnboardingTour.tsx:37,79,469` | `pages/dashboard/DashboardExecutivo.tsx:13` | 18 de 21 alvos `data-tour` inexistentes |
| `tourStepDefinitions` | 🟨 | `tourStepDefinitions.ts:11-167` | só `dashboardTourSteps` chega à UI | 4 conjuntos de tour sem página consumidora |
| `TourVisualComponents` | ✅ | `TourVisualComponents.tsx:11-19` (`Math.random` = confete, legítimo) | `OnboardingTour.tsx:11` | — |
| `MotionComponents` | 🟨 | `MotionComponents.tsx` (327 linhas, 18 exports) | só `AnimatedCounter` (4 arquivos) e `PageTransition` (3 páginas) | 16 exports mortos — ver seção Órfãos |
| `motionVariants` | 🟨 | `motionVariants.ts` | só `MotionComponents.tsx` + testes | Variantes existem para exports mortos |
| `EliteButton` | ✅ | `EliteButton.tsx` | 13 páginas/componentes | — |
| `EliteCardGrid` | ✅ | `EliteCardGrid.tsx:15` | 3 páginas | — |
| `ElitePageWrapper` | ✅ | `ElitePageWrapper.tsx:12` | 11 páginas | — |
| `Atom` | ⬛ | `atoms/Atom.tsx:8` | só `molecules/Molecule.tsx:13` (que também está morto) | Cadeia transitivamente morta |
| `Molecule` | ⬛ | `molecules/Molecule.tsx:11` | só `organisms/Organism.tsx:1` (morto) | Cadeia transitivamente morta |
| `Organism` | ⬛ | `organisms/Organism.tsx:11` | **Ninguém** | Raiz da cadeia Atom→Molecule→Organism, sem consumidor |
| `EliteImage` | ⬛ | `atoms/EliteImage.tsx:14` | **Ninguém** | Sem chamador |
| `EliteFormField` | ⬛ | `molecules/EliteFormField.tsx:23` | **Ninguém** | Sem chamador |
| `PreloadLink` | 🟦 | `atoms/PreloadLink.tsx:19-23` | **Ninguém** | O `handleMouseEnter` contém só o comentário "Logic to trigger route pre-fetching can be added here" — não faz prefetch nenhum. Substituído de fato por `components/PrefetchLink.tsx` |

---

## src/components/ui — visão de altitude

**61 arquivos (fora de `__tests__`), 7.968 linhas contando testes.**

### (a) Inventário

- **Primitivos shadcn/Radix padrão (~40):** `accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, checkbox, collapsible, command, dialog, drawer, dropdown-menu, form, input, input-otp, label, popover, progress, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, tooltip, chart, kbd`.
- **Adições próprias do projeto (~21), não pertencentes ao registry shadcn:** `celebration.tsx`, `celebration-particles.tsx`, `undo-toast.tsx`, `enhanced-search.tsx` + `enhanced-search-helpers.ts`, `sparkline.tsx`, `illustrated-empty-state.tsx`, `empty-state-illustrations.tsx`, `page-header.tsx`, `page-header-extras.tsx`, `floating-input.tsx`, `interactive-card.tsx`, `error-boundary.tsx`, `contextual-skeletons.tsx`, `status-indicators.tsx`, `skeletons/{SkeletonPrimitives,LayoutSkeletons,DomainSkeletons}.tsx`, `indicators/{StatusIndicator,PriorityIndicator,ProgressAndTrend,StepAndHealth,MiscIndicators}.tsx`.

### (b) Amostragem — padrão vs. customizado

Amostrei 6 arquivos. Resultado:

- **`badge.tsx` (`:6-21`)** — shadcn **literalmente stock**, 4 variantes originais, zero alteração.
- **`button.tsx` (`:7-30`)** — estruturalmente shadcn (`cva` + `Slot`) mas **fortemente customizado**: tema "elite" com cores fixas fora dos tokens (`default: "bg-white text-black"`, `secondary: "bg-violet-600"`, `ghost: "text-zinc-400"`), tamanhos maiores (`h-11` vs `h-10`), e uma **prop nova `loading`** com spinner e overlays de shimmer implementados de verdade (`:40-67`). Como as cores default são literais (`bg-white text-black`), o botão não acompanha os tokens de tema — é um acoplamento visual, não lógica de negócio.
- **Lógica de negócio dentro de `ui/`:** **nenhum arquivo importa `supabase`**. O acoplamento existente é apenas a hooks de UI: `celebration.tsx:5` e `undo-toast.tsx:6` (`useHapticFeedback`), `enhanced-search.tsx:17` (`normalizeText` de `useFuseSearch`), `sidebar.tsx:6` (`useIsMobile`), `toaster.tsx:2` (`useToast`). Ou seja: **`ui/` está livre de regra de negócio e de persistência**; os desvios são de estilo e de composição, não de domínio.

### (c) Arquivos de `ui/` sem nenhum importador

Grep por `from '.../<basename>'` em todo `src/`, excluindo o próprio arquivo:

| Arquivo | Linhas | Prova |
|---|---|---|
| `ui/sidebar.tsx` | 637 | grep `ui/sidebar` em `src/`: 0 ocorrências; grep `<SidebarProvider`/`<SidebarMenu`/`useSidebar(`: 0. A sidebar real do app é `features/layout/components/AppSidebar.tsx`, que não usa este arquivo. |
| `ui/form.tsx` | 129 | grep `ui/form`: 0; grep `<FormField`/`<FormItem`: 0 |
| `ui/kbd.tsx` | 22 | grep `ui/kbd`: 0; grep `<Kbd`: 0 |
| `ui/status-indicators.tsx` | 14 | grep `ui/status-indicators`: 0. É apenas um barril de retrocompatibilidade (`:1` "Barrel re-export for backward compatibility") reexportando `./indicators/*`, que os consumidores importam diretamente. |

**Total morto em `ui/`: 802 linhas (~10% do diretório).** Os outros 57 arquivos têm ≥1 importador; os mais usados são `badge` (175), `button` (169), `card` (163), `input` (71).

---

## Componentes órfãos (com prova de grep)

Método: para cada símbolo exportado, `grep -rnE "import[^;]*\bSIMBOLO\b|<SIMBOLO[ />]"` em todo `src/`, descartando a própria definição. Isso captura `import X`, `<X `, `<X/>`, `lazy(() => import(...))` (via o import) e uso com genéricos; e evita o falso-positivo de o nome aparecer só em comentário — que foi exatamente o que contaminou uma primeira passagem ingênua (ex.: o comentário `Organism: EliteCardGrid` em `EliteCardGrid.tsx:12` faz um grep simples "encontrar" `Organism` ali, embora o componente não seja usado).

**Órfãos confirmados (0 referências reais, nem em testes):**

| Símbolo | Arquivo:linha | Prova |
|---|---|---|
| `Organism` | `organisms/Organism.tsx:11` | 0 imports/JSX. Únicos hits eram os comentários `Organism: ElitePageWrapper` (`ElitePageWrapper.tsx:9`) e `Organism: EliteCardGrid` (`EliteCardGrid.tsx:12`) |
| `Molecule` | `molecules/Molecule.tsx:11` | Único consumidor é `Organism.tsx:1` — órfão transitivo |
| `Atom` | `atoms/Atom.tsx:8` | Único consumidor é `Molecule.tsx:13` — órfão transitivo. Hits em `ui/skeleton.tsx`, `EliteButton.tsx`, `EliteImage.tsx`, `PreloadLink.tsx` eram comentários `Atom: ...` |
| `EliteImage` | `atoms/EliteImage.tsx:14` | 0 |
| `EliteFormField` | `molecules/EliteFormField.tsx:23` | 0 |
| `PreloadLink` | `atoms/PreloadLink.tsx:17` | 0 |
| `FornecedorMobileCard` | `fornecedores/FornecedorMobileCard.tsx` | 0 (289 linhas) |
| `SwipeableTableRow` | `mobile/SwipeableListItem.tsx` | 0 |
| `withPermission` | `security/PermissionGate.tsx:58` | 0 |
| `useFocusTrap` | `accessibility/AdvancedAccessibility.tsx:375` | 0 |
| `LiveRegion` | `accessibility/AdvancedAccessibility.tsx:357` **e** `accessibility/VisuallyHidden.tsx` | 0 para ambas. As duas definições só "se encontram" em grep ingênuo porque cada arquivo menciona o nome da outra |

**Exports órfãos dentro de `animations/MotionComponents.tsx`** (arquivo vivo, exports mortos — 16 de 18):
`MotionCard`, `MotionButton`, `FadeIn`, `ScaleIn`, `SlideIn`, `StaggerContainer`, `StaggerItem`, `FloatingElement`, `ShimmerEffect`, `AnimatedList`, `AnimatedListItem`, `HoverScale`, `AttentionPulse`, `SuccessCheck`, `LoadingSpinner`, `EntranceAnimation` — **todos 0 referências**. Vivos: `AnimatedCounter` (4 consumidores) e `PageTransition` (`pages/qualificacao/QualificacaoFornecedores.tsx:3`, `pages/configuracoes/ConfiguracoesCentroCusto.tsx:3`, `pages/orcamentos/Orcamentos.tsx:5`).

**Símbolos referenciados APENAS por testes** — declarado explicitamente conforme pedido:

| Símbolo | Único consumidor |
|---|---|
| `cotacaoTourSteps`, `fornecedorTourSteps`, `pedidosTourSteps`, `solicitacoesTourSteps` | `onboarding/__tests__/tourStepDefinitions.test.ts` (+ re-export inerte em `OnboardingTour.tsx:472`) |
| `sanitizeAccessibilitySettings` | `accessibility/__tests__/accessibilityHelpers.test.ts` |

**Órfãos em `ui/`:** `sidebar.tsx`, `form.tsx`, `kbd.tsx`, `status-indicators.tsx` (ver seção anterior).

---

## Achados graves

### 1. 🔴 WebAuthn: login sem verificação de assinatura — bypass de autenticação
`supabase/functions/webauthn-authenticate/index.ts`, ação `finish` (`:134-224`). O servidor:
- confere que existe um challenge não expirado (`:136-149`);
- confere que o `credential_id` existe (`:155-164`);
- decodifica o `clientDataJSON` e compara `clientData.challenge` (`:170`) e `clientData.type === 'webauthn.get'` (`:173`);
- **e então emite um magic link de sessão** (`:195`).

A palavra `signature` **não aparece no arquivo** (grep confirmado). `authenticatorData` e `signature` são enviados pelo cliente (`src/hooks/useWebAuthn.ts:224-226`) e **descartados**. Não há verificação criptográfica contra a chave pública, nem checagem de `clientData.origin`, nem validação do contador anti-clonagem (o counter é apenas incrementado, `:178`).

Consequência: quem conhecer um `credential_id` registrado e um e-mail pode chamar `start` para obter o challenge, montar um `clientDataJSON` com esse challenge e `type: "webauthn.get"`, enviar `signature` arbitrária, e receber um token de sessão válido. **Takeover de conta sem posse do autenticador.**

Agravante: o registro (`webauthn-register/index.ts:192`) grava `public_key: credResponse.attestationObject` — o attestation object bruto, não a chave pública COSE extraída. Mesmo que alguém adicionasse a verificação, não há chave utilizável armazenada.

### 2. 🔴 MFA nunca é exigido no login
`useMFA.ts` exporta `verifyMFA` (`:217`) e `checkMFARequired` (`:220`). Grep em `src/`: **zero chamadores** — os únicos consumidores de `useMFA` são `MFASettings.tsx:16` (`enrollMFA`, `verifyEnrollment`) e `:108` (`mfaSettings`, `disableMFA`, `generateBackupCodes`). Grep por `mfa|MFA|aal|AssuranceLevel` em `src/pages/auth/Auth.tsx` e `src/features/auth/`: **0 ocorrências**. O usuário pode ativar o 2FA e a aplicação continua autenticando só com senha.

### 3. 🔴 Códigos de backup de MFA: inseguros, em texto plano e inutilizáveis
`useMFA.ts:183-185` gera 10 códigos com `Math.random().toString(36)` (PRNG não criptográfico, ~31 bits de entropia por código) e grava em texto plano na coluna `mfa_settings.backup_codes` (`:187-189`). Nenhum código do repositório **lê** `backup_codes` para autenticar: as únicas leituras são de exibição na UI (`MFASettings.tsx:135,225,252`). São códigos decorativos — não desbloqueiam nada.

### 4. 🟠 Enrolamento de MFA: o QR Code nunca é exibido
`MFASettings.tsx:23-35`: `handleEnroll` guarda o `qr_code` (`:27`) e, na linha seguinte, faz `setStep('verify')` (`:30`). O bloco que renderiza `<img src={qrCode}>` e a chave manual está sob `step === 'enroll'` (`:61-71`), portanto **inalcançável**. O usuário clica em "Gerar QR Code" e cai direto no campo OTP, sem nunca ver o QR nem o segredo — não há como configurar o app autenticador pela UI.

### 5. 🔴 Push notifications: chave VAPID placeholder e emissor sem chamador
`src/hooks/useRealPushNotifications.ts:84-86`:
```
// For now, we'll use a placeholder VAPID key
// In production, this would come from your backend
const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
```
É a chave pública de exemplo pública e amplamente conhecida. As subscriptions gravadas em `push_subscriptions` (`:103`) ficam atreladas a ela, enquanto o emissor lê `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` do ambiente (`supabase/functions/send-push-notification/index.ts:129-130`) — chaves que não podem casar com a placeholder.

Além disso, `send-push-notification` **não é invocado por ninguém**: grep por `send-push-notification` em `src/` e `supabase/functions/` retorna apenas auto-referências e a entrada de contrato em `_shared/contracts.ts:146`. Toda a UI de preferências de push (`NotificationSettingsPanel.tsx`, 296 linhas, 6 categorias + 3 canais) grava preferências que nenhum emissor consulta.

### 6. 🟠 Onboarding: 18 dos 21 alvos do tour não existem no DOM
`tourStepDefinitions.ts:11-167` define 21 seletores `[data-tour='...']`. O grep de atributos `data-tour` realmente presentes no JSX de todo `src/` retorna exatamente **três**: `sidebar`, `notifications`, `pedidos-kpis`. O tour do dashboard (o único ligado à UI) tem 5 passos e só 2 alvos existem — os outros caem no fallback de "centro da tela sem destaque" (`OnboardingTour.tsx:80-88`), então o usuário recebe balões explicando elementos que não estão sendo apontados.

### 7. 🟠 Suíte de segurança sem enforcement: painéis de CRUD que não protegem nada
Quatro superfícies administrativas gravam configuração que **nenhum caminho de execução lê**:
- `is_ip_blocked` (`supabase/migrations/20251231120356_...sql:231`) e `is_ip_whitelisted` (`:246`): 0 chamadores em `src/` e `supabase/functions/`.
- `allowed_countries` / `blocked_countries` / `geo_settings`: nenhuma leitura fora dos próprios painéis de administração.
- O comentário `// Check if IP is blocked before attempting login` em `src/pages/auth/Auth.tsx:104` **não é seguido de checagem alguma** — a linha seguinte é `const userAgent = navigator.userAgent` e depois `signIn()`.
- `password_reset_requests.reset_token` é gerado (`usePasswordResetRequests.ts:99`) e persistido (`:108`), mas grep por `reset_token` fora do hook: 0. Aprovar uma solicitação não redefine senha nenhuma.

### 8. 🟠 Dashboards de segurança sobre tabelas sem produtor
- `active_sessions`: nenhum `INSERT` no repositório; só triggers de sanitização `BEFORE INSERT` (`supabase/migrations/20260403111210_...sql:8`). `ActiveSessionsPanel` (195 linhas) não pode listar nada.
- `geo_access_logs`: nenhum `INSERT`; só uma policy RLS (`supabase/migrations/20260108121914_...sql:73`). `GeoAccessLogsPanel` idem.
- `security_logs`: único produtor é `webauthn-authenticate/index.ts:218`. Login por senha, logout e mudanças de permissão não registram evento.
- `login_attempts`: **tem** produtor (`src/pages/auth/Auth.tsx:112`), mas passa `_ip_address: ''` (`:114`). Além de a coluna IP ficar sempre vazia no painel, o auto-bloqueio da migration (`20251231120356_...sql:294-313`, "bloquear IP após 5 tentativas falhas") agrupa **todos os usuários sob a string vazia** — 5 falhas de contas distintas podem inserir um bloqueio para `''`.

`NAO_VERIFICADO (runtime)`: a contagem real de linhas dessas tabelas.

### 9. 🟠 Painéis de saúde de dependências: dados congelados e dois arquivos 404
- `DependencyHealthBadge.tsx:107` lê `/dependency-health.json`. O arquivo existe (`public/dependency-health.json`, 3.973 bytes, versionado) mas é **estático**: `"generatedAt": "2026-08-31T14:30:00.000Z"` — **data no futuro** em relação a hoje (2026-08-16). Nenhum script em `scripts/` nem entrada em `package.json` o gera. O badge exibido no header de todas as páginas mostra um retrato fabricado.
- `InstallReportPanel.tsx:31` busca `/install-report.json` e `DateFnsUsagePanel.tsx:40` busca `/datefns-usage.json`. **Nenhum dos dois existe em `public/`** (conteúdo verificado). Ambos lançam `HTTP 404` a cada montagem em `/admin/dependency-health`.

### 10. 🟡 `AccessibilityPanel` montado duas vezes
`src/App.tsx:72` e `src/features/layout/components/HeaderActions.tsx:81` montam o mesmo componente. Isso duplica o botão flutuante em `fixed bottom-4 left-4` (`AdvancedAccessibility.tsx:128`) e, via `AccessibilityProvider`→`AccessibilityStyles`, poderia duplicar os `<filter id="protanopia-filter">` (`AccessibilityStyles.tsx:82-90`) — IDs SVG duplicados têm resolução indefinida.

### 11. 🟡 Fonte de dislexia anunciada mas nunca carregada
`AdvancedAccessibility.tsx:247` promete "Usa fonte OpenDyslexic"; `AccessibilityStyles.tsx:53` aplica `font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif`. Grep por `OpenDyslexic` em `src/`, `public/`, `index.html` e `tailwind.config.ts`: só essas duas linhas. **Não há `@font-face` nem link de CDN** — o toggle entrega Comic Sans.

### 12. 🟡 Leilão reverso com wiring de demonstração em produção
`src/pages/licitacoes/Licitacoes.tsx:88`: `userFornecedorId={fornecedores[0]?.id} // For demo purposes, use first supplier`. A sala de leilão é funcional de verdade (`useLicitacoes.ts:312` insere em `licitacao_lances`; `:332` abre canal realtime), mas **todo lance dado por qualquer usuário é atribuído ao primeiro fornecedor da lista**.

### 13. 🟡 Não existe infraestrutura de feature flags
`.env.example:17-19` declara `VITE_ENABLE_ANALYTICS=true` e `VITE_ENABLE_DEBUG=false`. O grep de `import.meta.env.[A-Z_]+` em todo `src/` retorna apenas `DEV`, `PROD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Nenhuma dessas flags é lida. **Nenhuma funcionalidade deste lote está atrás de flag** — o que está dormente, está dormente por falta de código, não por chave desligada.

### 14. 🟡 `GlobalErrorBoundary` promete notificação que não ocorre deslogado
`GlobalErrorBoundary.tsx:22` exibe "Nossa equipe técnica já foi notificada". O `onError` (`:63`) chama `logger.error`, que de fato envia para a edge function `telemetry` (`src/lib/logger.ts:117`) — **mas** `logger.ts:114` retorna cedo sem sessão: `if (!session?.access_token) return;`. Crashes na tela de login são descartados silenciosamente enquanto a UI afirma o contrário.

### Notas menores
- `SystemAlertsView.tsx:45`: `resolved_by` comentado — alertas são resolvidos sem autoria registrada.
- `BottomNavigation.tsx:27,49`: `badgeKey: 'aprovacoes'` é declarado no tipo e calculado, mas nenhum item de navegação o usa.
- `ui/button.tsx:12-16`: variantes com cores literais (`bg-white text-black`, `text-zinc-400`) fora dos tokens de tema — o botão mais usado do sistema (169 importadores) não responde ao alternador de tema.
- Nenhum `TODO`, `FIXME`, `console.log` de integração falsa ou bloco JSX comentado foi encontrado no código de produção deste lote (greps executados sobre todo o escopo). Os `Math.random()` existentes (`TourVisualComponents.tsx:11-19`) são de confete, uso legítimo. O `Math.random()` problemático está no hook, não no componente (Achado #3).

---

## ARQUIVOS LIDOS

Arquivos abertos e lidos integralmente ou em trechos substanciais durante esta auditoria.

### Escopo primário — componentes
/home/user/promo-supply-v2/src/components/PrefetchLink.tsx
/home/user/promo-supply-v2/src/components/accessibility/AdvancedAccessibility.tsx
/home/user/promo-supply-v2/src/components/accessibility/AccessibilityStyles.tsx
/home/user/promo-supply-v2/src/components/accessibility/VisuallyHidden.tsx
/home/user/promo-supply-v2/src/components/accessibility/SkipLinks.tsx
/home/user/promo-supply-v2/src/components/accessibility/accessibilityHelpers.ts
/home/user/promo-supply-v2/src/components/admin/TenantSwitcher.tsx
/home/user/promo-supply-v2/src/components/admin/DependencyHealthBadge.tsx
/home/user/promo-supply-v2/src/components/admin/InstallReportPanel.tsx
/home/user/promo-supply-v2/src/components/admin/DateFnsUsagePanel.tsx
/home/user/promo-supply-v2/src/components/admin/InstallReportHelp.tsx
/home/user/promo-supply-v2/src/components/admin/RefreshNowHelp.tsx
/home/user/promo-supply-v2/src/components/admin/telemetry/AppLogsView.tsx
/home/user/promo-supply-v2/src/components/admin/telemetry/SystemAlertsView.tsx
/home/user/promo-supply-v2/src/components/admin/telemetry/TelemetryCharts.tsx
/home/user/promo-supply-v2/src/components/animations/MotionComponents.tsx
/home/user/promo-supply-v2/src/components/animations/motionVariants.ts
/home/user/promo-supply-v2/src/components/atoms/Atom.tsx
/home/user/promo-supply-v2/src/components/atoms/EliteButton.tsx
/home/user/promo-supply-v2/src/components/atoms/EliteImage.tsx
/home/user/promo-supply-v2/src/components/atoms/PreloadLink.tsx
/home/user/promo-supply-v2/src/components/feedback/GlobalErrorBoundary.tsx
/home/user/promo-supply-v2/src/components/filters/ConfirmClearFiltersDialog.tsx
/home/user/promo-supply-v2/src/components/fornecedores/FornecedorMobileCard.tsx
/home/user/promo-supply-v2/src/components/layout/EliteBackground.tsx
/home/user/promo-supply-v2/src/components/licitacoes/ReverseAuctionRoom.tsx
/home/user/promo-supply-v2/src/components/mobile/BottomNavigation.tsx
/home/user/promo-supply-v2/src/components/mobile/MobileRefreshWrapper.tsx
/home/user/promo-supply-v2/src/components/mobile/SwipeableListItem.tsx
/home/user/promo-supply-v2/src/components/molecules/Molecule.tsx
/home/user/promo-supply-v2/src/components/molecules/EliteFormField.tsx
/home/user/promo-supply-v2/src/components/navigation/BackToTop.tsx
/home/user/promo-supply-v2/src/components/navigation/ModernBreadcrumbs.tsx
/home/user/promo-supply-v2/src/components/navigation/NavigationProgressBar.tsx
/home/user/promo-supply-v2/src/components/navigation/RouteSkeleton.tsx
/home/user/promo-supply-v2/src/components/navigation/SmartBackButton.tsx
/home/user/promo-supply-v2/src/components/notifications/NotificationSettingsPanel.tsx
/home/user/promo-supply-v2/src/components/onboarding/OnboardingTour.tsx
/home/user/promo-supply-v2/src/components/onboarding/TourVisualComponents.tsx
/home/user/promo-supply-v2/src/components/onboarding/tourStepDefinitions.ts
/home/user/promo-supply-v2/src/components/organisms/Organism.tsx
/home/user/promo-supply-v2/src/components/organisms/ElitePageWrapper.tsx
/home/user/promo-supply-v2/src/components/organisms/EliteCardGrid.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoAdvancedFilters.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoAdvancedKPIs.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoDetailModal.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoExportPanel.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoFinancialDashboard.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoMobileCard.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoNotificationsWidget.tsx
/home/user/promo-supply-v2/src/components/pagamentos/PagamentoScheduleModal.tsx
/home/user/promo-supply-v2/src/components/pagamentos/ThreeWayMatchPanel.tsx
/home/user/promo-supply-v2/src/components/pedidos/PedidoMobileCard.tsx
/home/user/promo-supply-v2/src/components/pwa/PWAInstallPrompt.tsx
/home/user/promo-supply-v2/src/components/security/ActiveSessionsPanel.tsx
/home/user/promo-supply-v2/src/components/security/BlockedCountriesPanel.tsx
/home/user/promo-supply-v2/src/components/security/BlockedIPsPanel.tsx
/home/user/promo-supply-v2/src/components/security/GeoAccessLogsPanel.tsx
/home/user/promo-supply-v2/src/components/security/GeoWhitelistPanel.tsx
/home/user/promo-supply-v2/src/components/security/IPWhitelistPanel.tsx
/home/user/promo-supply-v2/src/components/security/LoginAttemptsPanel.tsx
/home/user/promo-supply-v2/src/components/security/MFASettings.tsx
/home/user/promo-supply-v2/src/components/security/PasskeyManager.tsx
/home/user/promo-supply-v2/src/components/security/PasswordResetRequestsPanel.tsx
/home/user/promo-supply-v2/src/components/security/PasswordStrengthIndicator.tsx
/home/user/promo-supply-v2/src/components/security/PermissionGate.tsx
/home/user/promo-supply-v2/src/components/security/PermissionMatrix.tsx
/home/user/promo-supply-v2/src/components/security/RateLimitDashboard.tsx
/home/user/promo-supply-v2/src/components/security/SecurityLogsPanel.tsx
/home/user/promo-supply-v2/src/components/settings/FeedbackSettingsPanel.tsx
/home/user/promo-supply-v2/src/components/settings/TourSettingsPanel.tsx

### src/components/ui — AMOSTRAGEM EM ALTITUDE (não linha a linha)
Os 61 arquivos foram inventariados (nome, linhas, contagem de importadores). Foram **abertos e lidos** apenas os seguintes, como amostra para julgar customização vs. shadcn padrão:
/home/user/promo-supply-v2/src/components/ui/button.tsx
/home/user/promo-supply-v2/src/components/ui/badge.tsx
/home/user/promo-supply-v2/src/components/ui/kbd.tsx
/home/user/promo-supply-v2/src/components/ui/status-indicators.tsx
Os demais 57 arquivos de `ui/` foram analisados apenas por grep (imports, acoplamento a `supabase`/`@/hooks/`, contagem de importadores) — **não foram lidos**.

### Fora do escopo, lidos para verificar o fio (UI → lógica → persistência → consumidor)
/home/user/promo-supply-v2/src/App.tsx
/home/user/promo-supply-v2/src/hooks/useWebAuthn.ts
/home/user/promo-supply-v2/src/hooks/useMFA.ts
/home/user/promo-supply-v2/src/hooks/useRealPushNotifications.ts (trechos 1-140)
/home/user/promo-supply-v2/src/lib/logger.ts (trechos 85-135)
/home/user/promo-supply-v2/src/pages/auth/Auth.tsx (trechos 100-130, 400-420)
/home/user/promo-supply-v2/supabase/functions/webauthn-register/index.ts (trechos 155-215)
/home/user/promo-supply-v2/supabase/functions/webauthn-authenticate/index.ts (trechos 125-224)
/home/user/promo-supply-v2/supabase/migrations/20251231120356_3ae6d121-b315-421d-a18c-f2155c8f692f.sql (trechos 230-350)
/home/user/promo-supply-v2/public/dependency-health.json (cabeçalho)
