# 01 — Inventário do sistema e registro de cobertura

> Auditoria QA somente-leitura · HEAD `d9c58bc` (2026-11-22) · branch de trabalho `claude/chore-auditoria-qa-261122-2100`.
> Fontes: código do repositório + contexto gerado na branch `contexto` (`docs/contexto/`, coleta de 2026-11-22) + execuções reais de `typecheck`, `eslint`, `vitest`, `build` e `deno check` nesta sessão.
> Toda linha marcada **EXECUTADO** teve comando rodado nesta sessão com saída observada. **RASTREADO** = caminho seguido pelo código, sem execução.

---

## 1. Suposições declaradas (o campo `<contexto>` do pedido veio vazio)

Deduzidas do código e do schema; se alguma estiver errada, o plano muda:

| # | Suposição | Base |
|---|---|---|
| S1 | O sistema é um **módulo de compras (procurement) B2B multiempresa**: solicitação → cotação → aprovação → ordem de compra → acompanhamento → recebimento → pagamento/fiscal. | `src/pages/*` + enums `audit_entity_type` (solicitacao, cotacao, pedido, pagamento, fornecedor) · `docs/contexto/supabase/types-enums.md` |
| S2 | Os usuários são **internos** (comprador, coordenador, financeiro, admin, visualizador) e, em teoria, **fornecedores** por um portal. | enum `app_role` = admin, coordinator, buyer, finance, viewer · `src/features/auth/types/authRoles.ts:1` |
| S3 | **Multiempresa (multi-tenant) por `tenant_id`/`organization_id`**, com 1 tenant e ~12 usuários hoje. | `public.tenants` ≈ 1 linha, `public.user_tenants` ≈ 12, `public.profiles` ≈ 12 · `docs/contexto/supabase/stats.md` |
| S4 | **Catálogo, estoque e preço nascem fora deste sistema** (PIM Promo Gifts V4); aqui são consumidos por leitura. | `AGENTS.md` seção "Catálogo e fornecedores" · `supabase/functions/external-db-bridge/` |
| S5 | O sistema está **em produção mas com uso real muito baixo**: 11 solicitações, 61 cotações, 34 pedidos, 3 pagamentos. | `docs/contexto/supabase/stats.md` |
| S6 | O que mais incomoda hoje (deduzido do cahier de pendências, 90 dias de commits): **telas que mostravam número inventado** e **etapas do fluxo que não gravavam**. A maior parte já foi corrigida. | `docs/pendencias/_indice.md` · 50 commits desde 2026-08-16 |

---

## 2. Stack, build e ambientes

| item | valor | cobertura |
|---|---|---|
| Linguagem / framework | TypeScript + React 18 + Vite | revisado |
| Roteador | react-router (55 rotas, 52 protegidas) | revisado |
| Estado | TanStack Query + Zustand (5 stores) | revisado |
| UI | Tailwind + Radix/shadcn (330 componentes) | revisado |
| i18n | i18next, 3 idiomas (pt/en/es), 7 arquivos | revisado |
| Backend | Supabase: Postgres 17.6 + 40 edge functions (Deno) | revisado |
| Banco oficial | ref `lmypcdfsrgfftzhxawao` ("Promo Supply - V2") | revisado |
| Build | `vite build` — **EXECUTADO**: exit 0, 5,27 s, PWA gerado (173 entradas de precache) | EXECUTADO |
| Gerenciador de pacotes | bun (`bun.lock`), mas o repo tem também `bun.lockb` **e** `package-lock.json`; sem `engines`/`packageManager`/`.nvmrc` | revisado |
| Deploy front | Vercel, projeto `promo-supply-v2`, team `juca1`; merge em `main` = produção | revisado (sem acesso à API da Vercel nesta sessão) |
| Deploy edge | `.github/workflows/deploy-edge-functions.yml` em push de `main` que toque `supabase/functions/**` | revisado |
| Ambientes | **um só**: produção. Não há banco local, `.env` não é versionado (`.gitignore:50-51`), `npm run dev`/`test:rls`/e2e falam com produção | revisado |
| Migrations | 325 arquivos em `supabase/migrations/`; **não há ledger** `supabase_migrations.schema_migrations` (14 linhas registradas no snapshot vs 325 arquivos) | revisado |

### Portões de qualidade — estado medido nesta sessão

| portão | comando | resultado | modo |
|---|---|---|---|
| Tipos (app) | `npm run typecheck` | **exit 0**, 0 erros; `tsc -p tsconfig.app.json --listFiles` cobre **628 arquivos de `src/`** (o gate não é mais no-op) | EXECUTADO |
| Lint | `npx eslint .` | **exit 0**, 0 erros, **10 warnings** | EXECUTADO |
| Testes unitários | `npx vitest run` | **122 arquivos passam, 1 skipped; 2311 testes passam, 12 skipped** (36,4 s) | EXECUTADO |
| Build | `npm run build` | **exit 0** | EXECUTADO |
| Tipos das edge functions | `deno check` (Deno 2.9.8 / TS 6.0.3) em cada `supabase/functions/*/index.ts` | **19 de 40 falham**; nenhum workflow de CI roda `deno check` | EXECUTADO |
| RLS | `npm run test:rls` | **não executado de propósito**: fala com produção e faz login real | não coberto — ver §8 |
| E2E | `npm run test:e2e` | **não executado**: aponta para produção e exige `E2E_TEST_EMAIL`/`PASSWORD` | não coberto — ver §8 |

---

## 3. Atores e papéis

| ator | papel no enum `app_role` | de onde vem | jornada principal |
|---|---|---|---|
| Administrador | `admin` | `user_roles.role` | tudo, incluindo 11 telas `/admin/*`, segurança, auditoria, workflows |
| Coordenador | `coordinator` | `user_roles.role` | aprova, configura regras de aprovação e centro de custo |
| Comprador | `buyer` | `user_roles.role` | cria solicitação, cota, gera ordem, acompanha, recebe |
| Financeiro | `finance` | `user_roles.role` | pagamentos, orçamento, documentos fiscais |
| Visualizador | `viewer` | `user_roles.role` | leitura de dashboards e relatórios |
| **Fornecedor** | `supplier` — **existe no tipo do front e NÃO existe no enum do banco** | — | `/portal-fornecedor` exige `['supplier','admin']` → nenhum fornecedor alcança |
| Visitante sem login | — | — | só `/auth`, `/*` (NotFound) e **`/__dev/xbz-network-panel`** |
| `service_role` (edges/cron) | — | chave de serviço | jobs, sincronizações, webhooks |

**Fonte do papel:** `src/features/auth/hooks/useAuth.tsx:54` lê `user_roles` com `.maybeSingle()`; `src/features/auth/components/ProtectedRoute.tsx:30` usa `hasRole()`. `public.user_roles` tem `UNIQUE (user_id, role)` — ou seja, **o banco permite vários papéis por usuário** e o front lê um só. Ver achado em `03-ACHADOS.md`.

### Jornadas mapeadas (do primeiro clique ao dado gravado)

| # | Jornada | Ator | Rota de entrada | Tabelas que grava |
|---|---|---|---|---|
| J1 | Criar solicitação de compra | buyer | `/solicitacoes` | `solicitacoes` (+ edge `process-solicitacao-neural`) |
| J2 | Cotar com fornecedores e selecionar vencedor | buyer | `/cotacao`, `/cotacao/:id` | `cotacoes`, `solicitacoes.status` (trigger) |
| J3 | Aprovar / rejeitar / escalar | coordinator, admin | `/aprovacoes` | `approval_workflows`, `approval_steps`, `approval_history`, `solicitacoes.status` |
| J4 | Gerar ordem de compra | buyer | `/gerar-ordem` | `pedidos`, `pedido_itens` |
| J5 | Acompanhar pedido (Kanban) | buyer | `/acompanhamento`, `/kanban` | `pedidos.status` |
| J6 | Receber mercadoria (inclusive offline) | buyer | `/recebimento` | `pedidos`, `estoque`, `estoque_movimentacoes`, `receiving_checklists` |
| J7 | Pagar e tratar documento fiscal | finance | `/pagamentos`, `/documentos-fiscais` | `pagamentos`, `fiscal_documents` (+ edge `process-invoice-idp`) |
| J8 | Devolver / crédito com fornecedor | buyer | `/devolucoes` | `devolucoes`, `devolucao_itens`, `creditos_fornecedor` |
| J9 | Cadastrar e qualificar fornecedor | admin | `/fornecedores`, `/qualificacao-fornecedores` | `fornecedores`, `supplier_documents`, `supplier_qualification_scores` |
| J10 | Buscar produto no catálogo do fornecedor | buyer | `/catalogo-xbz`, `/catalogo-spot`, `/catalogo-produtos` | leitura via `external-db-bridge`; `spot_*` por cron |
| J11 | Sourcing / RFx / leilão | admin | `/sourcing`, `/sourcing/novo`, `/sourcing/:id`, `/sourcing/:id/auction` | `sourcing_*`, `auction_bids` |
| J12 | Contratos | admin | `/contratos` | `contracts`, `contract_items`, `contract_penalties` |
| J13 | Login (senha, passkey, SSO/SCIM) | todos | `/auth` | `login_attempts`, `account_lockouts`, `webauthn_*`, `active_sessions` |
| J14 | Portal do fornecedor | supplier | `/portal-fornecedor` | — **inalcançável, ver §3** |
| J15 | Administração e observabilidade | admin | `/admin/*`, `/seguranca`, `/auditoria`, `/admin/telemetria` | `system_alerts`, `audit_logs`, `health_scan_runs`, `telemetry_logs` |

---

## 4. Rotas (54 telas + 1 redirect) — url → arquivo → papel exigido → edges

| rota | protegida | arquivo (`src/`) | hooks | papel exigido | edges |
|---|---|---|---|---|---|
| `/__dev/xbz-network-panel` | **NÃO** | pages/dev/XbzNetworkPanelHarness.tsx | 12 | — | telemetry, xbz-proxy |
| `/*` | **NÃO** | pages/NotFound.tsx | 2 | — | telemetry |
| `/acompanhamento` | sim | pages/acompanhamento/Acompanhamento.tsx | 21 | — | telemetry |
| `/admin/dependency-health` | sim | pages/admin/DependencyHealth.tsx | 13 | admin | dependency-health, telemetry |
| `/admin/docs` | sim | pages/admin/DeveloperDocs.tsx | 7 | — | external-db-bridge, process-solicitacao-neural, telemetry |
| `/admin/erp` | sim | pages/admin/ERPConnections.tsx | 15 | admin | erp-credential-encrypt, erp-sync, telemetry |
| `/admin/fiscal` | sim | pages/admin/FiscalDashboard.tsx | 2 | — | — |
| `/admin/health` | sim | pages/admin/HealthDashboard.tsx | 11 | admin | telemetry |
| `/admin/health/alerts/:id` | sim | pages/admin/AlertDetail.tsx | 2 | — | health-dashboard |
| `/admin/punchout` | sim | pages/admin/PunchOutCatalogs.tsx | 20 | admin | punchout-encrypt, punchout-setup, telemetry |
| `/admin/sourcing-pipeline` | sim | pages/admin/SourcingPipeline.tsx | 2 | — | — |
| `/admin/sso` | sim | pages/admin/SSOConfig.tsx | 15 | admin | scim-v2, telemetry |
| `/admin/storage-migration` | sim | pages/admin/StorageMigration.tsx | 6 | — | migrate-storage-paths |
| `/admin/telemetria` | sim | pages/admin-telemetria/AdminTelemetria.tsx | 8 | — | system-simulation, telemetry |
| `/admin/workflows` | sim | pages/admin/WorkflowAdmin.tsx | 15 | admin | telemetry |
| `/aprovacoes` | sim | pages/aprovacoes/Aprovacoes.tsx | 29 | admin | telemetry |
| `/auditoria` | sim | pages/auditoria/Auditoria.tsx | 13 | admin | run-audit, telemetry |
| `/auth` | **NÃO** | pages/auth/Auth.tsx | 19 | admin | telemetry, webauthn-authenticate, webauthn-register |
| `/buyer-performance` | sim | pages/buyer/BuyerPerformanceDashboard.tsx | 17 | admin | telemetry |
| `/catalogo-produtos` | sim | pages/catalogo-produtos/CatalogoProdutos.tsx | 27 | admin | telemetry |
| `/catalogo-spot` | sim | pages/catalogo-spot/CatalogoSpot.tsx | 194 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, spot-api, spot-proxy, telemetry |
| `/catalogo-xbz` | sim | pages/catalogo-xbz/CatalogoXbz.tsx | 186 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry, xbz-proxy |
| `/compliance` | sim | pages/compliance/ComplianceDashboard.tsx | 15 | admin | telemetry |
| `/compras` | sim | pages/dashboard/ComprasDashboard.tsx | 46 | admin | ai-demand-prediction, escalate-solicitacao, telemetry |
| `/configuracoes-centro-custo` | sim | pages/configuracoes/ConfiguracoesCentroCusto.tsx | 182 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry |
| `/contratos` | sim | pages/contratos/Contratos.tsx | 15 | admin | generate-contract-pdf, telemetry |
| `/cotacao` | sim | pages/cotacao/Cotacao.tsx | 38 | admin | ai-supplier-suggestion, telemetry |
| `/cotacao/:id` | sim | pages/cotacao/Cotacao.tsx | 38 | admin | ai-supplier-suggestion, telemetry |
| `/dashboard-executivo` | sim | pages/dashboard/DashboardExecutivo.tsx | 39 | admin | telemetry |
| `/devolucoes` | sim | pages/devolucoes/Devolucoes.tsx | 27 | admin | telemetry |
| `/documentos-fiscais` | sim | pages/documentos/DocumentosFiscais.tsx | 11 | — | process-invoice-idp, telemetry |
| `/estoque` | sim | pages/estoque/GestaoEstoque.tsx | 22 | admin | telemetry |
| `/fornecedores` | sim | pages/fornecedores/Fornecedores.tsx | 25 | admin | ai-supplier-risk, ai-supplier-suggestion, telemetry |
| `/gerar-ordem` | sim | pages/gerar-ordem/GerarOrdem.tsx | 28 | admin | external-db-bridge, telemetry |
| `/historico-compras` | sim | pages/historico/HistoricoCompras.tsx | 34 | admin | telemetry |
| `/kanban` | sim | pages/kanban/KanbanWorkflow.tsx | 9 | — | telemetry |
| `/licitacoes` | sim | pages/licitacoes/Licitacoes.tsx | 182 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry |
| `/negociacao-ia` | sim | pages/negociacao-ia/NegociacaoIA.tsx | 15 | admin | ai-negotiation, telemetry |
| `/orcamentos` | sim | pages/orcamentos/Orcamentos.tsx | 184 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry |
| `/pagamentos` | sim | pages/pagamentos/Pagamentos.tsx | 35 | admin | telemetry |
| `/pedidos` | sim | pages/pedidos/Pedidos.tsx | 43 | admin | telemetry |
| `/portal-fornecedor` | sim | pages/portal-fornecedor/PortalFornecedor.tsx | 184 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry |
| `/qualificacao-fornecedores` | sim | pages/qualificacao/QualificacaoFornecedores.tsx | 184 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry |
| `/recebimento` | sim | pages/recebimento/RecebimentoOffline.tsx | 15 | admin | telemetry |
| `/recompra-inteligente` | sim | pages/recompra/RecompraInteligente.tsx | 17 | admin | external-db-bridge, telemetry |
| `/relatorios` | sim | pages/relatorios/Relatorios.tsx | 22 | admin | ai-demand-prediction, telemetry |
| `/relatorios/negociacoes` | sim | pages/relatorio-negociacoes/RelatorioNegociacoes.tsx | 17 | admin | telemetry |
| `/seguranca` | sim | pages/seguranca/Seguranca.tsx | 196 | admin, assistant, user | ai-demand-prediction, ai-supplier-risk, ai-supplier-suggestion, check-sla-alerts, escalate-solicitacao, external-db-bridge, generate-contract-pdf, guided-buying-ai, process-solicitacao-neural, telemetry, webauthn-authenticate, webauthn-register |
| `/solicitacoes` | sim | pages/solicitacoes/Solicitacoes.tsx | 55 | admin | process-solicitacao-neural, telemetry |
| `/sourcing` | sim | pages/sourcing/Sourcing.tsx | 26 | admin | telemetry |
| `/sourcing/:id` | sim | pages/sourcing/RFxDetails.tsx | 27 | admin | telemetry |
| `/sourcing/:id/auction` | sim | pages/sourcing/AuctionRoom.tsx | 27 | admin | telemetry |
| `/sourcing/novo` | sim | pages/sourcing/RFxCreate.tsx | 26 | admin | telemetry |
| `/supplier-performance` | sim | pages/fornecedores/SupplierPerformance.tsx | 13 | admin | telemetry |

> **Aviso sobre a coluna "papel exigido"**: o campo `papeis` do inventário gerado é extração heurística e **não é confiável** (traz `assistant`/`user`, que são papéis de mensagem de IA, e marca `admin` em telas sem guarda). A verdade está em `src/routes/AppRoutes.tsx`: **apenas 13 rotas** usam `requiredRole` — as 12 de `/admin/*` (`:123-134`, todas `"admin"`) e `/portal-fornecedor` (`:136`, `['supplier','admin']`). Todas as outras 41 telas estão apenas sob `<ProtectedRoute><Shell /></ProtectedRoute>` (`:84`), que só exige **estar logado**. `/__dev/xbz-network-panel` está atrás de `import.meta.env.DEV` (`:140-145`) e **não existe no build de produção** — verificado.

---

## 5. Edge functions (40) — quem chama, o que toca, estado dos tipos

| função | chamada por | tabelas | testes Deno | `deno check` |
|---|---|---|---|---|
| `ai-demand-prediction` | front (1) | — | 0 | **falha** |
| `ai-negotiation` | front (1) | — | 0 | **falha** |
| `ai-supplier-risk` | front (1) | — | 0 | ok |
| `ai-supplier-suggestion` | front (1) | — | 0 | **falha** |
| `alert-dispatcher` | **ninguém no repo** | system_alerts | 0 | **falha** |
| `check-approval-escalations` | SQL/cron | approval_history, approval_steps, approval_workflows | 0 | **falha** |
| `check-cotacao-followup` | SQL/cron | cotacoes, notifications, profiles | 1 | ok |
| `check-expiry-alerts` | SQL/cron | contracts, cotacoes, pagamentos, user_roles | 1 | ok |
| `check-sla-alerts` | front (1), SQL/cron | pagamentos, pedidos, solicitacoes, user_roles | 1 | **falha** |
| `dependency-health` | front (1) | audit_logs, dependency_health, dependency_health_history | 1 | ok |
| `erp-credential-encrypt` | front (1) | user_tenants | 0 | ok |
| `erp-sync` | front (1) | erp_connections, erp_sync_log | 0 | **falha** |
| `escalate-solicitacao` | front (1) | approval_history, pedidos, profiles, solicitacoes, user_roles | 1 | ok |
| `external-db-bridge` | front (2) | query_telemetry | 0 | **falha** |
| `fiscal-orchestrator` | **ninguém no repo** | fiscal_events | 0 | **falha** |
| `generate-contract-pdf` | front (1) | contract_items, contract_penalties, contracts | 0 | ok |
| `guided-buying-ai` | front (1) | fornecedores, produtos | 0 | **falha** |
| `health-dashboard` | front (1) | audit_logs, health_scan_runs, system_alerts, v_system_health_overview | 0 | ok |
| `maintain-partitions` | **ninguém no repo** | — | 0 | ok |
| `migrate-storage-paths` | front (1) | profiles | 0 | **falha** |
| `process-invoice-idp` | front (1) | — | 1 | ok |
| `process-outbox` | **ninguém no repo** | integration_outbox, system_alerts | 0 | **falha** |
| `process-solicitacao-neural` | front (2) | — | 0 | **falha** |
| `punchout-encrypt` | front (1) | user_tenants | 0 | ok |
| `punchout-receive` | edge | profiles, punchout_catalogs, punchout_sessions, solicitacoes | 2 | ok |
| `punchout-setup` | front (1) | punchout_catalogs, punchout_sessions, user_tenants | 0 | ok |
| `run-audit` | front (1) | — | 1 | **falha** |
| `scim-v2` · **verify_jwt=false** | front (1) | sso_configurations | 1 | ok |
| `send-push-notification` | **ninguém no repo** | push_subscriptions | 1 | ok |
| `spot-api` | front (1), SQL/cron | spot_api_sync_log, spot_pedidos, spot_sessions, user_roles | 0 | ok |
| `spot-proxy` | front (1) | spot_pedidos, spot_sessions, user_roles | 1 | ok |
| `system-simulation` | front (1) | — | 0 | **falha** |
| `telemetry` | front (1) | telemetry_logs | 1 | **falha** |
| `webauthn-authenticate` | front (1) | webauthn_challenges, webauthn_credentials | 0 | **falha** |
| `webauthn-register` | front (1) | webauthn_challenges, webauthn_credentials | 0 | ok |
| `weekly-report` | SQL/cron | cotacoes, pagamentos, pedidos, solicitacoes, user_roles | 0 | ok |
| `weekly-summary-report` | SQL/cron | cotacoes, pedidos, solicitacoes, user_roles | 0 | **falha** |
| `workflow-engine` | **ninguém no repo** | workflow_approvals, workflow_edges, workflow_instances, workflow_logs, workflow_nodes | 1 | **falha** |
| `xbz-proxy` | front (1) | xbz_carrinho_log, xbz_credentials | 0 | ok |
| `xbz-sync-pedidos` | SQL/cron | system_alerts, xbz_credentials, xbz_pedido_status_history, xbz_pedidos | 0 | ok |

**Edge functions sem nenhum chamador no repositório (front, outra edge, SQL ou cron):** `maintain-partitions`, `process-outbox`¹, `send-push-notification`, `workflow-engine`, `alert-dispatcher`¹, `fiscal-orchestrator`.
¹ `process-outbox` e `alert-dispatcher` **são** chamados por cron em produção (`cron.job` 18 e 113, via `public._invoke_edge_function`), o que o inventário do código não vê. `maintain-partitions`, `workflow-engine`, `fiscal-orchestrator` e `send-push-notification` não aparecem em nenhum dos 27 jobs ativos.

---

## 6. Banco de dados (produção, snapshot 2026-11-22)

| categoria | quantidade |
|---|---|
| tabelas (schema `public`) | 160 |
| colunas | 1.979 |
| views | 3 |
| funções/procedures | 186 |
| triggers | 166 |
| policies RLS | 352 |
| índices | 704 |
| tipos/enums | 18 |
| extensões | 8 |
| cron jobs **ativos** | **27** (as migrations agendam 74 nomes distintos) |
| filas pgmq | 0 |
| buckets de storage | 4 |
| migrations registradas no banco | 14 (contra **325 arquivos** no repositório) |
| lints | 269 — 0 ALTA, 1 MÉDIA (`cron_watchdog_seen` com RLS e 0 policies), 268 BAIXA (248 `policy_auth_fn_not_wrapped`, 2 `fk_without_index`, 1 `extension_in_public`) |
| tamanho | 69,3 MB (schema `public`: 39,8 MB) |

### Volume de dado de negócio (estimativa `pg_class.reltuples`)

As 10 tabelas de negócio com dado: `cotacoes` ≈61, `pedidos` ≈34, `estoque_movimentacoes` ≈72, `estoque` ≈24, `fiscal_documents` ≈20, `licitacao_propostas` ≈13, `produtos` ≈12, `solicitacoes` ≈11, `fornecedores` ≈10, `pedido_itens` ≈7, `licitacoes` 7, `cost_centers` 7, `pagamentos` 3.
O maior volume é catálogo SPOT (`spot_skus` ≈3.776, `spot_estoque` ≈3.776, `spot_produtos` ≈1.279) e telemetria do próprio sistema (`telemetry_logs*`, `system_alerts` ≈460, `health_scan_runs` ≈743, `login_attempts` ≈937, `spot_api_sync_log` ≈481).

> **Limite de confiança (importante):** `est_rows` é `pg_class.reltuples`, uma **estimativa**. Onde `last_autoanalyze` é nulo, `0` **não prova** tabela vazia. Exemplo medido: `permissions` marca `est_rows: 0`, mas `role_permissions` tem 93 linhas com FK **validada** apontando para ela — logo `permissions` tem linhas. Qualquer afirmação do tipo "N tabelas vazias" (inclusive a de `ESTADO_ATUAL.md`) precisa de `count(*)` real, que **esta sessão não pôde executar**. Ver §8.

### Tipos/enums de negócio (fonte: `docs/contexto/supabase/types-enums.md`)

`app_role` = admin, coordinator, buyer, finance, viewer · `audit_action_type` · `audit_entity_type` = solicitacao, cotacao, pedido, pagamento, fornecedor, usuario, configuracao, relatorio · `bid_status` · `invitation_status` · `log_level` · `question_type` · `regime_tributario` · `saving_type` · `sourcing_project_status` · `sourcing_status` · `sourcing_type` · `status_producao_enum` · `tenant_status` · `tipo_produto_enum` · `workflow_node_type` · `workflow_status`.
**`solicitacoes.status`, `cotacoes.status`, `pedidos.status` e `pagamentos.status` não são enums** — são `text` com (ou sem) `CHECK`. Ver `03-ACHADOS.md`.

### Buckets de storage

| bucket | público | limite | mime |
|---|---|---|---|
| `comprovantes` | não | — | — |
| `documentos` | não | 10 MB | — |
| `fiscal-documents` | não | — | — |
| `product-images` | **sim** | — | — |

### Cron jobs ativos em produção (27)

Limpeza/manutenção (14): `cleanup-health-scan-runs`, `cleanup-system-alerts`, `cleanup-rate-limit-logs`, `weekly-vacuum-analyze`, `reset-pg-stat-statements`, `cleanup-checkpoint-snapshots`, `cleanup-integration-outbox-daily`, `lgpd_retention_daily`, `refresh-mv-dashboard-kpis`, `limpa-historico-cron-semanal`, `scan-particoes-semanal`, `cron-watchdog-15min`, `xbz-sync-watchdog-hourly`, `spot-api-sync-customization`.
Negócio / integração (13): `outbox-worker-1min` (→ `process-outbox`), `alert-dispatcher-1min` (→ `alert-dispatcher`), `approval-escalation-check` (→ `check-approval-escalations`), `contract-expiry-check` (→ `check-expiry-alerts`), `expiry-alerts-check` (→ **a mesma** `check-expiry-alerts`), `cotacao-followup-check` (→ `check-cotacao-followup`), `sla-alerts-check` (→ `check-sla-alerts`), `weekly-procurement-report` (→ `weekly-report`), `weekly-summary-report-job` (→ `weekly-summary-report`), `spot-api-sync-catalog`, `spot-api-sync-orders-30min`, `spot-api-sync-stock`, `xbz-sync-pedidos-30min`.

---

## 7. Variáveis de ambiente, CI e automação

**Front (`VITE_*`)** — declaradas no `.env.example`: `VITE_APP_ENV`, `VITE_APP_NAME`, `VITE_BITRIX_WEBHOOK_URL`, `VITE_ENABLE_ANALYTICS`, `VITE_ENABLE_DEBUG`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`. **Usadas no código:** as duas do Supabase + **`VITE_VAPID_PUBLIC_KEY`, que não está declarada em lugar nenhum**.

**Edge functions (28 nomes):** `ALERT_EMAIL_FROM`, `ALLOWED_ORIGINS`, `APP_URL`, `CRON_SECRET`, `EXTERNAL_DB_KEY`, `EXTERNAL_DB_URL`, `FUZZ_SEED`, `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO_RAW_BASE`, `OPENROUTER_API_KEY`, `PSV2_ENCRYPTION_KEY`, `PUNCHOUT_SESSION_TTL_MINUTES`, `RESEND_API_KEY`, `SCIM_BEARER_TOKEN`, `SEFAZ_API_TOKEN`, `SEFAZ_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `SPOT_API_ACCESS_KEY`, `SPOT_API_BASE_URL`, `SPOT_CRON_KEY`, `SPOT_PASSWORD`, `SPOT_USERNAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `XBZ_ENCRYPTION_KEY`.

**Secrets usados nos workflows:** `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TYPES_SYNC_PR_TOKEN`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`.

**Workflows (13):** `main.yml` ("Freight Quest CI/CD" — nome obsoleto), `guards.yml`, `contexto.yml` (1 h), `types-sync.yml` (1 h), `deploy-edge-functions.yml`, `aplicar-migration-prod.yml`, `paridade-banco.yml` (semanal), `inventario-estado-semanal.yml`, `branch-hygiene-audit.yml`, `dependency-review.yml`, `notifica-falha-main.yml`, `automation-local.yml`, `provisionar-vapid.yml`.

**Observação de arquitetura de build:** há `bun.lock`, `bun.lockb` **e** `package-lock.json`, sem `engines`, `packageManager` nem `.nvmrc`. O CI instala com bun; a Vercel decide sozinha. Não há garantia de que CI e produção resolvam a mesma árvore de dependências.

---

## 8. O que NÃO foi coberto nesta auditoria (e por quê)

| camada / item | motivo | o que faltou para cobrir |
|---|---|---|
| **Consulta SQL ao banco de produção** | `POST api.supabase.com/v1/projects/lmypcdfsrgfftzhxawao/database/query` → **HTTP 403** (`Your account does not have the necessary privileges`); nenhum dos 5 MCPs Supabase da sessão aponta para esse ref (testado com `to_regclass('public.solicitacoes')` em dois deles: `null`). | Um MCP/token com acesso de leitura ao ref oficial. Sem ele, **contagem exata de linhas, `EXPLAIN` real e teste de RLS com usuário real ficaram de fora**; tudo sobre o banco vem do snapshot gerado. |
| **Suíte de RLS (`npm run test:rls`)** | Faz login real **em produção** com `RLS_TEST_USER_A/B`. Rodar violaria a regra de somente-leitura. | Ambiente de teste separado, ou autorização explícita do dono. |
| **E2E (`npm run test:e2e`)** | Aponta para produção e exige `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`. | Mesmo acima. |
| **Verificação em navegador real** (render, responsividade, contraste, foco) | Não há ambiente de preview autenticado nesta sessão. | Deploy de preview + credencial de teste. Os achados de a11y/mobile são **RASTREADOS no código**, não medidos na tela. |
| **Vercel (variáveis, domínios, cabeçalhos servidos, deploy real)** | A CLI da Vercel não está instalada e o MCP da Vercel não foi usado para alterar nada; `vercel.json` foi lido, mas **o que a Vercel serve hoje não foi verificado**. | `vercel env ls` / inspeção do projeto `promo-supply-v2`. |
| **Logs de produção (edge, Postgres, Vercel)** | Sem acesso. | MCP/painel com leitura de logs. |
| **Contagem de "tabelas vazias"** | `est_rows` é estimativa; `last_autoanalyze` nulo em 100+ tabelas. | `select count(*)` por tabela. |
| **`deno check` contra a versão de Deno da Supabase** | Rodado com Deno 2.9.8 local; a plataforma pode usar outra. | Fixar a versão no repo e rodá-la no CI. |

---

### 6.1 Registro de cobertura — as 160 tabelas do schema `public`

Todas as 160 tabelas tiveram o arquivo de snapshot lido (colunas, constraints, índices, policies, triggers, grants). RLS está **habilitado em todas as 160**. A coluna `analyze?` diz se `last_autoanalyze` existe — onde é `não`, a estimativa de linhas **não é confiável** (ver aviso acima).

| tabela | RLS | policies | linhas (est.) | analyze? |
|---|---|---|---|---|
| `account_lockouts` | sim | 2 | 4 | não |
| `active_sessions` | sim | 7 | 0 | não |
| `alert_subscriptions` | sim | 1 | 0 | não |
| `aliquotas_tributarias` | sim | 2 | 0 | não |
| `allowed_countries` | sim | 2 | 0 | não |
| `approval_delegations` | sim | 6 | 0 | não |
| `approval_hierarchy` | sim | 1 | 0 | não |
| `approval_history` | sim | 3 | 0 | não |
| `approval_rules` | sim | 5 | 0 | não |
| `approval_steps` | sim | 8 | 0 | não |
| `approval_workflows` | sim | 6 | 0 | não |
| `auction_bids` | sim | 1 | 0 | não |
| `audit_logs` | sim | 3 | 32 | sim |
| `audit_logs_202605` | sim | 2 | 0 | não |
| `audit_logs_202606` | sim | 2 | 0 | não |
| `audit_logs_202607` | sim | 2 | 0 | não |
| `audit_logs_202608` | sim | 2 | 0 | não |
| `audit_logs_202609` | sim | 2 | 0 | não |
| `audit_logs_legacy_20260712` | sim | 1 | 0 | não |
| `blocked_countries` | sim | 2 | 0 | não |
| `blocked_ips` | sim | 2 | 0 | não |
| `budget_audit_logs` | sim | 1 | 32 | não |
| `budget_transactions` | sim | 2 | 0 | não |
| `categorias` | sim | 5 | 9 | não |
| `category_strategies` | sim | 3 | 0 | não |
| `checkpoint_snapshots` | sim | 1 | 0 | sim |
| `contact_notes` | sim | 5 | 0 | não |
| `contract_documents` | sim | 4 | 0 | não |
| `contract_history` | sim | 3 | 0 | não |
| `contract_items` | sim | 4 | 0 | não |
| `contract_penalties` | sim | 3 | 0 | não |
| `contracts` | sim | 5 | 0 | não |
| `cost_centers` | sim | 4 | 7 | não |
| `cotacoes` | sim | 3 | 61 | sim |
| `creditos_fornecedor` | sim | 2 | 0 | não |
| `cron_heartbeats` | sim | 2 | 9 | sim |
| `cron_watchdog_seen` | sim | 0 | 0 | não |
| `currencies` | sim | 1 | 0 | não |
| `dashboard_filter_favorites` | sim | 4 | 0 | não |
| `dashboard_layouts` | sim | 3 | 0 | não |
| `deadlock_snapshots` | sim | 1 | 0 | sim |
| `department_budgets` | sim | 5 | 32 | não |
| `dependency_health` | sim | 2 | 0 | não |
| `dependency_health_history` | sim | 2 | 0 | não |
| `devolucao_itens` | sim | 3 | 0 | não |
| `devolucoes` | sim | 3 | 0 | não |
| `entity_versions` | sim | 2 | 0 | não |
| `erp_connections` | sim | 1 | 0 | não |
| `erp_field_mappings` | sim | 1 | 0 | não |
| `erp_sync_log` | sim | 1 | 0 | não |
| `estoque` | sim | 4 | 24 | sim |
| `estoque_movimentacoes` | sim | 2 | 72 | sim |
| `exchange_rates` | sim | 1 | 0 | não |
| `financial_audit_logs` | sim | 1 | 0 | não |
| `fiscal_documents` | sim | 3 | 20 | não |
| `fiscal_events` | sim | 1 | 0 | não |
| `fornecedor_categorias` | sim | 1 | 2 | não |
| `fornecedores` | sim | 3 | 10 | sim |
| `geo_access_logs` | sim | 2 | 0 | não |
| `geo_settings` | sim | 2 | 0 | não |
| `health_scan_runs` | sim | 1 | 743 | sim |
| `integration_outbox` | sim | 3 | 0 | não |
| `ip_whitelist` | sim | 2 | 0 | não |
| `licitacao_lances` | sim | 1 | 0 | não |
| `licitacao_propostas` | sim | 2 | 13 | não |
| `licitacoes` | sim | 3 | 7 | não |
| `login_attempts` | sim | 2 | 937 | sim |
| `mfa_settings` | sim | 1 | 0 | não |
| `negotiation_analyses` | sim | 2 | 0 | não |
| `notification_preferences` | sim | 1 | 2 | não |
| `notifications` | sim | 4 | 25 | sim |
| `order_contracts` | sim | 2 | 0 | não |
| `organizations` | sim | 1 | 1 | não |
| `pagamentos` | sim | 4 | 3 | não |
| `password_reset_requests` | sim | 4 | 0 | não |
| `payment_history` | sim | 2 | 0 | não |
| `pedido_itens` | sim | 3 | 7 | não |
| `pedidos` | sim | 3 | 34 | não |
| `penalty_escalation_config` | sim | 3 | 0 | não |
| `permissions` | sim | 2 | 0 | não |
| `produto_fornecedores` | sim | 2 | 0 | não |
| `produtos` | sim | 3 | 12 | não |
| `profiles` | sim | 6 | 12 | não |
| `punchout_catalogs` | sim | 1 | 0 | não |
| `punchout_sessions` | sim | 1 | 0 | não |
| `push_subscriptions` | sim | 1 | 0 | não |
| `qualification_history` | sim | 2 | 0 | não |
| `qualification_requirements` | sim | 2 | 0 | não |
| `query_telemetry` | sim | 2 | 16 | sim |
| `rate_limit_logs` | sim | 2 | 0 | não |
| `receiving_checklists` | sim | 3 | 0 | não |
| `repurchase_suggestions` | sim | 2 | 0 | não |
| `role_permissions` | sim | 2 | 93 | sim |
| `saved_filters` | sim | 4 | 0 | não |
| `savings_tracker` | sim | 1 | 5 | não |
| `scim_provisioning_log` | sim | 1 | 0 | não |
| `secret_rotation_schedule` | sim | 1 | 0 | não |
| `security_definer_baseline` | sim | 1 | 117 | sim |
| `security_logs` | sim | 2 | 0 | não |
| `solicitacoes` | sim | 9 | 11 | não |
| `sourcing_awards` | sim | 1 | 0 | não |
| `sourcing_event_criteria` | sim | 1 | 0 | não |
| `sourcing_event_lots` | sim | 1 | 0 | não |
| `sourcing_event_questions` | sim | 1 | 0 | não |
| `sourcing_events` | sim | 1 | 0 | não |
| `sourcing_invitations` | sim | 1 | 0 | não |
| `sourcing_pipeline` | sim | 1 | 0 | não |
| `sourcing_projects` | sim | 1 | 0 | não |
| `sourcing_response_answers` | sim | 1 | 0 | não |
| `sourcing_response_items` | sim | 1 | 0 | não |
| `sourcing_responses` | sim | 1 | 0 | não |
| `spend_forecasts` | sim | 2 | 0 | não |
| `spot_api_sync_log` | sim | 1 | 481 | sim |
| `spot_customization_options` | sim | 1 | 0 | não |
| `spot_estoque` | sim | 1 | 3776 | sim |
| `spot_pedidos` | sim | 2 | 0 | não |
| `spot_produtos` | sim | 1 | 1279 | sim |
| `spot_sessions` | sim | 1 | 81 | sim |
| `spot_skus` | sim | 1 | 3776 | sim |
| `sso_configurations` | sim | 1 | 0 | não |
| `supplier_bonifications` | sim | 3 | 0 | não |
| `supplier_documents` | sim | 3 | 111 | sim |
| `supplier_qualification_scores` | sim | 3 | 10 | sim |
| `system_alerts` | sim | 1 | 460 | sim |
| `table_size_snapshots` | sim | 1 | 0 | não |
| `telemetry_logs` | sim | 2 | 584 | sim |
| `telemetry_logs_202605` | sim | 2 | 560 | sim |
| `telemetry_logs_202606` | sim | 2 | 0 | não |
| `telemetry_logs_202607` | sim | 2 | 50 | não |
| `telemetry_logs_202608` | sim | 2 | 0 | não |
| `telemetry_logs_202609` | sim | 2 | 0 | não |
| `telemetry_logs_legacy_20260712` | sim | 3 | 567 | sim |
| `temp_file_snapshots` | sim | 1 | 145 | sim |
| `tenants` | sim | 1 | 1 | não |
| `unspsc_codes` | sim | 1 | 23 | não |
| `user_filter_preferences` | sim | 4 | 0 | não |
| `user_organizations` | sim | 1 | 0 | não |
| `user_roles` | sim | 2 | 0 | não |
| `user_tenants` | sim | 1 | 12 | não |
| `user_tour_preferences` | sim | 4 | 1 | não |
| `wal_rate_snapshots` | sim | 1 | 0 | sim |
| `webauthn_challenges` | sim | 3 | 0 | não |
| `webauthn_credentials` | sim | 4 | 0 | não |
| `webhook_events` | sim | 1 | 0 | não |
| `workflow_approvals` | sim | 1 | 0 | não |
| `workflow_audit_log` | sim | 1 | 0 | não |
| `workflow_edges` | sim | 1 | 0 | não |
| `workflow_instances` | sim | 1 | 0 | não |
| `workflow_logs` | sim | 1 | 0 | não |
| `workflow_nodes` | sim | 1 | 0 | não |
| `workflow_sod_rules` | sim | 1 | 2 | não |
| `workflow_tasks` | sim | 1 | 0 | não |
| `workflow_templates` | sim | 1 | 3 | não |
| `xbz_carrinho_log` | sim | 1 | 0 | não |
| `xbz_cores` | sim | 1 | 0 | não |
| `xbz_credentials` | sim | 1 | 0 | não |
| `xbz_pedido_status_history` | sim | 1 | 0 | não |
| `xbz_pedidos` | sim | 1 | 0 | não |
| `xbz_produto_fiscal` | sim | 1 | 0 | não |
| `xbz_produtos` | sim | 1 | 0 | não |

Total de tabelas listadas: 160
