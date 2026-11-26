# L08 — src/features

Escopo auditado: `src/features/` completo — 63 arquivos, 8.313 linhas (contagem verificada:
`find src/features -type f | wc -l` → 63; `find src/features -type f -exec wc -l {} + | tail -1` → 8313).
Âncora de execução lida (fora do escopo): `src/routes/AppRoutes.tsx`, `src/App.tsx`.

Sem acesso a banco. Toda afirmação sobre existência de tabela/RPC vem do arquivo de tipos gerado
`src/integrations/supabase/types.ts`; comportamento em produção é `NAO_VERIFICADO (runtime)`.

---

## VEREDITO: refactor concluído, em andamento ou abandonado?

**EM ANDAMENTO E PARCIAL — NÃO abandonado. A hipótese de "módulo sombra" está ERRADA.**

`src/features/` **está no caminho de execução real**. Não é código órfão paralelo a `src/pages/`:
é a camada de infraestrutura (auth + layout) e de acesso a dados (hooks) que `src/pages/` **consome**.
A direção da dependência é `pages/ → features/`, não `pages/ vs features/`.

Cadeia de evidência desde a raiz:

```
src/main.tsx → src/App.tsx
  App.tsx:9      import { AuthProvider, useAuth } from "@/features/auth"
  App.tsx:61     <AuthProvider>                       ← features/auth/hooks/useAuth.tsx:11
  App.tsx:12     import { PageLoader } from "@/features/layout/components/PageLoader"
  App.tsx:14     import { AnimatedRoutes } from "@/routes/AppRoutes"
  App.tsx:25     <AnimatedRoutes />

src/routes/AppRoutes.tsx
  AppRoutes.tsx:3   import { ProtectedRoute }      from "@/features/auth/components/ProtectedRoute"
  AppRoutes.tsx:4   import { ModuleErrorBoundary } from "@/features/layout/components/ModuleErrorBoundary"
  AppRoutes.tsx:6   import { Shell }               from "@/features/layout/components/Shell"
  AppRoutes.tsx:8   import { PageLoader }          from "@/features/layout/components/PageLoader"
  AppRoutes.tsx:83  <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>   ← TODAS as rotas protegidas

src/features/layout/components/Shell.tsx:3  import { MainLayout } from "./MainLayout"
  Shell.tsx:14  <MainLayout><Suspense><Outlet/></Suspense></MainLayout>
  MainLayout.tsx:3,4,5,6,12,16,19,22,23,24,33 → AppSidebar, AdvancedSearch, KeyboardShortcutsDialog,
      CommandPalette, Breadcrumbs, QuickActionsFAB, OfflineIndicator, HeaderActions, SupplierChat,
      GuidedBuyingAssistant, PageTransition  (todos dentro de features/layout)
  HeaderActions.tsx:13 import { EmpresaSelector } from "@/features/empresas"
  HeaderActions.tsx:5,6,7,8,9 → RealNotificationCenter, SLASettingsPanel, UserMenu, ThemeToggle, LanguageSwitcher
```

Ou seja: **100% do chrome da aplicação (sidebar, header, busca, notificações, FABs, transições de
página, error boundaries) é `src/features/layout`.** Não existe um layout concorrente vivo.

E os hooks de domínio também rodam:

```
AppRoutes.tsx:13 lazy(() => import("@/pages/solicitacoes/Solicitacoes"))
  → Solicitacoes.tsx:31  import { useSolicitacoes } from "@/features/solicitacoes"
  → Solicitacoes.tsx:92  const { solicitacoes, ... } = useSolicitacoes({...})

AppRoutes.tsx:14 lazy(() => import("@/pages/pedidos/Pedidos"))
  → Pedidos.tsx:27  import { usePedidos, usePedidosKPIs, type Pedido } from "@/features/pedidos"
  → Pedidos.tsx:56,57

AppRoutes.tsx:12 lazy(() => import("@/pages/cotacao/Cotacao"))
  → Cotacao.tsx:39  import { useCotacoes } from "@/features/cotacoes"
  → Cotacao.tsx:55

AppRoutes.tsx:21 lazy(() => import("@/pages/aprovacoes/Aprovacoes"))
  → Aprovacoes.tsx:17-23  import { ApprovalTrendChart, StatusDistributionChart,
                                    BottleneckAnalysis, ApprovalKPIs, type ApprovalHistoryItem }
                          from "@/features/aprovacoes"
  → Aprovacoes.tsx:196,199,200,204
```

Contagem de acoplamento medida:
`grep -rn "from ['\"]@/features/" src/ --include=*.ts --include=*.tsx | grep -vc "^src/features/"` → **107 importações**
de fora de `features/` para dentro dela.

**O que o refactor NÃO fez (por isso "parcial", não "concluído"):**

1. O ADR `DOCS/ADR/0001-feature-based-architecture.md:11` prescreve `components/` por feature.
   Na prática só `layout/`, `aprovacoes/` e `empresas/` têm `components/`. Os 4 domínios de negócio
   (`cotacoes`, `pedidos`, `solicitacoes`, `aprovacoes`) migraram **apenas hooks e schemas** —
   as telas continuam em `src/pages/` (117 arquivos) e os widgets em `src/components/compras/`
   (117 arquivos, 27.134 linhas, medido via `find src/components/compras -type f -exec wc -l {} + | tail -1`).
2. O ADR está marcado `Status: Proposto e em implementação` (`DOCS/ADR/0001:5`) — o próprio documento
   admite que não terminou. (Doc citado como hipótese, não como prova; a prova é a estrutura de arquivos.)
3. Ninguém está usando o barrel `index.ts` de forma consistente: `AppRoutes.tsx:3,4,6,8` importa por
   caminho profundo (`@/features/auth/components/ProtectedRoute`), não pelo `index.ts` público.

**Sombra real encontrada (única):** `src/components/compras/MainLayout.tsx` — arquivo de 1 linha
que re-exporta `@/features/layout/components/MainLayout`, com **zero consumidores em todo o repositório**.
É o resíduo do movimento de arquivo. (Fora do escopo de edição deste lote — apenas registrado.)

---

## Duplicação features/ vs pages/components — quem roda de verdade

| Domínio | Existe em features/ | Existe em pages/components | Qual está no caminho de execução | Evidência (arquivo:linha) |
|---|---|---|---|---|
| **auth** | `features/auth/*` (7 arquivos) | não há concorrente | **features/** (exclusivo) | `App.tsx:9,61`; `AppRoutes.tsx:3,83`; 151 ocorrências de `useAuth` no repo |
| **layout / chrome** | `features/layout/components/MainLayout.tsx:39` | `src/components/compras/MainLayout.tsx:1` (shim de 1 linha) | **features/** — o shim tem 0 consumidores | `Shell.tsx:3,14`; `AppRoutes.tsx:6,83`; `grep -rn "compras/MainLayout" .` → **NENHUM** |
| **solicitacoes (dados)** | `features/solicitacoes/hooks/useSolicitacoes.ts:92` | nenhum hook concorrente em `src/hooks/` | **features/** | `pages/solicitacoes/Solicitacoes.tsx:31,92`; `components/compras/solicitacao/SolicitacaoFormSteps.tsx:16,317`; `components/compras/approval/ApprovalRuleModal.tsx:12,42`; `pages/configuracoes/ConfiguracoesCentroCusto.tsx:24` |
| **solicitacoes (tela)** | ✖ não existe | `pages/solicitacoes/Solicitacoes.tsx` + `components/compras/SolicitacaoCard.tsx`, `SolicitacaoKanban.tsx`, `NovaSolicitacaoModal.tsx`, `solicitacao/` | **pages/components** (features nunca teve tela) | `AppRoutes.tsx:13,88` |
| **cotacoes (dados)** | `features/cotacoes/hooks/useCotacoes.ts:63` | nenhum concorrente | **features/** | `pages/cotacao/Cotacao.tsx:39,55`; `pages/gerar-ordem/GerarOrdem.tsx:33,59` |
| **cotacoes (tela)** | ✖ não existe | `pages/cotacao/Cotacao.tsx` + `components/compras/ComparadorCotacoes.tsx`, `RankingCotacoes.tsx`, `CotacaoManualModal.tsx`, `StrategicQuoteTable.tsx`, `VisualComparadorCotacoes.tsx` | **pages/components** | `AppRoutes.tsx:12,86-87` |
| **pedidos (dados)** | `features/pedidos/hooks/usePedidos.ts:111,306` | nenhum concorrente | **features/** | `pages/pedidos/Pedidos.tsx:27,56,57`; `pages/pedidos/PedidoDetailsDialog.tsx:8,47`; `pages/gerar-ordem/GerarOrdem.tsx:32,58` |
| **pedidos (tela)** | ✖ não existe | `pages/pedidos/Pedidos.tsx` + `components/compras/PedidoTimeline.tsx`, `EnhancedPedidoTimeline.tsx`, `OrderPreviewModal.tsx` | **pages/components** | `AppRoutes.tsx:14,89` |
| **aprovacoes (gráficos)** | `features/aprovacoes/components/ApprovalCharts.tsx:48,78,119`, `ApprovalStats.tsx:50` | `components/compras/PendingApprovalsList.tsx`, `DynamicApprovalMatrix.tsx`, `components/compras/approval/` | **AMBOS rodam, lado a lado, na mesma tela** | `pages/aprovacoes/Aprovacoes.tsx:4,5` (compras) e `:17-23,196-204` (features) |
| **aprovacoes (tipos)** | `features/aprovacoes/types/approval.types.ts:1,10,18,24,31,37,43` | `pages/aprovacoes/aprovacoesData.ts:6,15,23,29,...` — **redeclara 4 das 7 interfaces** | **misto**: `ApprovalHistoryItem` vem de features (`Aprovacoes.tsx:22`), mas os dados vêm dos tipos de `aprovacoesData.ts` | `Aprovacoes.tsx:22,139`; `aprovacoesData.ts:6,23,29,48` |
| **empresas** | `features/empresas/*` (4 arquivos) | nenhum concorrente | **features/** parcialmente — só `EmpresaSelector` chega à tela | `HeaderActions.tsx:13,55`; `useEmpresaFilter` sem consumidor |

**Conclusão da tabela:** não há disputa features/ × pages/ em nenhum domínio. As duas camadas são
complementares. A única duplicação genuína é de **tipos de aprovação** (4 interfaces reescritas em
`pages/aprovacoes/aprovacoesData.ts`) e o shim morto `components/compras/MainLayout.tsx`.

---

## Resumo

Denominador: **54 arquivos de produção** (63 totais − 9 arquivos de teste).

| Classificação | Qtd | % |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | 34 | 63,0% |
| 🟨 IMPLEMENTADO_PARCIAL | 19 | 35,2% |
| 🟦 SUGERIDO_OU_INICIADO | 0 | 0,0% |
| ⬛ MORTO_OU_ABANDONADO | 1 | 1,9% |
| **Total** | **54** | **100%** |

Por feature (não-teste):

| Feature | Arquivos | ✅ | 🟨 | 🟦 | ⬛ |
|---|---|---|---|---|---|
| aprovacoes | 4 | 1 | 3 | 0 | 0 |
| auth | 7 | 7 | 0 | 0 | 0 |
| cotacoes | 2 | 2 | 0 | 0 | 0 |
| empresas | 4 | 1 | 2 | 0 | 1 |
| layout | 32 | 20 | 12 | 0 | 0 |
| pedidos | 2 | 2 | 0 | 0 | 0 |
| solicitacoes | 3 | 1 | 2 | 0 | 0 |

Os 9 arquivos de teste restantes (Vitest) não são funcionalidade de produto e ficam fora do
denominador; todos importam símbolos reais do escopo e são listados em ARQUIVOS LIDOS.
Cobertura de teste medida por leitura: `auth.schemas` (28 casos), `authRoles` (20), `solicitacao.schemas`
(38), `searchConfig` (~40), `knownSuppliers` (16), `transitions/config` (16), `transitions/presets` (32),
`useAuth` (4), `useSolicitacoes` (2). **Zero testes** para `useCotacoes`, `usePedidos`, `useEmpresaFilter`,
`ProtectedRoute` e todos os 26 componentes de `layout/`.

---

## Tabela de evidências

### aprovacoes

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `aprovacoes/index.ts` | ✅ IMPLEMENTADO_TOTAL | `index.ts:1-3`; consumido em `pages/aprovacoes/Aprovacoes.tsx:17-23` | n/a (barrel) | — |
| `components/ApprovalCharts.tsx` | 🟨 IMPLEMENTADO_PARCIAL | Define em `:48,78,119`; renderizado em `Aprovacoes.tsx:199,200,204` | **NENHUMA** — dados vêm de `pages/aprovacoes/aprovacoesData.ts:69-77` (array literal fixo, meses "Jul".."Dez") | Ligar a `approval_workflows`/`solicitacoes`; hoje é gráfico de dado inventado exibido como se fosse real |
| `components/ApprovalStats.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:50`; usado em `Aprovacoes.tsx:196` | **NENHUMA** — `metricas` calculado de `approvalTrendData` mock (`Aprovacoes.tsx:45-58`) | Idem; além disso `:57,65` exibem "+2.3% vs período anterior" e "-0.8h" **hardcoded no JSX**, independentes dos dados |
| `types/approval.types.ts` | 🟨 IMPLEMENTADO_PARCIAL | `:1,10,18,24,31,37,43` | n/a (tipos) | 3 de 7 interfaces sem consumidor (ver Órfãos): `ApprovalByValueRangeItem:18`, `ApprovalByApproverItem:24`, `WeeklyTrendItem:43` |

### auth

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `auth/index.ts` | ✅ IMPLEMENTADO_TOTAL | `:1-4`; `App.tsx:9`; `pages/cotacao/Cotacao.tsx:*`; `components/security/PermissionMatrix.tsx:11` | n/a | — |
| `hooks/useAuth.tsx` (AuthProvider) | ✅ IMPLEMENTADO_TOTAL | `:11` provider; `App.tsx:61` monta na raiz. Queries em `:53-56` | `profiles` (`types.ts:4830`), `user_roles` (`:7944`), `user_tenants` (`:7965`), `tenants` (`:7744`), RPC `current_tenant_id` (`:9255`). Runtime `NAO_VERIFICADO (runtime)` | — (tem guarda anti-race `fetchGenerationRef:30,60,156,232` e sync cross-tab `:174-188`) |
| `hooks/useAuthContext.ts` | ✅ IMPLEMENTADO_TOTAL | `:4-10`; 151 ocorrências de `useAuth` medidas no repo | n/a | — |
| `hooks/AuthContext.ts` | ✅ IMPLEMENTADO_TOTAL | `:33` `createContext`; consumido em `useAuth.tsx:9,336` e `useAuthContext.ts:2` | n/a | — |
| `components/ProtectedRoute.tsx` | ✅ IMPLEMENTADO_TOTAL | `:12`; `AppRoutes.tsx:3,83` (rota-pai) e `:123-136` (14 rotas admin/supplier) | n/a — usa `hasRole` do contexto (`useAuth.tsx:280-291`) | — |
| `schemas/auth.schemas.ts` | ✅ IMPLEMENTADO_TOTAL | `:3` UserProfileSchema aplicado em `useAuth.tsx:79`; `:25` TenantSchema exportado em `index.ts:4` | valida payload de `profiles` | — |
| `types/authRoles.ts` | ✅ IMPLEMENTADO_TOTAL | `:1,4,14`; usado em `UserMenu.tsx:14,45,46,67,68` e `components/security/PermissionMatrix.tsx:11,152,153` | n/a | — |

### cotacoes

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `hooks/useCotacoes.ts` | ✅ IMPLEMENTADO_TOTAL | `:63` hook; CRUD completo `:83,130,144,181`; realtime `:200-204`. Rota → `AppRoutes.tsx:12,86` → `Cotacao.tsx:39,55` | tabela `cotacoes` (`types.ts:1999`), join `fornecedores` (`:3247`) e `solicitacoes` (`:5686`); RPC `generate_sequential_number` (`:9273`). Auditoria via `auditHelpers.logCreate/logApprove` (`:110,162`) | — |
| `cotacoes/index.ts` | ✅ IMPLEMENTADO_TOTAL | `:1`; `Cotacao.tsx:39`, `GerarOrdem.tsx:33` | n/a | — |

### empresas

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `components/EmpresaBadge.tsx` | ✅ IMPLEMENTADO_TOTAL | `:57`; renderizado em `EmpresaSelector.tsx:43,99` → `HeaderActions.tsx:55` → `MainLayout.tsx:147` | lê `Empresa` (= `Tenant`) já carregado por `useAuth.tsx:56,94-99` | — |
| `components/EmpresaSelector.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:20`; montado em `HeaderActions.tsx:13,55` | `user_tenants`/`tenants` via `availableEmpresas` (`AuthContext.ts:20`, `useAuth.tsx:306`) | **A seleção não filtra nada.** `setSelectedEmpresa` (`useAuth.tsx:32-40`) só grava em `localStorage` e chama `queryClient.invalidateQueries()`. Nenhuma query lê `selectedEmpresaId` — `grep -rn "selectedEmpresaId" src/ \| grep -vE "^src/features/(empresas\|auth)/"` → **NENHUM**. O usuário troca de empresa e vê exatamente os mesmos dados |
| `hooks/useEmpresaFilter.ts` | ⬛ MORTO_OU_ABANDONADO | `:27`; único re-export em `index.ts:3` | n/a | Zero chamadores (ver Órfãos). É o hook que **deveria** fazer o filtro que falta no `EmpresaSelector` |
| `empresas/index.ts` | 🟨 IMPLEMENTADO_PARCIAL | `:1-3`; único importador é `HeaderActions.tsx:13`, que só puxa `EmpresaSelector` | n/a | Linha `:3` exporta símbolo morto |

### layout — components

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `Shell.tsx` | ✅ IMPLEMENTADO_TOTAL | `:7`; `AppRoutes.tsx:6,83` — envolve **todas** as 48 rotas protegidas | n/a | — |
| `MainLayout.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:39`; `Shell.tsx:3,14`; também `pages/{catalogo-spot,catalogo-xbz,licitacoes,orcamentos,portal-fornecedor,qualificacao,seguranca,configuracoes}` (8 páginas o importam direto) | n/a | (a) `:90` e `:97` têm entidade HTML crua na classe Tailwind: `ease-&lsqb;cubic-bezier(...)]` — a classe arbitrária **não compila**, a curva de easing é silenciosamente ignorada; (b) `:149` passa `onRestartTour={() => {}}` → o botão de tour do header é morto; (c) 8 páginas aninham `MainLayout` **dentro** de `Shell`, que já renderiza `MainLayout` → layout duplicado nessas rotas |
| `PageLoader.tsx` | ✅ IMPLEMENTADO_TOTAL | `:9`; `App.tsx:12,75`; `AppRoutes.tsx:8,77,142,149`; `Shell.tsx:4,15` | n/a | — |
| `ModuleErrorBoundary.tsx` | ✅ IMPLEMENTADO_TOTAL | `:138` boundary, `:54` fallback, `:192` HOC. Usado em `AppRoutes.tsx:4` e em ~25 rotas (`:85-137`), além de `pages/dashboard/DashboardExecutivo.tsx:3,23` (HOC) | log via `logger.error` (`:160`) | — |
| `AppSidebar.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:325`; `MainLayout.tsx:3,74,93`. 42 itens de menu em `:70-152`; badges vivos via `useSidebarBadges` (`:54,329`) e `useCriticalAlertsBadge` (`:53,328`) | badges vêm de hooks externos (fora do escopo) — `NAO_VERIFICADO (runtime)` | (a) `:342` mesma corrupção `ease-&lsqb;cubic-bezier(0.4,0,0.2,1)]` — transição de largura sem easing; (b) `:459` exporta `MobileSidebarTrigger` sem nenhum consumidor (ver Órfãos); (c) `:75` item "Dashboard" aponta para `/`, que `AppRoutes.tsx:84` redireciona para `/compras` — o `isItemActive` (`:154-157`) nunca marca esse item como ativo |
| `AdvancedSearch.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:39`; `MainLayout.tsx:4,144`. Busca real em 5 tabelas `:119-123` | `solicitacoes`, `pedidos`, `fornecedores`, `pagamentos`, `contracts` — todas em `types.ts` | (a) **colisão de atalho**: `:76` registra Ctrl/⌘+K em `document`, e `CommandPalette.tsx:358` registra o mesmo atalho no mesmo `document` — os dois diálogos abrem juntos; (b) `:119-123` interpolam `searchQuery` cru dentro de `.or(...ilike...)` sem `escapeIlike` (usado corretamente em `usePedidos.ts:96` e `useSolicitacoes.ts:79`) — `%`, `_`, `,` do usuário quebram/alteram o filtro; (c) nenhuma query filtra `organization_id`, dependendo só de RLS — `NAO_VERIFICADO (runtime)` |
| `CommandPalette.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:84` componente, `:353` hook; `MainLayout.tsx:6,51,70` | nenhuma — lista estática `:113-132` | (a) badges numéricos `"5"`, `"3"`, `"2"`, `"4"` **hardcoded** em `:117,118,121,129`, exibidos como contagens reais; (b) 5 ações são `() => {}`: `:144` Exportar, `:145` Importar, `:165` Notificações, `:166` Meu Perfil, `:167` Ajuda; (c) `:168` "Sair" apenas navega para `/auth` **sem chamar `signOut`** — a sessão Supabase permanece ativa; (d) colisão Ctrl+K com `AdvancedSearch` |
| `HeaderActions.tsx` | ✅ IMPLEMENTADO_TOTAL | `:24`; `MainLayout.tsx:22,147` | n/a (composição) | — (o `onRestartTour` inerte é culpa do chamador, `MainLayout.tsx:149`) |
| `UserMenu.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:17`; `HeaderActions.tsx:7,143` | `useAuth` → `profiles`/`user_roles` | `:75-78` "Meu Perfil" e `:79-82` "Configurações" são `DropdownMenuItem` **sem `onClick`** — clicam e não fazem nada. Só `:86` Sair funciona |
| `RealNotificationCenter.tsx` | ✅ IMPLEMENTADO_TOTAL | `:126`; `HeaderActions.tsx:5,138`. CRUD completo de notificações e 8 preferências `:286-364` | `useRealPushNotifications` (`:20`, fora do escopo) — `NAO_VERIFICADO (runtime)` | — |
| `SLASettingsPanel.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:34`; `HeaderActions.tsx:6,140`. Validações reais `:47-62` | `useSLASettings` (store Zustand, `:18`) | `:269` o próprio label diz **"Notificações por Email (Mock)"** — canal não implementado; `emailRecipients` (`:28`) fixo em `compras@promobrindes.com.br`, sem UI de edição |
| `SupplierChat.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:41`; `MainLayout.tsx:23,180`. Presence real via Supabase Realtime `:129-164`; envio real `:198-211` | `useContactNotes` (`:20,60`) e `useFornecedores` (`:19,43`) — mensagens são gravadas como *contact notes* | (a) `:68` `online: index % 3 === 0` — status online **falsificado por posição no array**; (b) `:69,70,71` `lastMessage`, `lastMessageTime` e `unreadCount` fixos em `undefined/0` → o contador do FAB (`:225,235`) é sempre 0; (c) `:63` limita a 15 fornecedores fixos |
| `chat/ChatArea.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:70`; `SupplierChat.tsx:26,296` | recebe props | `:132` telefone, `:135` vídeo, `:221` anexo, `:240` emoji e `:145-149` os 4 itens do dropdown são botões **sem handler**. `:128-131` exibe selo "IA INSIGHT" puramente decorativo |
| `chat/MessageBubble.tsx` | ✅ IMPLEMENTADO_TOTAL | `:31`; `ChatArea.tsx:34,177` | recebe props | — |
| `GuidedBuyingAssistant.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:20`; `MainLayout.tsx:24,181`. Chat funcional via `useGuidedBuying` (`:16,24`) | `useGuidedBuying` (fora do escopo) — `NAO_VERIFICADO (runtime)` | `:37` posiciona o FAB em `fixed bottom-6 right-6 z-50` — **exatamente a mesma coordenada e z-index** de `QuickActionsFAB.tsx:116`. Os dois botões se sobrepõem; só um é clicável |
| `QuickActionsFAB.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:35`; `MainLayout.tsx:16,178` | n/a — só navegação | (a) **mojibake visível ao usuário**: `:43` `"Nova SolicitaÃ§Ã£o"`, `:162` `"Acesso RÃ¡pido"`, `:227` `"AÃ§Ãµes RÃ¡pidas"`; (b) `:86-91` a ação "Buscar" dispara `KeyboardEvent` em `window`, mas os dois listeners de Ctrl+K estão em `document` (`AdvancedSearch.tsx:79`, `CommandPalette.tsx:364`) — evento despachado no `window` não alcança listener de `document`, ação provavelmente inerte; (c) colisão de posição com `GuidedBuyingAssistant` |
| `Breadcrumbs.tsx` | ✅ IMPLEMENTADO_TOTAL | `:51`; `MainLayout.tsx:12,163`. Truncamento `:58-106`, label dinâmico `:53,112` | `useNavigation` (contexto, `App.tsx:18,73`) | — |
| `KeyboardShortcutsDialog.tsx` | ✅ IMPLEMENTADO_TOTAL | `:15`; `MainLayout.tsx:5,71`. Aberto pelo evento `show-keyboard-shortcuts` (`:21`) disparado em `HeaderActions.tsx:106` | `getShortcutsList` (`:9`) | — |
| `ClearFiltersShortcutEditor.tsx` | ✅ IMPLEMENTADO_TOTAL | `:22`; `KeyboardShortcutsDialog.tsx:10,54`. Captura, valida conflito (`:83`) e persiste (`:91`) | `lib/clearFiltersShortcut` | — |
| `ThemeToggle.tsx` | ✅ IMPLEMENTADO_TOTAL | `:14`; `HeaderActions.tsx:8,53` e `pages/auth/Auth.tsx:14,221` | `next-themes` | — |
| `LanguageSwitcher.tsx` | ✅ IMPLEMENTADO_TOTAL | `:11`; `HeaderActions.tsx:9,54`. 3 idiomas `:31-48` | `react-i18next` | — |
| `OfflineIndicator.tsx` | ✅ IMPLEMENTADO_TOTAL | `:10`; `MainLayout.tsx:19,184`. 3 estados reais `:27-48` | `useOfflineSync` (`:5`) — `NAO_VERIFICADO (runtime)` | — |

### layout — search

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `search/searchConfig.ts` | ✅ IMPLEMENTADO_TOTAL | `:36,55,66,79,97,121`; consumido em `AdvancedSearch.tsx:15-19,97`, `SearchResultsList.tsx:7-10`, `SearchEmptyState.tsx:6` | n/a (configuração) | — |
| `search/SearchResultsList.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:22`; `AdvancedSearch.tsx:21,230` | recebe props | `:80` mojibake `"Ir diretamente para a pÃ¡gina filtrada"` |
| `search/SearchEmptyState.tsx` | ✅ IMPLEMENTADO_TOTAL | `:18`; `AdvancedSearch.tsx:20,229` | `useRecentlyViewed` via prop (`AdvancedSearch.tsx:50,229`) | — |
| `search/HighlightedText.tsx` | ✅ IMPLEMENTADO_TOTAL | `:9`; `SearchResultsList.tsx:6,131,135` | recebe props | — (existem 2 outras implementações homônimas em `components/ui/enhanced-search.tsx:30` e `hooks/useFuseSearch.ts:329`, ambas fora do escopo — não são a mesma referência) |

### layout — sla-settings

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `sla-settings/SupplierThresholdConfig.tsx` | 🟨 IMPLEMENTADO_PARCIAL | `:25`; `SLASettingsPanel.tsx:20,202` | store `slaSettingsStore` (`:8`) | `:10-17` `KNOWN_SUPPLIERS` é lista **hardcoded de 6 fornecedores** com ids inventados (`xbz`, `tech`, `stricker`…). Não vem da tabela `fornecedores` (`types.ts:3247`); o `supplierId` gravado não é FK — configurar threshold para um 7º fornecedor é impossível |

### layout — transitions

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `transitions/index.ts` | ✅ IMPLEMENTADO_TOTAL | `:1-4`; `MainLayout.tsx:33` | n/a | — |
| `transitions/PageTransition.tsx` | ✅ IMPLEMENTADO_TOTAL | `:11`; `MainLayout.tsx:33,169-171` | n/a | — |
| `transitions/usePageTransition.ts` | ✅ IMPLEMENTADO_TOTAL | `:19`; `PageTransition.tsx:4,13`. Respeita `prefers-reduced-motion` (`:6-17,24`) | n/a | — |
| `transitions/presets.ts` | ✅ IMPLEMENTADO_TOTAL | `:28` PRESETS (12), `:109` resolvePreset; `usePageTransition.ts:4,24,27,32` | n/a | — |
| `transitions/config.ts` | ✅ IMPLEMENTADO_TOTAL | `:11,17`; `usePageTransition.ts:3,25,32` | n/a | — |

### pedidos

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `hooks/usePedidos.ts` | ✅ IMPLEMENTADO_TOTAL | `:111` hook + `:306` KPIs. CRUD `:133,193,213,232,249,264`; máquina de estados `:56-65,218-222`; paginação `:70-87`; realtime `:284-288`. Rota → `AppRoutes.tsx:14,89` → `Pedidos.tsx:27,56,57` | `pedidos` (`types.ts:4416`), `pedido_itens` (`:4330`); RPCs `generate_sequential_number` (`:9273`) e `get_pedidos_kpis` (`:9372`). `NAO_VERIFICADO (runtime)` | — (nota: `bulkUpdateStatus:232` e `bulkDelete:249` **ignoram** `VALID_PEDIDO_TRANSITIONS`, diferente de `updateStatus:213`) |
| `pedidos/index.ts` | ✅ IMPLEMENTADO_TOTAL | `:1`; `Pedidos.tsx:27`, `PedidoDetailsDialog.tsx:8`, `GerarOrdem.tsx:32` | n/a | — |

### solicitacoes

| Módulo | Classificação | Evidência (arquivo:linha) | Camada de dados | O que falta |
|---|---|---|---|---|
| `hooks/useSolicitacoes.ts` | 🟨 IMPLEMENTADO_PARCIAL | `useSolicitacoes` em `:92` — CRUD `:119,210,224,236,250,264,278`, validação Zod `:122`, checagem de orçamento `:134-152`, criação de workflow `:187`, auditoria `:190`. Rota → `AppRoutes.tsx:13,88` → `Solicitacoes.tsx:31,92` | `solicitacoes` (`types.ts:5686`), `cost_centers` (`:1926`); RPCs `check_budget_availability` (`:9189`), `generate_sequential_number` (`:9273`), `get_solicitacoes_kpis` (`:9373`) | `useSolicitacoesKPIs` (`:327`) **não tem nenhum chamador** (ver Órfãos) — o RPC `get_solicitacoes_kpis` existe no schema mas nunca é invocado pelo app. Além disso `:9` importa `fetchAllRows` e nunca usa |
| `schemas/solicitacao.schemas.ts` | 🟨 IMPLEMENTADO_PARCIAL | `CreateSolicitacaoSchema:9` aplicado em `useSolicitacoes.ts:122`; `SolicitacaoPrioridadeSchema:7` usado em `:13` | n/a | `SolicitacaoStatusSchema:3` sem consumidor de produção (só o teste `__tests__/solicitacao.schemas.test.ts:14`) — as transições de status em `useSolicitacoes.ts:41-49` usam strings soltas, não o enum |
| `solicitacoes/index.ts` | ✅ IMPLEMENTADO_TOTAL | `:1-2`; consumido por `Solicitacoes.tsx:31`, `solicitacoesHelpers.ts`, `Cotacao.tsx`, `Orcamentos.tsx`, `ConfiguracoesCentroCusto.tsx:24`, `components/compras/solicitacao/SolicitacaoFormSteps.tsx:16`, `components/compras/approval/ApprovalRuleModal.tsx:12` | n/a | — (nota: import circular deliberado — `useSolicitacoes.ts:12` importa do próprio `@/features/solicitacoes`, que reexporta o arquivo) |

---

## Órfãos (com prova de grep, incluindo o comando usado)

Regra aplicada: cada símbolo foi buscado por palavra inteira em **todo o repositório** (não só `src/`),
sem filtro de extensão, para capturar `import X`, `<X `, `lazy(() => import(`, re-export via `index.ts`,
uso com genéricos e menções em config/E2E. `node_modules` excluído.

### 1. `useEmpresaFilter` — ⬛ MORTO

Comando:
```
grep -rn "useEmpresaFilter" . 2>/dev/null | grep -v node_modules
```
Resultado (4 linhas, **zero chamadas**):
```
./src/features/empresas/index.ts:3:export { useEmpresaFilter } from './hooks/useEmpresaFilter';
./src/features/empresas/hooks/useEmpresaFilter.ts:16: * const { empresaIds, queryKeyPart } = useEmpresaFilter();   ← comentário JSDoc
./src/features/empresas/hooks/useEmpresaFilter.ts:27:export function useEmpresaFilter() {              ← definição
./DOCS/CODEBASE_ATLAS/07_HOOKS_STORES.md:9   ./DOCS/CODEBASE_ATLAS/03_FRONTEND_MAP.md:47   ./DOCS/CODEBASE_ATLAS/01_ARQUITETURA_GERAL.md:91   ← documentação
```
Verificação cruzada dos valores que ele retorna (`empresaIds`, `isConsolidatedView`, `queryKeyPart`):
```
grep -rn --include=*.ts --include=*.tsx "selectedEmpresaId\|empresaIds\|isConsolidatedView\|queryKeyPart" src/ \
  | grep -vE "^src/features/(empresas|auth)/"
```
→ **NENHUM**. Confirmado: definição + barrel + docs, nenhum consumidor.

### 2. `useSolicitacoesKPIs` — ⬛ MORTO (export dentro de arquivo vivo)

Comando:
```
grep -rn "useSolicitacoesKPIs" . 2>/dev/null | grep -v node_modules
```
Resultado (3 linhas):
```
./src/features/solicitacoes/hooks/useSolicitacoes.ts:327:export function useSolicitacoesKPIs() {   ← definição
./DOCS/CODEBASE_ATLAS/07_HOOKS_STORES.md:21   ./DOCS/CODEBASE_ATLAS/03_FRONTEND_MAP.md:43   ← documentação
```
Nenhum import. Contraste: o gêmeo `usePedidosKPIs` **tem** consumidor (`pages/pedidos/Pedidos.tsx:27,57`).

### 3. `MobileSidebarTrigger` — ⬛ MORTO (export dentro de arquivo vivo)

Comando:
```
grep -rn "MobileSidebarTrigger" . --include=*.ts --include=*.tsx --include=*.json --include=*.md 2>/dev/null | grep -v node_modules
```
Resultado (1 linha — só a definição):
```
./src/features/layout/components/AppSidebar.tsx:459:export const MobileSidebarTrigger = ({
```
O menu mobile real é implementado inline em `MainLayout.tsx:104-114` com um `<Button>` próprio.

### 4. `ApprovalByValueRangeItem`, `ApprovalByApproverItem`, `WeeklyTrendItem` — ⬛ MORTOS (tipos duplicados)

Comando:
```
for s in ApprovalByValueRangeItem ApprovalByApproverItem WeeklyTrendItem; do grep -rn --include=*.ts --include=*.tsx -E "\b$s\b" src/; done
```
Resultado — cada símbolo aparece 3×, e **as 2 utilizações reais apontam para a cópia em `pages/`**:
```
src/features/aprovacoes/types/approval.types.ts:18  ApprovalByValueRangeItem   ← definição em features, 0 usos
src/pages/aprovacoes/aprovacoesData.ts:23           ApprovalByValueRangeItem   ← redeclaração
src/pages/aprovacoes/aprovacoesData.ts:78           approvalByValueRange: ApprovalByValueRangeItem[]   ← uso da cópia

src/features/aprovacoes/types/approval.types.ts:24  ApprovalByApproverItem     ← 0 usos
src/pages/aprovacoes/aprovacoesData.ts:29 / :86     ← redeclaração + uso

src/features/aprovacoes/types/approval.types.ts:43  WeeklyTrendItem            ← 0 usos
src/pages/aprovacoes/aprovacoesData.ts:48 / :107    ← redeclaração + uso
```
`ApprovalTrendItem`, `StatusDistributionItem` e `BottleneckItem` também estão duplicados em
`aprovacoesData.ts`, mas a versão de `features/` é usada internamente por
`ApprovalCharts.tsx:20-24` — **não são órfãos**. Só `ApprovalHistoryItem` é importado de `features/`
para fora (`pages/aprovacoes/Aprovacoes.tsx:22`).

### 5. `SolicitacaoStatusSchema` — ⬛ MORTO em produção

Comando:
```
grep -rn --include=*.ts --include=*.tsx "SolicitacaoStatusSchema" src/
```
Resultado: definição em `schemas/solicitacao.schemas.ts:3` + 9 linhas no arquivo de teste
`schemas/__tests__/solicitacao.schemas.test.ts`. Nenhum uso de produção.

### 6. `src/components/compras/MainLayout.tsx` — ⬛ MORTO (fora do escopo de edição, registrado)

Comando:
```
grep -rn "compras/MainLayout" . 2>/dev/null | grep -v node_modules
```
→ **NENHUM**. O arquivo tem 1 linha: `export { MainLayout } from "@/features/layout/components/MainLayout";`

### Falsos-positivos evitados (símbolos que PARECEM órfãos e não são)

| Símbolo | Por que parece órfão | Por que está vivo |
|---|---|---|
| `EmpresaBadge` | não aparece em `pages/` | `EmpresaSelector.tsx:13,43,99` → `HeaderActions.tsx:55` |
| `EmpresaSelector` | idem | `HeaderActions.tsx:13,55` (import via barrel `@/features/empresas`) |
| `HighlightedText` | 3 arquivos definem símbolo homônimo | o do escopo é importado por caminho relativo em `SearchResultsList.tsx:6` |
| `PageTransition` | `components/animations/MotionComponents.tsx:201` define homônimo | `MainLayout.tsx:33` importa explicitamente de `@/features/layout/transitions` |
| `ModuleErrorFallback` | não aparece fora do arquivo | usado internamente em `ModuleErrorBoundary.tsx:176` |
| `PRESETS` / `resolvePreset` | só reexportados no barrel | `usePageTransition.ts:4,24,27,32` |
| `withModuleErrorBoundary` | uso único e distante | `pages/dashboard/DashboardExecutivo.tsx:3,23` |
| `roleLabels` / `roleColors` | poucos usos | `UserMenu.tsx:14` e `components/security/PermissionMatrix.tsx:11` |
| `KNOWN_SUPPLIERS` | só o próprio arquivo | `SupplierThresholdConfig.tsx:86` (mesmo arquivo) — é interno, mas exportado e testado |
| `quickActions` (searchConfig) | nome colide com variável local de `QuickActionsFAB.tsx:40` | o do `searchConfig.ts:79` é usado em `SearchEmptyState.tsx:6,65` |
| `Shell` | nome genérico | `AppRoutes.tsx:6,83` |

---

## Achados graves

**G1 — Filtro multi-empresa é uma UI que não filtra nada.**
`EmpresaSelector.tsx:20` está no header de todas as páginas (`HeaderActions.tsx:55`) e permite escolher
uma empresa do grupo. `setSelectedEmpresa` (`useAuth.tsx:32-40`) grava em `localStorage` e roda
`queryClient.invalidateQueries()` — refaz **as mesmas queries, sem filtro novo**. O hook que aplicaria o
filtro, `useEmpresaFilter.ts:27`, tem zero chamadores. Nenhuma query em `useSolicitacoes.ts:59-86`,
`usePedidos.ts:75-103` ou `useCotacoes.ts:40-57` lê `selectedEmpresaId`; todas filtram apenas por
`organization_id` (o **grupo**, não a empresa). Consequência: trocar de empresa muda o badge no header
e nada mais — o usuário acredita estar em visão segregada e está vendo o grupo inteiro.
Prova: `grep -rn "selectedEmpresaId" src/ | grep -vE "^src/features/(empresas|auth)/"` → NENHUM.

**G2 — "Sair" do Command Palette não desloga.**
`CommandPalette.tsx:168`: `{ id: "sair", label: "Sair", action: () => navigate("/auth") }`.
Só navega. Não chama `signOut` (`useAuth.tsx:227`), que é quem faz `supabase.auth.signOut()`,
`queryClient.clear()` e limpa profile/role/tenant. Como `ProtectedRoute.tsx:26` só checa `!user` e o
usuário continua autenticado, voltar para qualquer rota reabre a sessão — com o cache do React Query
intacto. Em máquina compartilhada isso é vazamento de dados entre usuários. O `signOut` correto existe
e é usado em `UserMenu.tsx:87` e `AppSidebar.tsx:418,443`.

**G3 — Duas caixas de busca disputam o mesmo Ctrl+K.**
`AdvancedSearch.tsx:76` (`document.addEventListener` em `:79`) e `CommandPalette.tsx:358`
(`document.addEventListener` em `:364`) registram o mesmo atalho, e ambos os componentes estão montados
simultaneamente (`MainLayout.tsx:70` e `:144`). Nenhum chama `stopPropagation`. Pressionar Ctrl+K abre
os dois diálogos empilhados. `NAO_VERIFICADO (runtime)` quanto a qual fica por cima.

**G4 — Dois FABs na mesma coordenada.**
`QuickActionsFAB.tsx:116` = `fixed bottom-6 right-6 z-50`; `GuidedBuyingAssistant.tsx:37` =
`fixed bottom-6 right-6 ... z-50`. Ambos montados em `MainLayout.tsx:178` e `:181`. Sobreposição total;
o segundo no DOM cobre o primeiro. (`SupplierChat.tsx:230` usa `right-24` e escapa.)

**G5 — Classes Tailwind corrompidas por escape de HTML.**
`MainLayout.tsx:90`, `MainLayout.tsx:97` e `AppSidebar.tsx:342` contêm `ease-&lsqb;cubic-bezier(...)]`
dentro da string de classe. `&lsqb;` é a entidade HTML de `[` e **não é interpretada dentro de uma
string JS**; a classe arbitrária do Tailwind nunca é gerada. Três transições (drawer mobile, deslocamento
do conteúdo, largura da sidebar) rodam com o easing padrão. Sintoma de conteúdo que passou por um
escapador de HTML durante alguma edição automatizada.

**G6 — Mojibake UTF-8 visível ao usuário final.**
`QuickActionsFAB.tsx:43` `"Nova SolicitaÃ§Ã£o"`, `:162` `"Acesso RÃ¡pido"`, `:227` `"AÃ§Ãµes RÃ¡pidas"`;
`search/SearchResultsList.tsx:80` `"Ir diretamente para a pÃ¡gina filtrada"`. São textos renderizados,
não comentários. Mesma origem provável de G5 (arquivo salvo com dupla codificação).

**G7 — A tela de Aprovações mostra métricas inventadas com aparência de dado real.**
Os 4 KPIs e os 3 gráficos de `/aprovacoes` (`AppRoutes.tsx:21,96`) são alimentados por arrays literais
de `pages/aprovacoes/aprovacoesData.ts:54-110`, cujo cabeçalho `:1-4` admite `"Mock data"`. Os componentes
que os desenham vivem no escopo auditado (`ApprovalCharts.tsx:48,78,119`, `ApprovalStats.tsx:50`) e não
têm nenhuma indicação visual de que o dado é fictício. Pior: `ApprovalStats.tsx:57` e `:65` cravam
`"+2.3% vs período anterior"` e `"-0.8h vs período anterior"` **no JSX**, sem relação com prop alguma —
esses números não mudariam nem se os dados fossem reais. Na mesma página, `PendingApprovalsList` e
`DynamicApprovalMatrix` (`Aprovacoes.tsx:4,5`) usam dados reais via `useApprovalWorkflow` — mock e real
convivem lado a lado sem distinção para o usuário.

**G8 — Injeção de padrão `ilike` na busca global.**
`AdvancedSearch.tsx:119-123` monta 5 filtros `.or(\`titulo.ilike.%${searchQuery}%,...\`)` com a string
crua do usuário. O projeto tem `escapeIlike` e o aplica corretamente em `usePedidos.ts:96` e
`useSolicitacoes.ts:79-80` — mas não aqui. Caracteres `%`, `_` e `,` alteram a semântica do filtro
PostgREST. Não é escalação de privilégio (RLS permanece), mas é vazamento de escopo de resultado e
possível varredura de tabela. `NAO_VERIFICADO (runtime)`.

**G9 — Layout duplicado em 8 rotas.**
`Shell.tsx:14` já renderiza `MainLayout` para toda rota protegida (`AppRoutes.tsx:83`). Mesmo assim,
8 páginas importam e renderizam `MainLayout` de novo por dentro: `pages/catalogo-spot/CatalogoSpot.tsx:2`,
`pages/catalogo-xbz/CatalogoXbz.tsx:2`, `pages/licitacoes/Licitacoes.tsx:16`,
`pages/orcamentos/Orcamentos.tsx:3`, `pages/portal-fornecedor/PortalFornecedor.tsx:9`,
`pages/qualificacao/QualificacaoFornecedores.tsx:2`, `pages/seguranca/Seguranca.tsx:3`,
`pages/configuracoes/ConfiguracoesCentroCusto.tsx:2`. Resultado esperado: duas sidebars, dois headers,
duas instâncias de `SupplierChat`/`GuidedBuyingAssistant`/`CommandPalette` e dois listeners de Ctrl+K
adicionais nessas rotas. `NAO_VERIFICADO (runtime)`, mas a leitura do código não deixa outra saída.

**G10 — Botões-fantasma no menu do usuário e no chat.**
`UserMenu.tsx:75-82`: "Meu Perfil" e "Configurações" são `DropdownMenuItem` sem `onClick`.
`chat/ChatArea.tsx:132,135,221,240,145-149`: telefone, vídeo, anexo, emoji e os 4 itens do dropdown
idem. `CommandPalette.tsx:144,145,165,166,167`: cinco entradas com `action: () => {}`.
`MainLayout.tsx:149`: `onRestartTour={() => {}}` mata o botão de tour renderizado em
`HeaderActions.tsx:118-135`. São 14 controles clicáveis que não fazem nada.

**G11 — Presença e contadores falsos no chat de fornecedores.**
`SupplierChat.tsx:68`: `online: index % 3 === 0` — um terço dos fornecedores aparece "Online" (com
bolinha verde em `:274` e badge "Online" em `ChatArea.tsx:116`) por posição no array, não por presença
real. Há infra de presence real no mesmo arquivo (`:129-164`), usada apenas para "digitando". Além disso
`:71` fixa `unreadCount: 0`, então o badge de não-lidas do FAB (`:225,235`) nunca aparece.

**G12 — Operações em lote burlam a máquina de estados.**
`usePedidos.ts:213-229` (`updateStatus`) valida `VALID_PEDIDO_TRANSITIONS` (`:56-65`).
`bulkUpdateStatus` (`:232-246`) faz `.update({status}).in('id', ids)` **sem validar transição alguma**.
Mesmo padrão em `useSolicitacoes.ts:224-234` vs `bulkUpdateStatus:264-276`. Selecionar N pedidos na
tela e aplicar status em lote permite `entregue → pendente`, proibido individualmente.
`Pedidos.tsx:56` expõe exatamente essa função na UI.

**G13 — `hasRole` faz admin passar por tudo, sem exceção.**
`useAuth.tsx:280-291`: `if (role === 'admin') return true;` antes de qualquer verificação. Combinado com
`ProtectedRoute.tsx:30`, a rota `/portal-fornecedor` declarada como `requiredRole={['supplier','admin']}`
(`AppRoutes.tsx:136`) é acessível ao admin — o que provavelmente é intencional — mas o mesmo bypass
vale para **qualquer** verificação futura de papel exclusivo. Registrado como risco de design, não como
bug confirmado.

**G14 — Thresholds de SLA por fornecedor não conectam com o cadastro real.**
`sla-settings/SupplierThresholdConfig.tsx:10-17`: `KNOWN_SUPPLIERS` é uma lista fixa de 6 ids literais
(`'xbz'`, `'tech'`, `'stricker'`, `'premium'`, `'asia'`, `'eco'`). A tabela `fornecedores` existe
(`types.ts:3247`) e é consultada em toda a aplicação (ex.: `SupplierChat.tsx:19,43`). As configurações
gravadas (`SLASettingsPanel.tsx:202-211` → store) usam esses ids inventados como chave, sem FK.
Qualquer fornecedor fora dessa lista de 6 é inconfigurável.

---

## Limitações desta auditoria

- Sem acesso ao banco: existência de tabelas/RPCs foi verificada só em
  `src/integrations/supabase/types.ts` (arquivo gerado). Se o schema real divergir do arquivo gerado,
  as afirmações de "camada de dados" caem. Marcado `NAO_VERIFICADO (runtime)` onde aplicável.
- Sem execução da aplicação: G3, G4, G8 e G9 são deduzidos por leitura de código. A conclusão de que
  "os dois diálogos abrem" e "os dois FABs se sobrepõem" é a leitura mais direta do código, mas não
  foi observada em navegador.
- A afirmação de que `QuickActionsFAB.tsx:86-91` é inerte baseia-se em `KeyboardEvent` despachado em
  `window` não alcançar listeners registrados em `document` (window é o último alvo do bubbling).
  Não testado — tratado como suspeita forte, não como fato.
- Os arquivos de `src/pages/` e `src/components/compras/` foram lidos apenas nos trechos necessários
  para provar a cadeia de importação. Não foram auditados — isso é escopo de outros lotes.
- `DOCS/ADR/0001` e `DOCS/CODEBASE_ATLAS/*` foram citados apenas como hipótese/contraste, nunca como
  prova. Nota relevante: o ATLAS documenta `useEmpresaFilter` e `useSolicitacoesKPIs` como se estivessem
  em uso — é documentação que descreve intenção, não o que roda.

---

## ARQUIVOS LIDOS

Todos os 63 arquivos do escopo (`src/features/`), lidos integralmente:

src/features/aprovacoes/components/ApprovalCharts.tsx
src/features/aprovacoes/components/ApprovalStats.tsx
src/features/aprovacoes/index.ts
src/features/aprovacoes/types/approval.types.ts
src/features/auth/__tests__/useAuth.test.tsx
src/features/auth/components/ProtectedRoute.tsx
src/features/auth/hooks/AuthContext.ts
src/features/auth/hooks/useAuth.tsx
src/features/auth/hooks/useAuthContext.ts
src/features/auth/index.ts
src/features/auth/schemas/__tests__/auth.schemas.test.ts
src/features/auth/schemas/auth.schemas.ts
src/features/auth/types/__tests__/authRoles.test.ts
src/features/auth/types/authRoles.ts
src/features/cotacoes/hooks/useCotacoes.ts
src/features/cotacoes/index.ts
src/features/empresas/components/EmpresaBadge.tsx
src/features/empresas/components/EmpresaSelector.tsx
src/features/empresas/hooks/useEmpresaFilter.ts
src/features/empresas/index.ts
src/features/layout/components/AdvancedSearch.tsx
src/features/layout/components/AppSidebar.tsx
src/features/layout/components/Breadcrumbs.tsx
src/features/layout/components/ClearFiltersShortcutEditor.tsx
src/features/layout/components/CommandPalette.tsx
src/features/layout/components/GuidedBuyingAssistant.tsx
src/features/layout/components/HeaderActions.tsx
src/features/layout/components/KeyboardShortcutsDialog.tsx
src/features/layout/components/LanguageSwitcher.tsx
src/features/layout/components/MainLayout.tsx
src/features/layout/components/ModuleErrorBoundary.tsx
src/features/layout/components/OfflineIndicator.tsx
src/features/layout/components/PageLoader.tsx
src/features/layout/components/QuickActionsFAB.tsx
src/features/layout/components/RealNotificationCenter.tsx
src/features/layout/components/SLASettingsPanel.tsx
src/features/layout/components/Shell.tsx
src/features/layout/components/SupplierChat.tsx
src/features/layout/components/ThemeToggle.tsx
src/features/layout/components/UserMenu.tsx
src/features/layout/components/chat/ChatArea.tsx
src/features/layout/components/chat/MessageBubble.tsx
src/features/layout/components/search/HighlightedText.tsx
src/features/layout/components/search/SearchEmptyState.tsx
src/features/layout/components/search/SearchResultsList.tsx
src/features/layout/components/search/__tests__/searchConfig.test.ts
src/features/layout/components/search/searchConfig.ts
src/features/layout/components/sla-settings/SupplierThresholdConfig.tsx
src/features/layout/components/sla-settings/__tests__/knownSuppliers.test.ts
src/features/layout/transitions/PageTransition.tsx
src/features/layout/transitions/__tests__/config.test.ts
src/features/layout/transitions/__tests__/presets.test.ts
src/features/layout/transitions/config.ts
src/features/layout/transitions/index.ts
src/features/layout/transitions/presets.ts
src/features/layout/transitions/usePageTransition.ts
src/features/pedidos/hooks/usePedidos.ts
src/features/pedidos/index.ts
src/features/solicitacoes/hooks/__tests__/useSolicitacoes.test.tsx
src/features/solicitacoes/hooks/useSolicitacoes.ts
src/features/solicitacoes/index.ts
src/features/solicitacoes/schemas/__tests__/solicitacao.schemas.test.ts
src/features/solicitacoes/schemas/solicitacao.schemas.ts

Arquivos fora do escopo lidos como âncora ou prova de cadeia de execução (integralmente):

src/App.tsx
src/routes/AppRoutes.tsx
src/components/compras/MainLayout.tsx

Arquivos fora do escopo lidos parcialmente (trechos citados como evidência):

src/pages/aprovacoes/Aprovacoes.tsx (linhas 1-70, 190-210)
src/pages/aprovacoes/aprovacoesData.ts (linhas 1-80)
DOCS/ADR/0001-feature-based-architecture.md (linhas 1-30)
src/integrations/supabase/types.ts (índice de tabelas e RPCs via grep)
