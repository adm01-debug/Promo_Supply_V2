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
| Testes das edge functions | `deno test --allow-net --allow-env --allow-read supabase/functions/` | **152 passam, 0 falham, 13 ignorados** (os 13 ignorados são justamente os de isolamento entre empresas — ver TST-02) | EXECUTADO |
| Build | `npm run build` | **exit 0** | EXECUTADO |
| Tipos das edge functions | `deno check` (Deno 2.9.8 / TS 6.0.3) em cada `supabase/functions/*/index.ts` | **19 de 40 falham**; nenhum workflow de CI roda `deno check` | EXECUTADO |
| RLS | `npm run test:rls` | **não executado de propósito**: fala com produção e faz login real | não coberto — ver §8 |
| E2E | `npm run test:e2e` | **não executado**: aponta para produção, exige `E2E_TEST_EMAIL`/`PASSWORD` e **cria dado real em produção** (ver TST-03) | não coberto — ver §8 |

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

## 9. Registro de cobertura por camada

Cada camada abaixo foi varrida por um agente dedicado, com escopo explícito e instrução de registrar também **o que ficou de fora e por quê**. O texto é o relato de cobertura de cada um, na íntegra, incluindo os itens que foram examinados e **descartados de propósito** (não são achados). Onde o relato contradiz um achado, prevalece a verificação que fiz pessoalmente — e nesses casos deixei a nota no próprio achado em `03-ACHADOS.md`.

### Camadas revisadas com relatório inline (resumo do escopo)

- **Hooks, cache e estado — prefixo `HK` · revisado.** Os 91 hooks de `hooks.json` com foco nos 29 que tocam tabela sem teste; configuração do QueryClient (`src/lib/query-client.ts`, PersistGate de `src/App.tsx`); inventário exaustivo das 198 `queryKey` e de todos os `invalidateQueries` de `src/`; auditoria de pares `addEventListener`/`removeEventListener` e `setInterval`/`clearInterval` (todos balanceados); os 5 stores zustand. **Limpo de propósito:** não existe atualização otimista no app (1 único `setQueryData` em todo o repo), então "otimista sem desfazer" não é achado aqui. **Fora:** `test:rls`/E2E e verificação em runtime (proibidos); hooks puramente de UI sem acesso a dado.
- **Edge functions — robustez e contrato — prefixo `EDG` · revisado.** As 39 funções com `index.ts` e os 37 módulos de `_shared/`; inventário dos 21 `fetch(` (só 1 sem timeout, e para edge interna); `_shared/idempotency.ts`, `retry.ts`, `circuit_breaker.ts`, `ai_gateway.ts`; corpo de erro de todas as 39 (formato consistente); as 4 vias de invocação cruzadas para separar órfã real de chamada por cron; veredicto individual dos 19 `deno check` vermelhos, classificados em "esconde bug de runtime" (9, todos o mesmo `TS2304`), "ruído de versão" (5) e "tipo frouxo" (5). **Limpo de propósito:** timeout, backoff e checagem de variável de ambiente obrigatória estão corretos em todas; nenhuma chamada do front para função inexistente. **Fora:** autorização/CORS (outra camada) e runtime de produção.
- **Validação de entrada e paridade com as constraints — prefixo `VAL` · revisado.** Pareamento campo→coluna→constraint de todos os formulários que gravam no fluxo central (solicitação, cotação, ordem, recebimento, devolução, fornecedor, contrato, centro de custo, aprovação/delegação, pagamento, RFx, credenciais XBZ), com os CHECKs, NOT NULL, UNIQUE, FK e triggers reais de 17 tabelas. **Limpo de propósito:** telefone, CNPJ, tipo de fornecedor, prioridade e tipo de solicitação, regime tributário e as tabelas de transição de pedido/pagamento estão todos em paridade com o banco. **Fora:** formulários de produto, estoque e preço (a fronteira do `AGENTS.md` proíbe mexer); validação dentro das edges além do `xbz-proxy`.
- **Desempenho — prefixo `PERF` · revisado.** As 508 chamadas `.from(...)` e 57 `.rpc(...)` de `src/`; `stats.json` inteiro (160 tabelas, 704 índices, consultas mais custosas do `pg_stat_statements`); script de redundância de índice; as RPCs de indicadores; os dois catálogos; `vite.config.ts` e o `dist/` construído (tamanho por pacote, grafo de import do pacote de entrada, gzip medido). **Fora:** `EXPLAIN` real e latência de página (sem acesso).

### Rotas, guardas e autorização na interface — prefixo `AUT` · **revisado**

Lido linha a linha: src/routes/AppRoutes.tsx (55 entradas de <Route>, as 54 telas + 404), src/features/auth/components/ProtectedRoute.tsx, src/features/auth/hooks/useAuth.tsx (AuthProvider completo), AuthContext.ts, useAuthContext.ts, src/features/auth/types/authRoles.ts, src/features/auth/index.ts, src/features/auth/__tests__/useAuth.test.tsx (4 casos), src/hooks/usePermissions.ts, src/components/security/PermissionGate.tsx (+withPermission), src/components/security/PermissionMatrix.tsx, src/pages/seguranca/Seguranca.tsx (todas as 15 abas e quais estão atrás de PermissionGate/isAdmin), src/pages/auditoria/Auditoria.tsx + RlsCompliancePanel, src/pages/aprovacoes/Aprovacoes.tsx, src/pages/auth/Auth.tsx (abas Entrar/Criar Conta e os 3 navigate('/')), src/pages/NotFound.tsx, src/features/layout/components/AppSidebar.tsx (48 itens, 6 seções), MainLayout.tsx (mount do sidebar desktop+drawer), Shell.tsx, HeaderActions.tsx, CommandPalette.tsx (26 itens, 11 labels de atalho), KeyboardShortcutsDialog.tsx, src/hooks/useKeyboardShortcuts.ts (registry real + getShortcutsList), src/components/mobile/BottomNavigation.tsx, src/components/navigation/* (RouteSkeleton, SmartBackButton, ModernBreadcrumbs, BackToTop, NavigationProgressBar), src/features/empresas/components/EmpresaSelector.tsx + hooks/useEmpresaFilter.ts, src/components/admin/TenantSwitcher.tsx, src/hooks/useSidebarBadges.ts, src/hooks/useSecurityLogs.ts. Cruzei cada rota com o papel exigido na UI, com o item de menu correspondente e com as policies RLS da tabela principal usando docs/contexto/supabase/policies.md (352 policies) e tables/public/*.md (permissions, role_permissions, user_tenants, sso_configurations, solicitacoes, cotacoes, pedidos, pagamentos, fornecedores, contracts, fiscal_documents, devolucoes, estoque, produtos, cost_centers, audit_logs, approval_*, workflow_*, erp_connections, punchout_catalogs, telemetry_logs, query_telemetry, system_alerts, health_scan_runs, savings_tracker, sourcing_projects, profiles, user_roles), mais functions/public/has_permission, has_role, tenant_in_my_group, get_user_grupo_id, current_tenant_id, handle_new_user, e a migration supabase/migrations/20260715175240_*.sql. Resultado do mapeamento: só 13 rotas têm requiredRole (12x 'admin' em /admin/*, 1x ['supplier','admin'] em /portal-fornecedor); as outras 41 só exigem sessão; e NENHUM dos 48 itens de menu tem filtro de papel (confirmado também em docs/contexto/codigo/rotas.json, onde todos os itens de 'menu' trazem papeis: []). Rotas sem nenhuma entrada de menu: /compras (alcançada pelo redirect de '/'), /gerar-ordem (só por Ctrl+Shift+P e por botões dentro de cotação) e /portal-fornecedor. Os 2 'itens de menu sem destino' apontados pelo inventário ('Fechar'->close-modal em SmartBackButton.tsx e 'Mais'->more em BottomNavigation.tsx) NÃO são defeito: são gatilhos de drawer/modal, não links. FICOU DE FORA: execução em navegador (sem acesso a ambiente logado; proibido rodar E2E/RLS contra produção), SQL ao vivo (403 na API do projeto — toda afirmação sobre RLS vem do snapshot de 2026-11-22), e o conteúdo interno de cada uma das 54 páginas (só abri as 5 com guarda relevante: seguranca, auditoria, aprovacoes, auth, NotFound) — gating dentro de formulários/botões é de outra camada.

**Comandos executados nesta camada:**

- npx vitest run src/features/auth/__tests__/useAuth.test.tsx src/hooks/__tests__/usePermissions.test.tsx src/features/auth/types/__tests__/authRoles.test.ts -> 3 arquivos, 26 testes passam (1,17 s); useAuth tem só 4 casos (throw fora do provider, loading inicial, signIn, signOut) — nada cobre resolução de papel, troca de empresa nem papel nulo
- grep -rn "has_permission" src/ supabase/functions/ (exceto types.ts) -> ZERO resultados: a função SQL has_permission nunca é chamada
- grep -rn "useEmpresaFilter" src/ -> só o próprio arquivo e o barrel features/empresas/index.ts: nenhum consumidor
- grep -rn "selectedEmpresaId|setSelectedEmpresa" src/ (fora de features/auth) -> só EmpresaSelector.tsx e useEmpresaFilter.ts
- grep -E "^\| public\.(user_tenants|sso_configurations|workflow_sod_rules|...) " docs/contexto/supabase/policies.md -> user_tenants: 1 policy (SELECT user_id=auth.uid()); sso_configurations/workflow_templates/workflow_sod_rules/fiscal_events/savings_tracker/sourcing_projects: 1 policy ALL com tenant_in_my_group apenas
- grep -E "^\| public\.(organizations|tenants) " docs/contexto/supabase/stats.md -> organizations=1, tenants=1 (last_autoanalyze 2026-11-13, contagem confiável)

### Interface do fluxo central — prefixo `UI` · **revisado**

LIDAS INTEGRALMENTE (linha a linha): Solicitacoes.tsx, solicitacoesHelpers.ts, Cotacao.tsx, cotacaoHelpers.ts, Aprovacoes.tsx, aprovacoesData.ts, GerarOrdem.tsx, Pedidos.tsx, PedidosKPIs.tsx, PedidoDetailsDialog.tsx (handlers + render 1-230), Acompanhamento.tsx, AcompanhamentoHelpers.ts, KanbanWorkflow.tsx, RecebimentoOffline.tsx, ReceivingFormView.tsx, recebimentoHelpers.ts, Devolucoes.tsx, DevolucoesModals.tsx, Pagamentos.tsx, DocumentosFiscais.tsx, GestaoEstoque.tsx. COMPONENTES de compras/pagamentos lidos: NovaSolicitacaoModal.tsx, solicitacao/SolicitacaoFormSteps.tsx (step 1-3), solicitacao/SolicitacaoReviewStep.tsx (gate de orçamento), SolicitacaoCard.tsx, FiltrosAvancados.tsx, PendingApprovalsList.tsx, pending-approvals/ApprovalModals.tsx, BulkOperationsPreview.tsx, EnhancedBulkActionsBar.tsx, ComparadorCotacoes.tsx (estado vazio), VisualComparadorCotacoes.tsx (estado vazio), BuscaAutomatica.tsx, NeuralFollowUpMonitor.tsx, SupplierInteractionLog.tsx, ProductionRoutingEngine.tsx (+SourcingIntelligenceBanner), PedidoTimeline.tsx, PagamentoDetailModal.tsx (confirmação), PagamentoScheduleModal.tsx, ThreeWayMatchPanel.tsx. HOOKS lidos só para fechar o caminho de gravação dos botões (não auditados como camada): usePedidos.ts, useCotacoes.ts, usePagamentos.ts, useSolicitacoes.ts, useEstoque.ts, useDevolucoes.ts, lib/exportData.ts. EVIDÊNCIA DE PRODUÇÃO cruzada com docs/contexto/supabase (snapshot 2026-11-22): schemas de solicitacoes/cotacoes/pedidos/pagamentos/fiscal_documents/estoque, stats.md (approval_history=0, approval_workflows=0, produto_fornecedores=0, pedidos~30, pagamentos=3) e as funções fill_tenant_id_from_profile / auto_create_pagamento_on_delivery / update_estoque_saldo. FORA DE ESCOPO (não revisados a fundo, por volume): os ~70 componentes de src/components/compras não usados por essas 12 telas (ExecutiveDashboard e todo o diretório executive/, SupplierScorecard, KraljicMatrix, RiskHeatMap, SLA*, Contract*, DigitalSignature, DemandPredictionPanel, SpendAnalytics, DraggableDashboard, DeliveryCalendar, BulkPlanningConsole, SourcingHistoryConsole, SupplierIntelligenceConsole, approval/ApprovalRuleModal e DynamicApprovalMatrix — este último só verificado como montado em Aprovacoes/Solicitacoes), src/components/pedidos/PedidoMobileCard.tsx, PagamentoAdvancedKPIs/FinancialDashboard/NotificationsWidget/ExportPanel/MobileCard (apenas confirmado que recebem dados reais do hook), e o render 230-461 de PedidoDetailsDialog (abas Financeiro/Auditoria). Não executei nada que escreva em banco (regra de somente-leitura): todas as afirmações de gravação são rastreadas no código.

**Comandos executados nesta camada:**

- npx vitest run src/pages/{solicitacoes,cotacao,aprovacoes,gerar-ordem,acompanhamento,recebimento,devolucoes} -> 9 arquivos, 273 testes, todos passam (2,84 s)
- npx vitest run src/components/compras src/components/pagamentos -> 18 arquivos, 320 testes, todos passam (6,63 s); avisos de recharts width/height 0 em TrendAnalysisCharts/PipelineChart
- Leitura dos 12 diretórios de página + 25 componentes (cat -n / awk) e cruzamento com docs/contexto/supabase/tables/public/*.md e stats.md
- grep -rn 'approvePagamento' src/ -> só declaração (usePagamentos.ts:195,265) e destructuring não usado (Pagamentos.tsx:56): nenhuma UI aprova pagamento
- grep -rn 'exportToCSV(' src/ -> 8 chamadas; só Pedidos.tsx:121 passa colunas vazias
- CONSTATAÇÃO DE COBERTURA DE TESTE: os 27 arquivos de teste dessas telas cobrem apenas helpers puros (mapeamentos, SLA, filtros). Nenhum teste renderiza Solicitacoes, Cotacao, Aprovacoes, GerarOrdem, Pedidos, Pagamentos, Recebimento, PendingApprovalsList nem qualquer modal — logo NENHUM dos achados abaixo é coberto por teste

### Regras de negócio do ciclo de compra — prefixo `NEG` · **revisado**

REVISADO INTEGRALMENTE: hooks src/features/solicitacoes/hooks/useSolicitacoes.ts, src/features/cotacoes/hooks/useCotacoes.ts, src/features/pedidos/hooks/usePedidos.ts, src/hooks/useApprovalWorkflow.ts, src/hooks/useApprovalRules.ts, src/hooks/usePagamentos.ts, src/hooks/useDevolucoes.ts (+useCreditosFornecedor), src/hooks/useEstoque.ts, src/hooks/useBudgetManagement.ts (parcial, so os pontos de orcamento). Telas: src/pages/gerar-ordem/GerarOrdem.tsx, src/pages/recebimento/{RecebimentoOffline.tsx,recebimentoHelpers.ts,pedidoComplementar.ts}, src/pages/aprovacoes/{Aprovacoes.tsx,aprovacoesData.ts}, src/pages/devolucoes/{Devolucoes.tsx,DevolucoesModals.tsx}, src/pages/pagamentos/Pagamentos.tsx, src/components/pagamentos/PagamentoDetailModal.tsx, src/components/compras/NovaSolicitacaoModal.tsx, src/components/compras/PendingApprovalsList.tsx + pending-approvals/pendingApprovalsData.ts, src/pages/acompanhamento/Acompanhamento.tsx (handler de kanban e mapa KANBAN_TO_DB_STATUS), src/pages/pedidos/Pedidos.tsx (bulk). BANCO (snapshot de producao docs/contexto/supabase, branch contexto): CHECKs/colunas/FKs/policies/triggers de solicitacoes, cotacoes, pedidos, pedido_itens, pagamentos, approval_workflows, approval_steps, approval_rules, devolucoes, devolucao_itens, creditos_fornecedor, department_budgets, budget_transactions, cost_centers, estoque_movimentacoes, receiving_checklists; corpo completo de 20 funcoes (validate_{solicitacao,pedido,cotacao,pagamento}_status_transition, auto_transition_solicitacao_on_{workflow_approved,cotacao_approval,pedido_created}, trg_{cotacao_approved,pedido_entregue}_transition, auto_approve_low_value_solicitacao, auto_create_pagamento_on_delivery, guard_solicitacao_escrita, update_budget_on_solicitacao_change, handle_pedido_budget_realization, sync_budget_on_payment, check_budget_availability, update_cost_center_budget_totals, trigger_update_saldo_on_{pedido,pagamento}, find_approval_rule, check_workflow_sod, fill_tenant_id_from_profile) e a secao E (maquinas de estado) de docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md. Maquina de estados reconstruida e confrontada nas tres fontes (CHECK do banco x valores escritos pelo front x transicoes feitas por trigger). FORA DE ESCOPO (nao revisado): licitacoes/sourcing/RFx, contratos e penalidades, fiscal (fiscal_documents/SEFAZ), catalogo PIM/XBZ/SPOT, qualificacao de fornecedor, edge functions de IA e de alerta (apenas conferi os status que gravam, pela secao E), RLS fora do ciclo, recompra. NAO EXECUTEI nada contra o banco (sem acesso SQL vivo, conforme briefing): toda afirmacao sobre producao vem do snapshot. receiving_checklists e budget_transactions: confirmei por grep que NENHUM codigo do repo escreve nelas (sao tabelas de apoio sem escritor) e isso sustenta dois achados abaixo.

**Comandos executados nesta camada:**

- npx vitest run src/pages/recebimento/__tests__ src/pages/gerar-ordem/__tests__ src/pages/devolucoes/__tests__ -> 5 arquivos, 122 testes passam (so helpers puros; nenhum cobre a integracao com os triggers de status nem organization_id)
- node scratchpad/diff-transicoes.mjs (script proprio comparando os mapas do front com as funcoes validate_*_status_transition do snapshot) -> 10 divergencias; as reais sao: pedidos parcial->cancelado e cancelado->pendente, pagamentos aprovado/agendado/atrasado->parcial (a linha parcial->parcial do output e falso positivo: o trigger retorna antes quando OLD.status = NEW.status)
- grep -rn 'estoque_movimentacoes' src supabase/functions -> unico escritor e src/hooks/useEstoque.ts:65 (tela manual /estoque); recebimento e devolucao nunca movimentam estoque
- grep -rn 'budget_transactions|receiving_checklists' src supabase/functions -> nenhum INSERT em codigo; apenas migrations e o teste de RLS citam os nomes
- grep -rn 'mockPendingApprovals' src -> referenciado so pelo proprio teste; PendingApprovalsList.tsx:62,75 usa pendingSteps real (mock da lista NAO esta na tela)

### Edge functions — autenticação, autorização e isolamento — prefixo `EDGA` · **revisado**

Revisei as 40 pastas de `supabase/functions/` (index.ts de cada uma, lido integralmente ou nos blocos de auth/autorizacao/CORS/corpo), `supabase/config.toml`, `deploy_edge_functions_promo_supply.sh`, `.github/workflows/deploy-edge-functions.yml` e os modulos compartilhados `_shared/security.ts`, `http.ts`, `rate_limit.ts`, `validation.ts`, `contracts.ts`, `idempotency.ts`, `external-bridge-allowlist.ts`, `punchout_crypto.ts`, `xbz_crypto.ts`, `xbz_auth.ts`, `logger.ts`, `notifications.ts`, `cronHealth.ts`. Cruzei com o snapshot de producao (`docs/contexto/supabase/`: stats.md, tables/public/*.md, policies, functions.md, cron.md) e com `docs/pendencias/_indice.md` para descartar o que ja esta CONCLUIDO. O QUE CADA FUNCAO EXIGE HOJE (verify_jwt declarado = config.toml; onde nada consta, o default do gateway e true): 1. ai-demand-prediction — jwt true; CORS `corsHeaders` (const); auth `auth.getUser()` :29; sem papel; sem tenant; sem service_role; corpo `validateBody`+DemandPredictionContract :35; rate 15/min. 2. ai-negotiation — jwt true; CORS const; auth :29; sem papel; sem tenant; sem service_role; NegotiationContract :44; rate :35. 3. ai-supplier-risk — jwt true; CORS const; auth `getUser(token)` :27; sem papel; sem tenant; sem service_role; corpo SEM schema; rate 20/min :42. 4. ai-supplier-suggestion — jwt true; CORS const; auth :29; sem papel; sem tenant; sem service_role; SupplierSuggestionContract :35; rate. 5. alert-dispatcher — jwt true; CORS const; auth = `verifyCronSecret` :237; sem papel/usuario; tenant apenas propagado do alerta; service_role :242; corpo ignorado. 6. check-approval-escalations — `verifyCronSecret` :12; service_role :22; sem corpo. 7. check-cotacao-followup — `verifyCronSecret` :16; service_role :25. 8. check-expiry-alerts — `verifyCronSecret` :17; service_role :28. 9. check-sla-alerts — `verifyCronSecret` :83 OU `getAuthUser` :87 (botao manual da UI); service_role :94. 10. dependency-health — CORS const; GET: **so autenticado** :460-468 (sem papel); POST: admin via `has_role` :555; service_role; sem rate limit; faz fetch do header Origin/Referer :489. 11. erp-credential-encrypt — auth :84; papel admin OU coordinator via `has_role` :107-121; tenant de `user_tenants` :92-105; sem service_role; corpo `JSON.parse` :123 (dentro de try externo), secret<=8192. 12. erp-sync — `getAuthUser` :25; sem papel; tenant por `getTenantId` com `tenantId` do corpo validado contra memberships :55; service_role :20; ERPSyncContract :53; idempotencia source "erp-sync" depois do auth :48; responde 501 (stub honesto, ja DESCARTADO em pendencias). 13. escalate-solicitacao — `buildCorsHeaders` :43; auth :65; sem papel; le a solicitacao pelo client do usuario (RLS) :93 antes de escalar; service_role so depois :88; rate 20/min. 14. external-db-bridge — CORS const; auth :119; sem papel; sem tenant (catalogo PIM e compartilhado por decisao); allowlist estrita :147 (so `select`, 2 views, teto 500, operadores restritos); service_role so para telemetria :53; rate 60/min. 15. fiscal-orchestrator — auth :84; sem papel; tenant `getTenantId` :98; service_role :92; `FiscalContract.parse` :110; idempotencia escopada por usuario :106. 16. generate-contract-pdf — auth :50; sem papel; **pre-checagem RLS do contrato pelo client do usuario :55-65 antes de escalar** (padrao correto); service_role :88; rate 20/min. 17. guided-buying-ai — `getAuthUser` :25; sem papel; tenant `getTenantId` :52 aplicado em `.eq("tenant_id")` :64,:70; service_role :40; validateBody :32; rate 30/min. 18. health-dashboard — CORS **local hardcoded `*`** :11-16; auth :45; papel admin :53-58; service_role :49; GET only; sem rate limit. 19. maintain-partitions — `verifyCronSecret` :19; service_role :28 (inativa por decisao). 20. migrate-storage-paths — auth :94; papel admin :103-112; service_role :102; corpo `{dryRun}`; sem rate limit; sem idempotencia em operacao destrutiva de storage. 21. process-invoice-idp — `getAuthUser` :29; sem papel; **sem tenant**; service_role baixa `filePath` do corpo no bucket privado :55-57. 22. process-outbox — `verifyCronSecret` :33; service_role :38. 23. process-solicitacao-neural — auth :52; sem papel; sem tenant; sem service_role; validateBody :58; rate 30/min. 24. punchout-encrypt — auth :87; papel admin OU coordinator :112-126; tenant `user_tenants` :97-110; sem service_role; secret<=4096. 25. punchout-receive — webhook, **sem JWT por design**; autenticacao = `buyer_cookie` de sessao aberta :144-152 + shared secret do catalogo quando configurado :165-170; TTL :176; service_role :125; rate 30/min por IP; idempotencia :121. 26. punchout-setup — auth **dentro** do `withIdempotency` :22-38; membership contra `catalog.tenant_id` :50-57; service_role :27; source de idempotencia nao escopado por usuario. 27. run-audit — `requireAdmin` :12; service_role + RPC `exec_sql` :22 (grant so service_role, confirmado em functions.md:81). 28. scim-v2 — **verify_jwt=false** (config.toml:3-4); CORS const; exige SCIM_BEARER_TOKEN global :101-114 **E** hash por tenant :120-138 (comparacoes em tempo constante); service_role :115; zod nos corpos :171,:203; rate 120/min por IP; opera em `auth.users` global, sem escopo de tenant. 29. send-push-notification — auth :77 e **nada mais** (sem papel, sem tenant); service_role :94; corpo sem schema :95; rate 60/min. 30. spot-api — `buildCorsHeaders` :588; cron por `x-spot-cron-key` com `timingSafeEqual` :103 ou service_role com `===` :115; usuario: `getUser` + `user_roles` em [admin,coordinator,buyer] :120-131; **sem tenant**; service_role :78; corpo: so `action` contra VALID_ACTIONS :599 + checagem manual do payload de createOrder; rate 30/min. 31. spot-proxy — auth :76 + `user_roles` :85-93; **sem tenant**; service_role :53; rate 60/min :800. 32. system-simulation — `requireAdmin` :12; service_role :19; corpo sem schema (`iterations`/`scenarios`/`mode` livres :22-27); repassa o JWT do admin as edges alvo :73 (nao o service_role). 33. telemetry — exige Authorization :31 + `getUser` :37; sem papel; tenant por `getTenantId` com fallback null :69-75; service_role para o insert :56; corpo normalizado por `buildTelemetryRow`. 34. webauthn-authenticate — sem JWT por design; corpo `{action,email}` :48-54; rate por ip+email :58; service_role :45; `finish` sempre 400 (fail-closed :183, item seg-passkey CONCLUIDO); `listUsers()` sem paginacao :72. 35. webauthn-register — exige JWT :58 e amarra `userId` do corpo ao autenticado :84-87; desafio buscado por `email`, nao por `user_id` :160-168; service_role :71; rate 15/min. 36. weekly-report — `verifyCronSecret` :11; service_role :21. 37. weekly-summary-report — `verifyCronSecret` :11; service_role :17. 38. workflow-engine — `getAuthUser` :25; sem papel; tenant `getTenantId` :41 usado so nos inserts; `submit_decision` confia em `approver_id` do corpo :39,:117,:130 e nao filtra por tenant :134-135; service_role :32; WorkflowContract :38. 39. xbz-proxy — `authenticate()` de `_shared/xbz_auth.ts` :495 (JWT + tenant de `user_tenants` + papeis de `user_roles`); `requireRole` por acao; service_role :492; rate por acao :511; `VALID_ACTIONS` :505. Melhor padrao do repo. 40. xbz-sync-pedidos — cron por `x-cron-key` validado no banco (`verify_xbz_cron_key`) :144 ou usuario admin|coordinator :168-170; tenant do chamador :170; service_role :137. VERIFICADO SAUDAVEL (nao gerou achado): os 10 endpoints de cron passam pelo `verifyCronSecret` e de fato autenticam em producao — `public.cron_heartbeats` tem 9 linhas e ~5,2k updates com autoanalyze de 2026-11-22 (`docs/contexto/supabase/stats.md`), e `_invoke_edge_function` manda `Authorization: Bearer <edge_invoke_service_key>` do Vault; `check_rate_limit` existe e tem grant para service_role (functions.md:53); `exec_sql` e `log_security_event` sao service_role-only; a allowlist do `external-db-bridge` bloqueia tudo que nao e `select` nas 2 views do PIM; `generate-contract-pdf` e `escalate-solicitacao` fazem pre-checagem via RLS antes de escalar para service_role; `xbz-proxy`/`xbz-sync-pedidos` resolvem tenant sempre de `user_tenants`; a criptografia AES-GCM (`punchout_crypto.ts`, `xbz_crypto.ts`, `punchout-encrypt`, `erp-credential-encrypt`) usa IV aleatorio de 12 bytes por operacao e modo autenticado — nao ha IV fixo nem modo sem autenticacao; `logger.sanitizeContext` redige chaves com password/token/secret/key/auth. FORA DO ESCOPO (motivo): `supabase/functions/tests/fuzzing_suite.ts` e `integration_suite.ts` (sem sufixo `*_test.ts`, nunca executam no `deno test` do CI — ja registrado em docs/auditoria-implementacao-261120.md:136); o interior de `webpush.ts` (cripto RFC 8291/VAPID — item edge-push ja CONCLUIDO); `ai_gateway.ts`, `circuit_breaker.ts`, `retry.ts`, `simulation-engine.ts`, `fuzzer.ts`, `logLevel.ts`, `spot_api.ts`, `xbz_client.ts`, `xbz_*_cache.ts`, `xbz_pedido_map.ts`, `xbz_portador.ts` (chamada a fornecedor = camada servicos-externos); prompt-injection no gateway de IA; as policies RLS das tabelas e os grants (camada de banco); os callers do front. Nao foi possivel ler o `verify_jwt` real nem a lista de secrets em producao: `docs/contexto/supabase/edge-functions.md` e `project-config.md` dizem "Management API desabilitada" — toda afirmacao sobre estado publicado esta marcada como hipotese.

**Comandos executados nesta camada:**

- deno eval reproduzindo `originAllowed` de _shared/security.ts com ALLOWED_ORIGINS='https://app.exemplo.com,*.lovable.app' -> app.exemplo.com true | x.lovable.app true | **evil-lovable.app true** | notlovable.app true | attacker.com false
- deno eval importando file:///home/user/Promo_Supply_V2/supabase/functions/_shared/security.ts: com ALLOWED_ORIGINS vazio -> corsHeaders inclui "Access-Control-Allow-Origin":"*" e buildCorsHeaders(Origin: evil.com) devolve "*"; com ALLOWED_ORIGINS='https://app.exemplo.com' -> corsHeaders SEM Access-Control-Allow-Origin e buildCorsHeaders(evil.com) -> null
- deno test --no-lock --allow-net --allow-env --allow-read supabase/functions/scim-v2/conformance.test.ts -> ok | 8 passed | 0 failed, com '[SCIM conformance] SCIM_TEST_BASE_URL / SCIM_TEST_TOKEN not set — skipping integration tests.' em TODOS os 8 casos (suite verde sem exercitar nada)
- grep por verify_jwt/requireAdmin/getAuthUser/has_role/getTenantId/SERVICE_ROLE/validateBody/corsHeaders nas 40 index.ts -> mapa de cobertura acima; `grep -rln buildCorsHeaders supabase/functions/` -> so spot-api, escalate-solicitacao e o proprio security.ts (3 de 40)
- git log -1 --format='%h %ad %s' --date=iso 4c78723 -> 2026-11-22 10:00:42 -0300 'fix(edge): resolve tenant da notificacao por profiles.user_id, nao pela PK (#274)'; `git log --name-only -- supabase/functions/_shared/` confirma que toca `_shared/notifications.ts`; `git branch -a --contains 4c78723` -> main
- grep send-push-notification/index.ts -> :77 verifyAuthUser, :94 service_role, :101 select('*') em push_subscriptions, :103-104 .in('user_id', user_ids), :170-173 delete; `grep -n 'has_role|tenant|admin|user_roles' send-push-notification/index.ts` -> NENHUMA ocorrencia
- consultas ao snapshot de producao: stats.md (tenants=1, organizations=1, profiles~10, sso_configurations=0, punchout_catalogs=0, workflow_approvals=0, dependency_health=0, cron_heartbeats=9 com ~5,2k updates), tables/public/{spot_pedidos,fiscal_documents,sso_configurations,telemetry_logs}.md (policies), functions.md (check_rate_limit, exec_sql, has_role, verify_xbz_cron_key), cron.md (27 jobs) e functions/public/invoke_edge_function__*.sql

### Banco — RLS, policies e privilégios — prefixo `RLS` · **revisado**

Conferi programaticamente as 160 tabelas de public do snapshot de produção (docs/contexto/supabase/snapshot.json, coleta 2026-11-22, projeto lmypcdfsrgfftzhxawao): 1979 colunas (tipo, nullable, default), 583 constraints (139 FK com ON DELETE/ON UPDATE/validated, UNIQUE, CHECK, PK), 704 índices (unicidade e predicados), 166 triggers, 352 policies, os 186 corpos de função em supabase/functions/public/*.sql, 27 cron jobs, 3 views + 1 matview, 5 sequences, 18 enums, 24 constraints NOT VALID, grants por tabela. Cruzei: (a) types.ts x snapshot coluna a coluna nas 160 tabelas; (b) 325 arquivos de supabase/migrations x as 14 linhas do ledger; (c) *_id sem FK (89 colunas) x tabelas existentes; (d) CHECKs de status x literais gravados no código (src/ e supabase/functions/) e nas funções do banco; (e) defaults do banco x o que o código envia no insert; (f) ON DELETE de todos os filhos de pedidos, solicitacoes, cotacoes, contracts, devolucoes, fornecedores, pagamentos, approval_* e sourcing_* x os call sites de .delete() na UI. Leitura manual aprofundada de ~35 tabelas (pedidos, pedido_itens, solicitacoes, cotacoes, contracts + 5 filhas, devolucoes, devolucao_itens, creditos_fornecedor, pagamentos, payment_history, fiscal_documents, fornecedores, tenants, organizations, produtos, produto_fornecedores, supplier_qualification_scores, supplier_documents, receiving_checklists, approval_delegations/hierarchy/history/rules/steps/workflows, audit_logs + 6 irmãs, telemetry_logs + 6 irmãs, order_contracts, unspsc_codes). RESULTADOS LIMPOS que NÃO viraram achado: (1) o alerta tabelas_com_drift_migration_vs_types: 50 do baseline.json é RUÍDO DO GERADOR — o drift real de types.ts contra produção é ZERO; as duas únicas divergências que meu diff acusou (pedido_itens.status_producao, tenants.regime_tributario) existem em types.ts (linhas 4516 e 7995), o parser de banco.json só não lê declaração de enum em múltiplas linhas; (2) nenhuma coluna monetária usa double precision/real/money — as duas ocorrências de double precision são checkpoint_snapshots.sync_time_ms/write_time_ms (latência); (3) as 330 colunas de timestamp são TODAS timestamp with time zone, nenhuma without; (4) CNPJ de fornecedores É validado (trigger trg_validate_cnpj -> tg_fornecedores_validate_cnpj com is_valid_cnpj), não é lacuna; (5) particionamento de audit_logs/telemetry_logs está desligado POR DECISÃO DOCUMENTADA (supabase/migrations/20261117230000_retencao_fonte_unica.sql:88-108 marca ensure_audit_logs_partition, ensure_telemetry_logs_partition, maintain_monthly_partitions, archive_* como INATIVA POR DECISAO, com gatilho de reavaliação no cron 111 scan-particoes-semanal) — não é defeito; (6) os CHECKs de status de pedidos, solicitacoes, cotacoes, pagamentos, approval_workflows e workflow_tasks batem com o que a UI e as funções do banco gravam (KANBAN_TO_DB_STATUS em Acompanhamento.tsx:52-59 e as 6 funções auto_transition_*/trg_* só usam valores aceitos) — a única exceção virou achado; (7) historico_compras e user_sessions aparecem em migrations antigas mas não existem em produção e nenhum código os consulta (HistoricoCompras.tsx:193 usa a string só como chave de cache). FICOU DE FORA: semântica das 352 policies RLS e os 248 lints policy_auth_fn_not_wrapped (camada de segurança/performance, não integridade); buckets de storage; bloat/uso de índice; schemas auth/storage além das FKs que apontam para auth.users; as tabelas xbz_* e spot_* foram conferidas só estruturalmente porque AGENTS.md as declara em extinção. Sem acesso SQL vivo (403 na API), toda afirmação sobre produção vem do snapshot gerado.

**Comandos executados nesta camada:**

- python3 (diff types.ts x snapshot.json nas 160 tabelas) -> 0 colunas em types.ts ausentes do banco; 2 falsos positivos do parser de banco.json (status_producao, regime_tributario) confirmados presentes em src/integrations/supabase/types.ts:4516 e :7995
- ls supabase/migrations/*.sql | wc -l -> 325 arquivos; snapshot db.migrations -> 14 linhas; 311 arquivos sem registro no ledger; só 3 linhas têm statements>0
- python3 (varredura de 583 constraints) -> 89 colunas *_id sem FK; 24 constraints NOT VALID; 139 FKs com ON DELETE mapeado
- python3 (varredura de 1979 colunas) -> 0 colunas monetárias em double precision/real; 330/330 timestamps com time zone; 43 tabelas com tenant_id DEFAULT '00000000-0000-0000-0000-000000000000'
- python3 (cruzamento default 0000 x trigger a_fill_tenant_id x FK para tenants) -> 17 tabelas sem o trigger de preenchimento e 25 que só quebram em contexto service_role/cron
- grep/regex nos 186 corpos de função do snapshot -> único insert sem tenant_id: calculate_supplier_qualification_score; único insert de status fora do CHECK: nenhum (as funções do banco estão corretas)
- npx vitest run src/pages/devolucoes/__tests__/devolucoesData.test.ts -> 35 testes passam (nenhum cobre unicidade de devolucoes.numero)

### Banco — integridade e paridade com as migrations — prefixo `DB` · **revisado**

Conferi programaticamente as 160 tabelas de public do snapshot de produção (docs/contexto/supabase/snapshot.json, coleta 2026-11-22, projeto lmypcdfsrgfftzhxawao): 1979 colunas (tipo, nullable, default), 583 constraints (139 FK com ON DELETE/ON UPDATE/validated, UNIQUE, CHECK, PK), 704 índices (unicidade e predicados), 166 triggers, 352 policies, os 186 corpos de função em supabase/functions/public/*.sql, 27 cron jobs, 3 views + 1 matview, 5 sequences, 18 enums, 24 constraints NOT VALID, grants por tabela. Cruzei: (a) types.ts x snapshot coluna a coluna nas 160 tabelas; (b) 325 arquivos de supabase/migrations x as 14 linhas do ledger; (c) *_id sem FK (89 colunas) x tabelas existentes; (d) CHECKs de status x literais gravados no código (src/ e supabase/functions/) e nas funções do banco; (e) defaults do banco x o que o código envia no insert; (f) ON DELETE de todos os filhos de pedidos, solicitacoes, cotacoes, contracts, devolucoes, fornecedores, pagamentos, approval_* e sourcing_* x os call sites de .delete() na UI. Leitura manual aprofundada de ~35 tabelas (pedidos, pedido_itens, solicitacoes, cotacoes, contracts + 5 filhas, devolucoes, devolucao_itens, creditos_fornecedor, pagamentos, payment_history, fiscal_documents, fornecedores, tenants, organizations, produtos, produto_fornecedores, supplier_qualification_scores, supplier_documents, receiving_checklists, approval_delegations/hierarchy/history/rules/steps/workflows, audit_logs + 6 irmãs, telemetry_logs + 6 irmãs, order_contracts, unspsc_codes). RESULTADOS LIMPOS que NÃO viraram achado: (1) o alerta tabelas_com_drift_migration_vs_types: 50 do baseline.json é RUÍDO DO GERADOR — o drift real de types.ts contra produção é ZERO; as duas únicas divergências que meu diff acusou (pedido_itens.status_producao, tenants.regime_tributario) existem em types.ts (linhas 4516 e 7995), o parser de banco.json só não lê declaração de enum em múltiplas linhas; (2) nenhuma coluna monetária usa double precision/real/money — as duas ocorrências de double precision são checkpoint_snapshots.sync_time_ms/write_time_ms (latência); (3) as 330 colunas de timestamp são TODAS timestamp with time zone, nenhuma without; (4) CNPJ de fornecedores É validado (trigger trg_validate_cnpj -> tg_fornecedores_validate_cnpj com is_valid_cnpj), não é lacuna; (5) particionamento de audit_logs/telemetry_logs está desligado POR DECISÃO DOCUMENTADA (supabase/migrations/20261117230000_retencao_fonte_unica.sql:88-108 marca ensure_audit_logs_partition, ensure_telemetry_logs_partition, maintain_monthly_partitions, archive_* como INATIVA POR DECISAO, com gatilho de reavaliação no cron 111 scan-particoes-semanal) — não é defeito; (6) os CHECKs de status de pedidos, solicitacoes, cotacoes, pagamentos, approval_workflows e workflow_tasks batem com o que a UI e as funções do banco gravam (KANBAN_TO_DB_STATUS em Acompanhamento.tsx:52-59 e as 6 funções auto_transition_*/trg_* só usam valores aceitos) — a única exceção virou achado; (7) historico_compras e user_sessions aparecem em migrations antigas mas não existem em produção e nenhum código os consulta (HistoricoCompras.tsx:193 usa a string só como chave de cache). FICOU DE FORA: semântica das 352 policies RLS e os 248 lints policy_auth_fn_not_wrapped (camada de segurança/performance, não integridade); buckets de storage; bloat/uso de índice; schemas auth/storage além das FKs que apontam para auth.users; as tabelas xbz_* e spot_* foram conferidas só estruturalmente porque AGENTS.md as declara em extinção. Sem acesso SQL vivo (403 na API), toda afirmação sobre produção vem do snapshot gerado.

**Comandos executados nesta camada:**

- python3 (diff types.ts x snapshot.json nas 160 tabelas) -> 0 colunas em types.ts ausentes do banco; 2 falsos positivos do parser de banco.json (status_producao, regime_tributario) confirmados presentes em src/integrations/supabase/types.ts:4516 e :7995
- ls supabase/migrations/*.sql | wc -l -> 325 arquivos; snapshot db.migrations -> 14 linhas; 311 arquivos sem registro no ledger; só 3 linhas têm statements>0
- python3 (varredura de 583 constraints) -> 89 colunas *_id sem FK; 24 constraints NOT VALID; 139 FKs com ON DELETE mapeado
- python3 (varredura de 1979 colunas) -> 0 colunas monetárias em double precision/real; 330/330 timestamps com time zone; 43 tabelas com tenant_id DEFAULT '00000000-0000-0000-0000-000000000000'
- python3 (cruzamento default 0000 x trigger a_fill_tenant_id x FK para tenants) -> 17 tabelas sem o trigger de preenchimento e 25 que só quebram em contexto service_role/cron
- grep/regex nos 186 corpos de função do snapshot -> único insert sem tenant_id: calculate_supplier_qualification_score; único insert de status fora do CHECK: nenhum (as funções do banco estão corretas)
- npx vitest run src/pages/devolucoes/__tests__/devolucoesData.test.ts -> 35 testes passam (nenhum cobre unicidade de devolucoes.numero)

### Funções e triggers do banco — prefixo `FN` · **revisado**

Li a tabela completa de `docs/contexto/supabase/functions.md` (186 linhas, parseada para JSON e cruzada com `snapshot.json` → `db.functions`, que traz `security_definer`, `config`, `execute_api_roles`, `execute_public` e o mapa de chamadores code/cron/triggers/db/views). Classifiquei as 186: observabilidade 62 (todas as `scan_*`, watchdogs, dashboards de alerta, `run_all_health_scans`, `admin_scan_runs_sla_status`, `simulate_scan_sla_loop`, `execute_read_query`), negócio 47 (transições de status, orçamento, scores de cotação, saldo de fornecedor, KPIs, aprovação), autorização/auditoria 34 (`has_role`, `tenant_in_my_group`, cadeia de hash de `audit_logs`, lockout de login, guards de escrita), limpeza/retenção 24 (`cleanup_*`, `archive_*`, `ensure_*_partition`, `apply_lgpd_retention`, `maintain_monthly_partitions`) e utilitária 19 (`_invoke_*`, normalizadores, `update_updated_at_column`, `generate_sequential_number`, `test_*`). Li o corpo completo (`functions/public/*.sql`) de 62 funções — todas as 47 de negócio que escrevem dado, as 3 `_invoke_*`, `apply_lgpd_retention`, `maintain_monthly_partitions`, `cron_watchdog`, `xbz_sync_watchdog`, `check_telemetry_alerts`, `refresh_mv_dashboard_kpis`, `admin_scan_runs_sla_status`, `scan_scan_runs_sla`, `run_all_health_scans`, `exec_sql`, `execute_read_query`, `rls_auto_enable`, a cadeia `audit_logs_*`/`verificar_integridade_audit_logs`, e todas as 33 definer expostas a `authenticated`/`anon`. Item 1 do briefing está LIMPO: **zero** das funções `SECURITY DEFINER` está sem `SET search_path` (verificado programaticamente em `snapshot.json`; as 26 sem definer são invoker e 6 delas sem `config`, o que é inócuo). Item 3 (RPC do front ausente no banco) está LIMPO: as 45 chamadas `.rpc()` distintas em `src/`+`supabase/functions/` existem todas no banco — os 15 nomes órfãos (`ghost_rpc`, `fixture_rpc`, `dashboard_rpc`, `is_admin`, `fn`, `x`…) são fixtures de `scripts/ai-context/gerar.unit.mjs` e de testes. O inverso não está limpo: 82 das 186 funções não têm nenhum chamador fora de migrations (sem cron, trigger, view ou outra função) — a maior parte é o catálogo de ~50 `scan_*` deliberado, mas inclui sobrecargas duplicadas (`scan_cache_hit_ratio`, `scan_connection_saturation`, `scan_unindexed_fks` vs `scan_unindexed_foreign_keys`, `scan_txid_wraparound` vs `scan_xid_wraparound`), 3 funções de depuração em produção (`test_with_defaults`, `test_subselect`, `test_no_defaults`, todas definer) e `get_user_grupo_id`/`get_my_organization`, que são o mesmo SELECT duplicado. Agrupei os 166 triggers por (tabela, timing, nível, evento) para achar ordem indefinida e duplicatas. Li `grants.md` (não há seção de funções — os grants de EXECUTE vêm da coluna `EXECUTE (roles API)` de `functions.md`/`snapshot.json`), `cron.md` + `cron-runs.md` (as durações de 0,02 s provam o fire-and-forget do item 8), `views.md` (as 2 views comuns têm `security_invoker=on`; a MV `mv_dashboard_kpis` não tem grant para `anon`/`authenticated` e nenhum consumidor, logo não vaza mas é refrescada 96×/dia à toa) e as fichas de tabela relevantes (`audit_logs`, `system_alerts`, `notifications`, `user_roles`, `solicitacoes`, `pedidos`, `pagamentos`, `cotacoes`, `cost_centers`, `department_budgets`, `health_scan_runs`, `cron_heartbeats`, `telemetry_logs*`). FICOU DE FORA, com motivo: (a) `$CTX/supabase/tables/public/_supabase_internal_triggers.md` não existe no snapshot coletado (só os 160 arquivos `<tabela>.md`); os triggers de `storage.*`/`auth.*` estão em `triggers.md` e eu os revisei, mas são da plataforma e não são alteráveis por este repo; (b) **não existe event trigger no snapshot** — `rls_auto_enable()` é `RETURNS event_trigger` e não há como provar pelo snapshot se está anexado, então não afirmo nada sobre ele (relevante para o lint `rls_no_policies` em `cron_watchdog_seen`); (c) não validei nada contra o banco ao vivo (sem acesso SQL, conforme o briefing) — todo achado é RASTREADO sobre o snapshot de 2026-11-22 + o código do HEAD; (d) não revisei o corpo das ~50 `scan_*` de diagnóstico uma a uma (li 12 por amostragem e todas as citadas no briefing), porque nenhuma é agendada e nenhuma escreve dado de negócio.

**Comandos executados nesta camada:**

- python3 (parse de docs/contexto/supabase/functions.md → 186 linhas) + consulta a snapshot.json db.functions -> 'definer sem search_path: []' (item 1 limpo); 33 definer com EXECUTE para authenticated/anon; 26 funções execute_public
- python3 sobre snapshot.json (callers code/cron/triggers/db/views, descontando supabase/migrations/) -> 82 funções sem nenhum chamador
- grep -rhoE '\.rpc\(\s*["'\''`]([a-zA-Z0-9_]+)' src supabase/functions scripts tests-e2e tests-rls | sort -u -> 45 nomes; diferença contra db.functions -> 15 ausentes, todos fixtures de teste (item 3 limpo)
- python3 (agrupamento dos 166 triggers por tabela/timing/nível/evento) -> 3 pares de triggers duplicados (mesma função, mesma tabela, mesmo evento) e 6 triggers AFTER UPDATE concorrentes em public.pedidos
- grep -l "'archive_audit_logs'|'secret_rotation_check'|'slack_watchdog'|'security_scan'|'ensure_partitions'|'cleanup_health_scan_runs'|'archive_telemetry_logs'" ctx/.../functions/public/*.sql -> cada um dos 7 nomes do SLA aparece SÓ em admin_scan_runs_sla_status e simulate_scan_sla_loop (+ as 2 archive_* marcadas INATIVA POR DECISAO)
- grep -l 'FROM user_roles' ctx/.../functions/public/*.sql -> auto_calculate_delivery_penalty e auto_block_low_score_supplier inserem notificação para todos os tenants
- grep -l 'department_budgets|valor_comprometido|committed_amount' ctx/.../functions/public/*.sql -> 3 triggers escrevem department_budgets, 1 trigger escreve cost_centers (em budget_transactions, 0 linhas)
- leitura de docs/contexto/supabase/cron-runs.md -> todos os 9 crons que chamam edge registram 'succeeded' em 0,01–0,06 s (prova do fire-and-forget do net.http_post)

### Integrações externas e fronteira do catálogo — prefixo `INT` · **revisado**

Edges lidas integralmente: spot-api, spot-proxy (roteador + handlers de catálogo/estoque), external-db-bridge, punchout-receive, punchout-setup, punchout-encrypt, scim-v2, webauthn-authenticate, erp-sync, erp-credential-encrypt, fiscal-orchestrator, process-invoice-idp (+ extraction.ts), send-push-notification (+ webpush.ts), alert-dispatcher, xbz-sync-pedidos; xbz-proxy lida por ações (cores/catalogo/fiscalSt/carrinho/pedidos). Compartilhados lidos: _shared/{spot_api.ts, external-bridge-allowlist.ts, idempotency.ts, retry.ts, ai_gateway.ts, punchout_crypto.ts, security.ts (CORS/auth/tenant), xbz_catalog_cache.ts, xbz_fiscal_cache.ts}. Front: src/hooks/useCatalogoPim.ts, src/hooks/useProdutos.ts, src/pages/catalogo-produtos/CatalogoProdutos.tsx, src/pages/catalogo-spot/{useSpotCatalog.ts,SpotCatalogTab.tsx}, src/pages/catalogo-xbz/XbzCatalogoTab.tsx, src/pages/admin/PunchOutCatalogs.tsx, src/pages/documentos/DocumentosFiscais.tsx, src/pages/gerar-ordem/GerarOrdem.tsx, src/features/pedidos/hooks/usePedidos.ts, src/hooks/useSpotIntegration.ts (chamada ao spot-proxy). Config/infra: supabase/config.toml, deploy_edge_functions_promo_supply.sh (listas FUNCTIONS/NO_JWT), .github/workflows/guards.yml (job bundle), scripts/ci/check-bundle-secrets.mjs, scripts/validate-bridge.ts. Banco (snapshot de produção, branch contexto): cron.md + cron-runs.md, stats.json (table_stats), tables/public/{spot_*,xbz_*,punchout_*,erp_*,webhook_events,pedido_itens,produtos}.md, functions/public/{invoke_spot_sync,invoke_xbz_sync}.sql. Ficou de fora: ai-demand-prediction/ai-negotiation/ai-supplier-risk/ai-supplier-suggestion (só conferi que usam o mesmo _shared/ai_gateway.ts com breaker+fallback, sem auditar prompt/contrato de cada uma), weekly-report e weekly-summary-report (lidas só as env e o gatilho de cron, sem percorrer a montagem do e-mail), webauthn-register (o fluxo de login está fail-closed e já é item CONCLUIDO), dependency-health/run-audit (GitHub dispatch, fora do recorte de fornecedor/catálogo) e a verificação ao vivo do contrato da bridge (npm run test:bridge aborta sem env; não há .env neste checkout e não há acesso SQL/HTTP a produção).

**Comandos executados nesta camada:**

- npm run test:bridge -> EXIT=2, '❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.' — o script aborta antes de qualquer request (não há .env neste checkout; git ls-files só tem .env.example), então o contrato da bridge ficou NÃO VERIFICADO ao vivo
- node scripts/ci/check-bundle-secrets.mjs --dist dist -> EXIT=2, 'ERRO: /home/user/Promo_Supply_V2/.env.production nao existe ... (fail-closed)' (o CI usa --env .env, gerado dos secrets em guards.yml:203-218)
- node scripts/ci/check-bundle-secrets.mjs --dist dist --env .env.example -> EXIT=0, 'OK: nenhum JWT service_role nem chave sb_secret_ no bundle (155 arquivo(s) .js/.mjs/.cjs varrido(s), mais os .html)' — nenhum segredo de servidor no bundle publicado
- grep 'import.meta.env' em src/ -> só VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e VITE_VAPID_PUBLIC_KEY (todas públicas por definição); nenhuma credencial de fornecedor no cliente
- deno test --no-lock --allow-net --allow-env --allow-read supabase/functions/_shared/ -> ok | 69 passed | 0 failed (721ms)
- npx vitest run src/tests/spot src/pages/catalogo-spot src/pages/catalogo-xbz src/hooks/__tests__/useSpotIntegration.checkout.test.tsx -> 9 arquivos, 91 testes, todos passam (nenhum cobre cota por requisição nem invalidação de cache)

### Agendamento, filas e alertas — prefixo `JOB` · **revisado**

REVISADO — Snapshot de produção (branch `contexto`, coleta 2026-11-22): `docs/contexto/supabase/cron.md` (27 jobs ativos, um a um: schedule, owner, comando), `cron-runs.md` (últimas 3 execuções de cada), `queues.md` (pgmq NÃO instalada — não existe fila pgmq neste projeto), `extensions.md` (pg_cron 1.6.4 + pg_net 0.20.4), `vault.md` (3 segredos: edge_invoke_service_key, spot_cron_key, xbz_cron_key — todos presentes), `stats.json` (est_rows + heap_bytes de todas as tabelas da camada), `triggers.md`, `views.md`, `policies.md`, `tables/public/{cron_heartbeats,cron_watchdog_seen,integration_outbox,system_alerts,telemetry_logs*,audit_logs*}.md`. Corpos SQL lidos em `docs/contexto/supabase/functions/public/`: `_invoke_edge_function`, `_invoke_spot_sync`, `_invoke_xbz_sync`, `cron_watchdog`, `xbz_sync_watchdog`, `upsert_cron_heartbeat`, `apply_lgpd_retention`, `cleanup_old_integration_outbox`, `cleanup_old_system_alerts`, `resolve_stale_system_error_alerts`, `resolve_alert`, `alert_on_outbox_dead`, `alert_subscribers_for`, `check_telemetry_alerts`, `alerts_mttr_by_type`, `alerts_severity_timeseries`, `maintain_monthly_partitions`. Edges lidas integralmente: `process-outbox`, `alert-dispatcher`, `check-expiry-alerts` (+`contractExpiry.ts`), `check-cotacao-followup` (+`cotacaoFollowUp.ts`), e por grep dirigido `check-sla-alerts`, `check-approval-escalations`, `weekly-report`, `weekly-summary-report`, `maintain-partitions`, `spot-api`, `xbz-sync-pedidos`, `send-push-notification`; compartilhados `_shared/cronHealth.ts`, `_shared/notifications.ts`, `_shared/logger.ts`, `_shared/security.ts` (verifyCronSecret). Migrations: as 14 que agendam/religam/vigiam (`*cron*`, `*religa*`, `*watchdog*`, `*agenda*`, `*retencao*`, `*dedupe*`, `*particao*`) lidas, e extração automática dos 74 nomes de job declarados em `supabase/migrations/**` cruzada 1-a-1 com os 27 ativos. Front/CI: `HealthDashboard.tsx`, `AlertSubscriptionsPanel.tsx`, `SystemAlertsView.tsx`, `AlertDetail.tsx`, `useCriticalAlertsBadge.ts`, `.github/workflows/paridade-banco.yml`, `scripts/ci/paridade-migrations-banco.{mjs,sql}`, `deploy_edge_functions_promo_supply.sh`, `.github/workflows/deploy-edge-functions.yml`. Cruzado contra `docs/pendencias/_indice.md` para descartar o já corrigido. RESULTADOS NEGATIVOS (confirmados, NÃO são achados): (1) Diferença (a) migrations×produção: dos 74 nomes declarados, 54 não estão ativos — 33 foram desagendados explicitamente por migration e 19 dos 21 restantes são `scan-*` de saúde de banco e `cleanup-*` de retenção substituídos por decisão documentada (`20261117200000`, `20261117230000`, `20261117170000`); nenhum fluxo de compras depende deles. (2) `cron_watchdog` (job 123) itera `cron.job WHERE active` — NENHUM dos 27 jobs ativos escapa, e o parser de período derivou corretamente TODOS os 22 schedules distintos em uso (verificado campo a campo: `* * * * *`→60s, `*/15`→900s, `45 * * * *`→3600s, `0 7 * * *`→86400s, `0 11 * * 1`→604800s); os ramos `split_part(...,3)` da função são código morto para cron de 5 campos, mas nenhum job ativo passa por eles. (3) Particionamento: `audit_logs`/`telemetry_logs` NÃO são particionadas em produção (`snapshot.json`: `kind=table`, `is_partition=false`, `parent=null` nas 14 tabelas) — as partições não "acabam", e `ensure-audit-logs-next-partition` foi desagendada por migration e `ensure-telemetry-logs-next-partition` nunca existiu em prod; a decisão de não particionar está documentada em `20261117170000:23-33`. `maintain-partitions` sem cron já está registrado como `edge-maintain | INATIVO POR DECISAO`. (4) A duplicação `contract-expiry-check`(115, 07:00) + `expiry-alerts-check`(117, 10:00)→mesma edge `check-expiry-alerts` já está tratada (`obs-cron-contrato`, CONCLUIDO): a edge passou a cobrir contratos e o job 115 foi deixado intocado porque `cron.alter_job`/`cron.unschedule` são negados aos roles das migrations (`20261121180000:21-28`). Verifiquei o efeito das duas execuções diárias: as escritas são idempotentes (auto-expirar cotação, marcar pagamento atrasado só muda o que ainda não mudou) e as notificações caem no dedupe `(user_id, title, created_at>=hoje)` de `_shared/notifications.ts:54-64` — não há alerta duplicado. (5) SPOT e XBZ não têm heartbeat, mas têm observabilidade própria e funcional: `spot_api_sync_log` (481 linhas) e `xbz_sync_watchdog()` que mede o dado espelhado, não o agendador. (6) `SYSTEM_ERROR` fecha sozinho: dedupe por `(message, tenant)` em `check_telemetry_alerts` + `resolve_stale_system_error_alerts()` (24h) chamado no início do `cron_watchdog` a cada 15 min — PR #267/#270 confirmados no corpo da função em produção. FORA DO ESCOPO / NÃO VERIFICADO: não há acesso SQL vivo, então toda afirmação sobre produção vem do snapshot de 2026-11-22; não consigo ler os secrets das edges, então não verifiquei se `CRON_SECRET`, `SLACK_WEBHOOK_URL` ou `RESEND_API_KEY` estão configurados (o acoplamento `CRON_SECRET` × `_invoke_edge_function` está descrito dentro do achado 1 e já consta como NÃO VERIFICADO em `docs/auditoria-implementacao-261120.md:882`). Não executei `npm run test:rls`/`test:e2e` nem nada que escreva. Deixei de fora, por impacto ~nulo hoje: `20261117230000:36-41` tenta desagendar `'cleanup-deadlock-snapshots'` e `'cleanup-wal-rate-snapshots'` enquanto os jobs declarados se chamam `...-daily` (`20260712193607:185`, `20260712221049:30`) — o laço é no-op silencioso, mas nenhum dos dois está ativo em produção; e os grants de tabela de `anon`/`authenticated` (DELETE/INSERT/UPDATE/TRUNCATE) em `cron_heartbeats` e `system_alerts`, hoje barrados por RLS, que pertencem à camada de segurança.

**Comandos executados nesta camada:**

- perl -0777 -ne 'cron.schedule(...)' supabase/migrations/*.sql | sort -u -> 74 nomes de job declarados; cruzado com os 27 de cron.md: 54 declarados-e-inativos, 5 ativos-sem-migration
- while read j; do grep -rl "'$j'" supabase/migrations/; done < ativos.txt -> 0 ocorrências para cleanup-health-scan-runs, cleanup-checkpoint-snapshots, reset-pg-stat-statements, weekly-vacuum-analyze, xbz-sync-watchdog-hourly
- grep -c cron scripts/ci/paridade-migrations-banco.sql -> 0 (o verificador de paridade não olha o schema cron; paridade-migrations-banco.mjs:46-50 exclui 'cron.' de propósito)
- grep -rn 'cron_heartbeats' src/ supabase/ scripts/ + grep nos 186 corpos de função do snapshot -> único escritor é upsert_cron_heartbeat; ZERO leitores (nenhuma view, RPC, tela ou workflow)
- grep -rn 'recordCronHeartbeat(' supabase/functions/ -> 9 nomes distintos, idênticos às 9 linhas semeadas em 20260719000002_cron_heartbeats.sql:29-38 (as 9 linhas de produção são a seed, não prova de execução)
- grep -rn 'integration_outbox' src/ supabase/functions/ scripts/ -> único escritor é o próprio process-outbox (UPDATE) + cleanup_old_integration_outbox; nenhum produtor (INSERT) em lugar nenhum
- python3 stats.json -> integration_outbox heap_bytes=0 e alert_subscriptions heap_bytes=0 (zero páginas de heap: tabelas comprovadamente vazias, não é estimativa de reltuples)
- python3 snapshot.json tables -> audit_logs/telemetry_logs e as 12 tabelas _2026MM/_legacy: kind=table, is_partition=false, parent=null (nada particionado em produção)
- /tmp/claude-0/.../deno/bin/deno test --no-lock --allow-net --allow-env --allow-read supabase/functions/check-cotacao-followup -> ok | 11 passed | 0 failed; inclui 'shouldSendFollowUp volta a enviar depois da janela de dedupe' (24h), comportamento que o handler bloqueia

### Infraestrutura, deploy e CI — prefixo `CI` · **revisado**

REVISADO INTEGRALMENTE: os 13 workflows de .github/workflows/ (aplicar-migration-prod, automation-local, branch-hygiene-audit, contexto, dependency-review, deploy-edge-functions, guards, inventario-estado-semanal, main, notifica-falha-main, paridade-banco, provisionar-vapid, types-sync) — gatilhos, blocos `permissions:`, pinagem de actions, `continue-on-error`/`|| true`/`exit 0`, e todos os 12 nomes distintos de `secrets.*` conferidos contra a lista real de 18 secrets do repo via API; scripts/rls-audit.ts + scripts/rls-audit.allowlist.json + scripts/lib/psql-leitura.mjs; deploy_edge_functions_promo_supply.sh (FUNCTIONS, BLOCKED_FUNCTIONS, NO_JWT_FUNCTIONS, loop de deploy); supabase/config.toml; vercel.json; vite.config.ts (plugin PWA, workbox, runtimeCaching, build/sourcemap, manualChunks); index.html (CSP e metas de segurança); public/ (push-handler.js, manifest.webmanifest, robots.txt, dependency-health.*); dist/ já construído (173 entradas de precache, 151 .map inspecionados por conteúdo); .env.example vs todas as `import.meta.env.VITE_*` usadas em src/; .gitignore; package.json (scripts, ausência de engines/packageManager), bun.lock + bun.lockb + package-lock.json (datas e versões cruzadas), .nvmrc (ausente), .github/toolchain.json; tsconfig.json/app/node; eslint.config.js (escopo e ignores); vitest.config.ts; vitest.rls.config.ts; playwright.config.ts + tests-e2e/global-setup.ts + fixtures.ts; docs/agentes/github-ci.md, docs/agentes/deploy.md, docs/ci/README.md. EVIDÊNCIA DE PRODUÇÃO/CI: estado de branch protection (nenhuma regra), default workflow permissions (read), lista de runs da main e logs dos 3 jobs do último run verde do main.yml (45063738746) — incluindo o log literal do passo 'Security RLS Audit', do `deno test` e do Playwright. FORA: não consegui verificar as env vars nem os headers HTTP de produção da Vercel — `list_projects`/`filter_project_envs` na team `juca1` devolvem vazio/404 para este token, e `curl https://promosupply.com.br` é bloqueado pelo proxy do sandbox (403 'no rule allows this host'); também não consegui ler o estado real de `verify_jwt` das 40 edges em produção (Management API desabilitada no snapshot e sem MCP apontando para `lmypcdfsrgfftzhxawao`). Esses pontos estão marcados como hipótese com o comando exato para confirmar. Não rodei `npm run test:rls` nem `npm run test:e2e` (falam com produção). Não alterei nenhum arquivo.

**Comandos executados nesta camada:**

- deno check --no-lock em supabase/functions/*/index.ts (40 funções, Deno 2.9.8/TS 6.0.3) -> 19 falham; códigos: 15x TS2304, 15x TS18046, 13x TS2345, 10x TS2339, 9x TS2774, 3x TS7006, 3x TS2352, 1x TS2771, 1x TS2769, 1x TS18047
- deno run --no-check --allow-net --allow-env <repro importando _shared/validation.ts> e chamando errorResponse(new Error('boom')) -> 'THROW: ReferenceError - corsHeaders is not defined'
- grep nos *_test.ts/*test.ts das 4 edges que falham E têm teste (check-sla-alerts, run-audit, telemetry, workflow-engine) -> nenhum importa o `index.ts` da própria função; logo `deno test` não type-checa nenhum dos 19 arquivos quebrados
- npm audit --omit=dev -> 'found 0 vulnerabilities' (exit 0). npm audit completo -> 11 moderate, TODAS em devDependencies (workbox-build/glob, @oclif/core/minimatch via artillery, @tailwindcss/typography/postcss-selector-parser). O job `dependencias` do guards.yml bloqueia só HIGH/CRITICAL alcançável por `dependencies` (audit-prod.mjs --level high) -> comportamento correto, nada a corrigir
- npm run guards -> exit 1 com 46 falhas, TODAS em scripts/ci/inventario-types/gentypes.unit.mjs e no proxy pgbouncer, com erro 'rm: command not found'. ARTEFATO DO MEU SANDBOX, não do repo: `which rm` aqui devolve /root/.claude/rm-guard/.../refuse/rm e o teste monta um PATH só com links para o core POSIX achado via which. Prova de que o repo está são: o run 45063738733 de 'Guards offline do repositorio' no commit d9c58bc concluiu success
- node scripts/ci/check-test-inventory.mjs -> exit 0 ('33 suite(s) Node cobertas'); node scripts/ci/render-workflow-docs.mjs --check -> exit 0 ('bate com os 13 workflows'); node scripts/ci/gerar-matriz-edge-tabela.mjs --check -> exit 0
- node scripts/ci/check-agents-md-integrity.mjs -> exit 0: 'AGENTS.md OK: 8 secoes presentes; conjunto com docs/agentes/: 84844 bytes (base HEAD: 84844 bytes em 13 arquivos)'. O guard confere tamanho e presença de seção, não a veracidade do conteúdo
- github_list_actions_secrets(adm01-debug/Promo_Supply_V2) -> 18 secrets. Dos 12 nomes usados nos workflows, FALTAM: SUPABASE_SERVICE_ROLE_KEY (main.yml:89) e TYPES_SYNC_PR_TOKEN (types-sync.yml:477, documentado como opcional com fallback para github.token em :32-36 — não é achado)
- github_get_job_logs(job 137335181082, grep RLS) -> '🔍 RLS Audit: lendo pg_policies e pg_class' / '✅ RLS Audit: 340 política(s) em 160 tabela(s), nenhuma aberta.' — o passo RODA e passa (0,65 s)
- github_get_job_logs(job 137335180744, grep ignored) -> 'ok | 152 passed | 0 failed | 13 ignored'; os 13 ignorados são 'Multi-tenant Isolation Security Test', 'Security: Workflow Engine rejects unauthenticated requests', 'Fuzzing: Workflow Engine rejects malformed payloads', 'telemetry rejects unauthenticated requests' (+3 de telemetry) e os 6 de dependency-health (incl. 'POST (no auth) -> 403' e 'POST (non-admin) -> 403')
- github_get_job_logs(job 137335460857) -> '[global-setup] Auth state saved to tests-e2e/.auth-state.json' e '30 passed (24.3s)' — o E2E autentica de verdade; o comentário `e2e-com-placeholder` em main.yml:9 não se aplica mais
- github_get_branch_rules(main) -> [] (sem branch protection); github_get_workflow_permissions -> default 'read'
- python3 sobre dist/assets/*.map -> 151 de 151 arquivos têm `sourcesContent` com o TypeScript original completo (ex.: ../../src/components/compras/AISupplierSuggestion.tsx); 0 de 152 .js tem comentário sourceMappingURL (sourcemap: 'hidden'); não existe .vercelignore
- grep -rn 'frame-ancestors|X-Frame-Options|window.top|Permissions-Policy|Strict-Transport' src/ index.html vercel.json public/ -> nenhuma ocorrência
- grep -rn 'caches\.' src/ public/ -> nenhuma ocorrência (nenhum código limpa o Cache Storage do service worker)

### Segurança transversal — prefixo `SEC` · **revisado**

REVISADO: (1) XSS — todos os sinks do repo: `dangerouslySetInnerHTML` (src/components/ui/chart.tsx:173 e src/components/accessibility/AccessibilityStyles.tsx:79 — ambos SEGUROS: CSS estático/sanitizado por CSS_IDENT_RE/CSS_COLOR_RE), `document.write` (1 ocorrência: ContractDetailsModal.tsx:156), zero `innerHTML`/`insertAdjacentHTML`/`outerHTML` em src; os 40 index.ts de edge que montam HTML (generate-contract-pdf é o único com interpolação de dado do usuário). dompurify: usado em NovaSolicitacaoModal.tsx:202-203 (sanitiza ANTES de gravar) e em src/lib/security.ts:15 — este último é ÓRFÃO (zero imports de `@/lib/security` em todo src; só o próprio teste o usa), portanto a função de sanitização central não protege nenhuma tela. (2) Storage — storage.md + as 12 policies de storage.objects (policies.md:348-359) cruzadas com os 4 caminhos de upload do código: `documentos` (ContractDetailsModal.tsx:126), `comprovantes` (PagamentoDetailModal.tsx:104), `fiscal-documents` (DocumentosFiscais.tsx:132), `product-images` (CatalogoProdutos.tsx:76). Caminhos: `{tenant}/{uid}/...` nos dois primeiros (privateStoragePath, src/lib/storageFiles.ts:30) e `uploads/{uid}/...` no fiscal — todos coerentes com as policies, que também checam tenant via `user_belongs_to_tenant`/`profiles`; não achei caminho em que usuário de outra empresa alcance arquivo de bucket privado. URL assinada = 1 h (storageFiles.ts:16) com renovação a cada 50 min (PagamentoDetailModal.tsx:81) — adequado, não é achado. Nenhum bucket tem validação de TAMANHO no código (só `documentos` tem limite no bucket: 10 MB); `accept=` é a única validação de tipo em 3 dos 4 (client-side). (3) localStorage/sessionStorage — 50 ocorrências mapeadas: token JWT do Supabase fica em localStorage por configuração explícita (src/integrations/supabase/client.ts:15), `selectedEmpresaId` (useAuth.tsx:21), rascunho de solicitação, fila offline (useOfflineSync), cache de pedidos do recebimento, filtros, histórico de busca; nada que seja segredo de servidor. src/lib/secureStorage.ts (wrapper AES-GCM) é ÓRFÃO — zero usos; a fila offline e o cache de pedidos gravam em claro. (4) Logger/telemetria — src/lib/logger.ts inteiro, supabase/functions/_shared/logLevel.ts, edge `telemetry`, policies de telemetry_logs/system_alerts, retenção (apply_lgpd_retention: 90 dias p/ telemetry). (5) Open redirect — as 21 ocorrências de window.open/location.href; `openExternalSpotUrl` (spotHelpers.ts:52) tem allowlist correta e é usado no catálogo SPOT, mas 2 caminhos não passam por ele. (6) postMessage/iframe — ZERO ocorrências em src, supabase/functions, public/ e index.html: nada a revisar. (7) Auth — Auth.tsx inteiro, useAuth.tsx, useAccountLockout.ts, useMFA.ts, useWebAuthn.ts, usePasswordResetRequests.ts, webauthn-register/authenticate, RPCs is_account_locked/record_failed_login/clear_login_lockout/log_login_attempt (corpo + grants). Política de senha no signup é razoável (8+, maiúscula/minúscula/dígito/especial, Auth.tsx:27-33) + checagem de senha vazada (isPasswordLeaked); login NÃO enumera usuário (mensagem única 'Email ou senha incorretos', Auth.tsx:130); o cadastro informa 'Este email já está cadastrado' (Auth.tsx:174) — enumeração no SIGNUP, mas é mensagem do próprio GoTrue. Passkey: confirmado fail-closed (webauthn-authenticate/index.ts:183) e o botão da tela de login está `disabled={true}` com tooltip explicativo (Auth.tsx:354-356) — o cahier está correto nessa parte. (8) Sessão — useSessionIdleTimeout (30 min, montado em MainLayout.tsx:47, OK), active_sessions, logout multi-dispositivo. (9) Os 4 'possiveis_segredos_no_codigo' do baseline: TODOS são fixtures de teste sintéticas, nenhum segredo real — scripts/ci/inventario-types/banco.unit.mjs:18 (token `sbp_01234…` placeholder), :227 (strings de teste do regex PARECE_CREDENCIAL), identidade.unit.mjs:285 (`sbp_t0k3n_d3_t3st3_na0_p0d3_v4z4r`), pg.mjs:51 (JWT falso com assinatura 'abcdefghijklmnop' dentro de um INSERT de fixture em cron.job). Varredura extra por `eyJ…`/`sb_secret_`/`sbp_` fora de testes achou só supabase/migrations/20260711153258…sql:19 — chave ANON (pública por design) de um ref ERRADO/abandonado (trwgmplubeqxrxpncdgf); não é vazamento. Não existe `.env` neste checkout (só `.env.example` versionado), ao contrário do que o AGENTS.md afirma. (10) Injeção — external-db-bridge + allowlist (leitura linha a linha), as 9 interpolações em `.or()` do PostgREST (8 usam `escapeIlike`, 1 não), zero SQL por concatenação em edge; as 186 funções do banco não entram nesta camada. (11) Enumeração por API — só o schema `public` exposto (schemas.md); TODAS as 162 tabelas com RLS habilitado, só `cron_watchdog_seen` com 0 policies (fail-closed). FORA DE ESCOPO/NÃO VERIFICÁVEL: `max_rows` do PostgREST e a configuração do GoTrue (rate limit próprio, `disable_signup`, expiração de JWT) — Management API desabilitada no snapshot (auth.md e project-config.md dizem 'Configuração indisponível') e não há acesso SQL vivo; correção/força das policies por tabela (camada RLS); conteúdo dos 19 edges que falham `deno check` além do que toquei. OBSERVAÇÕES de baixo valor que NÃO virei achado para não inflar a lista: (a) supabase/functions/_shared/security.ts:63 — no curinga `*.dominio`, `host.endsWith(suffix.slice(1))` compara sem o ponto, então `malvadolovable.app` casa com `*.lovable.app`; sem impacto hoje porque a autenticação é por Bearer no header (não cookie) e não há `Allow-Credentials`; (b) src/pages/documentos/DocumentosFiscais.tsx:30,100,167 — `tenant_id` HARDCODED no UUID zerado (tenant legado) nos dois inserts de nota fiscal, enquanto o resto do app resolve pelo useAuth; impacto hoje nulo (prod tem 1 tenant, e é justamente o legado), mas quebra no dia da segunda empresa; (c) src/components/compras/ContractDetailsModal.tsx:228-231 — as abas 'Itens (n)' e 'Docs (n)' têm TabsTrigger mas nenhum TabsContent, e `handleUploadDocument` (:113) não está ligado a nenhum input: painel em branco e o upload de documento de contrato é código morto (provavelmente na camada de UI de outro agente).

**Comandos executados nesta camada:**

- npx vitest run src/lib/__tests__/logger.test.ts src/lib/__tests__/logger.fuzz.test.ts src/lib/__tests__/security.test.ts src/lib/__tests__/secureStorage.test.ts src/lib/__tests__/storageFiles.test.ts -> 5 arquivos passam, 80 testes passam, 0 falhas (1,21 s). Os 24 testes de logger cobrem só chaves de topo (password/token/secret/key/auth/cvv); NENHUM teste cobre objeto aninhado nem dado pessoal (cpf/cnpj/email) — a lacuna de redação não é vista por teste
- node -e '<repro de generateBackupCodes com Uint32Array(4) e arr[j%4]>' -> 10/10 códigos com a primeira metade repetida (IQ0EIQ0E, QWXYQWXY, YQBQYQBQ, ...); 'metade repetida em todos: true'
- grep -rn 'dangerouslySetInnerHTML|innerHTML|document.write|insertAdjacentHTML|DOMPurify' src supabase/functions -> 1 document.write (ContractDetailsModal.tsx:156), 2 dangerouslySetInnerHTML seguros, dompurify em 2 arquivos; grep 'lib/security' em src -> 0 imports (módulo órfão)
- grep -rn 'postMessage|addEventListener(.message.|<iframe' src supabase/functions public index.html -> nenhuma ocorrência
- grep -rn "storage.from(" src supabase/functions -> 4 caminhos (documentos, comprovantes, fiscal-documents, product-images) + migrate-storage-paths
- awk sobre $CTX/supabase/tables.md -> 162 tabelas, 0 com RLS desabilitado, 1 com 0 policies (cron_watchdog_seen)
- grep -rn 'is_account_locked|record_failed_login' supabase/functions/ e grep de auth hook nas migrations -> zero: o bloqueio de conta não é aplicado em nenhum ponto do servidor

### Testes — prefixo `TST` · **revisado**

REVISADO INTEGRALMENTE: (a) os 3 configs — vitest.config.ts, vitest.rls.config.ts, playwright.config.ts; (b) os 122 arquivos vitest de src/ (listei um a um com contagem de casos, nº de vi.mock e se renderizam componente/hook — só 12 dos 122 usam render/renderHook) e leli na íntegra os 25 mais relevantes por jornada: useSolicitacoes.test.tsx, useSolicitacoes.rls.test.tsx, useAuth.test.tsx, usePermissions.test.tsx, aprovacoesData, pendingApprovalsData, deadlineFallback, cotacaoHelpers, gerarOrdemHelpers, AcompanhamentoHelpers, recebimentoHelpers, solicitacoesHelpers, fornecedorHelpers, supplierScorecardData, devolucoesData, devolucoesModals, portalFornecedorData, applyAdvancedFilters, sourcingAnalytics, replaceContractItems, safeDisplay, contracts.test.ts, contracts-elite.test.ts, integration/{core-integrity,contract-testing,contract-validation,supabase-db,shared-schemas}, fuzzing/{edge-functions,payload-integrity}, security/rls-tenant-isolation-restrictive; (c) tests-rls/rls-isolation.test.ts inteiro (sem rodar); (d) os 7 specs de tests-e2e/ + global-setup.ts + fixtures.ts inteiros; (e) os 23 arquivos de teste Deno sob supabase/functions/ (suíte rodada: 152 passam, 13 ignorados — identifiquei cada ignorado) e supabase/functions/_shared/contracts.ts + fuzzer.ts; (f) scripts/ci/check-test-inventory.mjs integral + execução, scripts/lib/*.test.mjs (20 testes), scripts/rls-audit.ts (cabeçalho e trecho de --strict); (g) o job de testes de .github/workflows/main.yml (linhas 22-128) e grep de tests-rls/tests-e2e/INTEGRATION_TESTS em .github/ e scripts/; (h) $CTX/codigo/testes.json e hooks.json (flag coberto_por_testes dos 91 hooks) e $CTX/supabase/tables/public/approval_{workflows,steps}.md + functions.md para checar se os testes skipped divergiram do schema (não divergiram); (i) cobertura v8 medida e agregada por pasta; (j) lista de secrets do repo via MCP GitHub (somente nomes) para provar que os secrets de E2E existem. FICOU DE FORA, com motivo: não rodei `npm run test:rls` nem `npm run test:e2e` (proibido — falam com produção); não executei os testes Deno marcados como ignored com env real (exigiria credencial de produção); não medi cobertura das edge functions (deno coverage exigiria --allow-write); não auditei o conteúdo de src/tests/load/backend-stress.yml (artillery, não é suíte de asserção) nem os 33 *.unit.mjs de scripts/ caso a caso (fora do foco de regra de negócio — só o check-test-inventory, que é o guard, foi lido integral).

**Comandos executados nesta camada:**

- npx vitest run --reporter=json --outputFile=<scratchpad>/vitest-full.json -> 530 suites, 2323 testes: 2311 passam, 0 falham, 12 pending; os 12 pending estão TODOS em src/tests/integration/supabase-db.test.ts (o único arquivo skipped)
- npx vitest run --coverage (v8) -> Statements 14.82% (2770/18684), Branches 9.91% (1577/15907), Functions 12.03% (675/5607), Lines 15.37% (2479/16127), em 38,76s
- agregação do coverage-summary.json por pasta -> src/stores 97.3% | src/lib 76.7% | src/services 14.0% | src/pages 12.8% (74 de 99 arquivos com 0%) | src/features 12.4% (42 de 54 com 0%) | src/hooks 11.0% (46 de 62 com 0%) | src/components 6.5% (154 de 177 com 0%) | src/routes 0.0% (0/109) | src/App.tsx 0.0%
- deno test --no-lock --allow-net --allow-env --allow-read supabase/functions/ (Deno 2.9.8) -> ok | 152 passed | 0 failed | 13 ignored (1s). Ignorados: dependency-health/index.test.ts (6), run-audit/rls_test.ts 'Multi-tenant Isolation Security Test' (1), telemetry/index.test.ts (4), workflow-engine/fuzz.test.ts (2). _shared/integrity_test.ts roda 0 testes
- esbuild de supabase/functions/_shared/contracts.ts com zod v3 + node <scratchpad>/drift/check.mjs -> [elite:75] start_workflow sem entity_type => success:false ['entity_type: Required']; [elite:106] sync_po {action,entity_id} => success:false ['connectionId: Required','entity: Required']; [elite:119] {action:'PUSH'} => success:false ['connectionId: Required','entity: Required']; [validation:33] {action:'start_workflow'} => success:false ['template_id','entity_type','entity_id' Required]
- node -e require('./node_modules/zod/package.json') -> zod 4.6.7, layout index.js/index.cjs; `ls node_modules/zod/lib` -> No such file or directory (o alias de vitest.config.ts:48 aponta para caminho inexistente)
- node scripts/ci/check-test-inventory.mjs -> exit 0: 'OK — main.yml cobre as edges por pasta; 33 suite(s) Node cobertas por bloco run: (0 na allowlist)'
- node --test scripts/lib/psql-leitura.test.mjs scripts/lib/seguranca-processo.test.mjs -> 20 pass, 0 fail
- grep -rn 'tests-rls|rls.config|test:rls|RLS_TEST_USER' .github/ scripts/ -> nenhuma ocorrência em workflow (só um comentário em scripts/ai-context/gerar.mjs)
- grep -rn 'fixtures' tests-e2e/ playwright.config.ts (excluindo o próprio fixtures.ts) -> vazio: nenhum spec importa a fixture autenticada
- grep -rn 'INTEGRATION_TESTS' .github/ scripts/ package.json -> vazio
- MCP github_list_actions_secrets(adm01-debug/Promo_Supply_V2) -> 18 secrets, incluindo E2E_TEST_EMAIL, E2E_TEST_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_DB_URL

### Internacionalização, acessibilidade e mobile — prefixo `UX` · **revisado**

REVISADO INTEGRALMENTE: (1) i18n — `src/i18n/config.ts` (único arquivo de config; não há `src/i18n/*` além dele) e os 3 arquivos de locale reais `src/locales/{pt,en,es}/translation.json` (90 linhas / 74 chaves folha cada). Observação de escopo: o briefing falava em '7 arquivos de i18n'; o repo tem 4 (1 config + 3 locales). Extraí por script todas as chamadas `t('...')`, `i18nKey` e `useTranslation` do `src/` (9 chamadas `t()` em 2 arquivos; 3 arquivos importam `react-i18next`) e comparei chave-a-chave com os 3 JSONs (paridade 100%, 0 chaves faltando; 5 valores idênticos ao pt em en, 15 em es). Quantifiquei string PT hardcoded por script (texto JSX + `placeholder`/`title`/`aria-label`/`label`): 1134 em 182 arquivos. (2) Acessibilidade — li os 5 arquivos de `src/components/accessibility/` (`AdvancedAccessibility.tsx` 412 linhas, `SkipLinks.tsx`, `AccessibilityStyles.tsx`, `VisuallyHidden.tsx`, `accessibilityHelpers.ts`) e rastreei cada export até o ponto de montagem. Varri os 56 arquivos de `src/components/ui/` (o briefing dizia 61) para primitivas relevantes: `dialog.tsx`, `sheet.tsx`, `table.tsx`, `toast.tsx`/`toaster.tsx`/`sonner.tsx`, `input.tsx`, `label.tsx`, `form.tsx`, `command.tsx`, `sidebar.tsx`, `button.tsx`, `floating-input.tsx`. Rodei 4 scanners próprios sobre todos os `.tsx` de `src/` (exceto `__tests__`): input/textarea sem nome acessível (151), `<Label>` sem `htmlFor` (195), botão só-ícone sem nome (29 após remover falsos positivos de uma 1ª passada que dava 104), clicável não-interativo sem teclado (40), `<img>` sem `alt` (0), `tabIndex` positivo (0), `autoFocus` (1, legítimo), `<th>` sem `scope` (74 — NÃO reportado: `<th>` dentro de `<thead><tr>` tem escopo implícito, não é falha WCAG), `DialogContent`/`SheetContent` sem título (4), modal sem caminho de rolagem (41). Confirmei no código do Radix (`node_modules/@radix-ui/react-toast/dist/index.mjs:407`, `react-dialog/dist/index.mjs:241-262`) que aria-live de toast, Esc, foco inicial e retorno de foco são da biblioteca e NÃO estão sobrescritos (0 `onEscapeKeyDown`/`onInteractOutside`/`modal={false}` no repo) — por isso NÃO reportei esses itens. (3) Mobile — `index.html` inteiro, `tailwind.config.ts` (383 linhas; breakpoints default, nenhum override), `src/hooks/use-mobile.tsx`, `src/components/mobile/BottomNavigation.tsx`, `src/styles/utilities.css` (utilitários de safe-area), e todos os elementos `position: fixed` com âncora bottom/top (11). Verifiquei rolagem horizontal de TODAS as tabelas: a primitiva `src/components/ui/table.tsx:7` já envolve em `overflow-auto` e os 16 `<table>` crus têm `ScrollArea`/`overflow-x-auto` — NÃO há tabela sem rolagem, não é achado. `min-w-` fixo: maior valor do repo é `min-w-[300px]`, nada estoura 360px — não é achado. Alvo de toque: só 3 botões a 24px (limite exato do SC 2.5.8 AA) — não é achado. (4) Telas do fluxo central lidas linha a linha: `/solicitacoes` (Solicitacoes.tsx, SolicitacaoCard.tsx, SolicitacaoKanban.tsx, solicitacao/SolicitacaoFormSteps.tsx, NovaSolicitacaoModal.tsx), `/cotacao` (Cotacao.tsx, cotacaoHelpers.ts, CotacaoManualModal.tsx, ComparadorCotacoes.tsx, VisualComparadorCotacoes.tsx, PriceComparator.tsx, visual-comparador/ComparadorCharts.tsx), `/pedidos` (Pedidos.tsx, PedidoDetailsDialog.tsx, PedidoMobileCard.tsx), `/acompanhamento`, `/aprovacoes` (Aprovacoes.tsx, PendingApprovalsList.tsx, pending-approvals/ApprovalModals.tsx), `/recebimento` (RecebimentoOffline.tsx, ReceivingFormView.tsx), mais a casca (`App.tsx`, `MainLayout.tsx`, `Shell.tsx`, `AppSidebar.tsx`, `HeaderActions.tsx`, `AppRoutes.tsx`). (5) Formatação: `src/lib/utils.ts`, `src/lib/dateUtils.ts`, `src/lib/exportData.ts`, `src/lib/pdfGenerator.ts`, `src/lib/negotiationOutreach.ts`; contei `formatCurrency` (239 usos corretos) contra 42 formatações de moeda à mão, 10 `toLocaleString()` sem locale, 44 `toLocaleDateString`/`split('/')`. FICOU DE FORA, com motivo: telas de admin (`/admin/*`, `/auditoria`, `/compliance`, `/seguranca`, `/admin-telemetria`) só foram varridas pelos scanners, não lidas linha a linha — fora do fluxo de campo priorizado no briefing; contraste de cor real (exige render, e a regra proíbe rodar o app/E2E); leitor de tela real e teste de teclado real (idem); `supabase/functions/` (fora da camada); 9 arquivos órfãos de `src/components/ui/` (celebration-particles, chart, empty-state-illustrations, form, kbd, page-header-extras, sidebar, status-indicators, enhanced-search-helpers) só anotados como higiene — `form.tsx` entra como evidência do achado de labels.

**Comandos executados nesta camada:**

- node -e '<flatten+diff dos 3 translation.json>' -> pt 74 / en 74 / es 74 chaves folha; 0 faltando em qualquer idioma; 5 valores iguais ao pt em en, 15 em es
- grep -rn "\bt(['\"]" src --include=*.tsx --include=*.ts | grep -v __tests__ -> 9 chamadas t() no repo inteiro, em 2 arquivos (CatalogoProdutos.tsx, ComprasDashboard.tsx)
- grep -rln useTranslation src -> 3 arquivos (LanguageSwitcher, CatalogoProdutos, ComprasDashboard)
- node <scratchpad>/a11y/pt.mjs -> 1134 strings PT hardcoded visíveis ao usuário em 182 arquivos
- node -e '<demo Intl vs toFixed/toLocaleString>' -> 'R$ 1234.50' (toFixed) e 'R$ 8.990,9' (toLocaleString pt-BR) contra 'R$ 1.234,50'/'R$ 8.990,90' do Intl
- grep -rnoE "R\\$ \\$\{[^}]*(toFixed\(|toLocaleString\('pt-BR'\))" src | grep -v __tests__ -> 42 ocorrências em 26 arquivos
- grep -rn formatCurrency src | grep -v __tests__ | wc -l -> 239 usos do utilitário correto
- node <scratchpad>/a11y/scan.mjs -> input/textarea sem nome 151; <Label> sem htmlFor 195; <img> sem alt 0; tabIndex positivo 0; autoFocus 1; <th> sem scope 74
- node <scratchpad>/a11y/icons.mjs -> 29 <Button> só-ícone sem aria-label/title/sr-only
- node <scratchpad>/a11y/click.mjs -> 40 div/span/Card/TableRow/motion.tr com onClick sem role+tabIndex+handler de teclado
- node <scratchpad>/a11y/modal.mjs -> 41 DialogContent sem rolagem própria nem interna
- grep -rn 'aria-describedby="dialog-desc"' src | wc -l -> 38 modais apontando para o mesmo id, que existe em 1 lugar só (PunchOutCatalogs.tsx:228)
- grep -n describedby node_modules/@radix-ui/react-dialog/dist/index.mjs -> linha 262 concatena a descrição do Radix, logo o id pendurado é inócuo quando há <DialogDescription> (motivo de eu NÃO reportar isso como achado forte)
- grep -rn 'aria-live|role=' src/components/ui/toast.tsx src/components/ui/toaster.tsx src/components/ui/sonner.tsx -> nada no wrapper; grep em node_modules/@radix-ui/react-toast/dist/index.mjs:407 mostra aria-live assertive/polite na biblioteca -> toast está OK
- grep -rn 'MotionConfig|useReducedMotion' src -> 0; grep -rl framer-motion src --include=*.tsx | wc -l -> 110 arquivos
- grep -rn 'LiveRegion|useFocusTrap|useAccessibility|announceToScreenReader' src | grep -v components/accessibility/ -> vazio (3 exports nunca usados fora do próprio arquivo)
- grep -rn 'id="main-content"|id="main-navigation"|id="search"' src -> main-content em App.tsx:24 E MainLayout.tsx:155 (id duplicado); main-navigation em MainLayout.tsx:73; 'search' não existe
- grep -n jsx-a11y eslint.config.js package.json -> vazio (nenhum gate de acessibilidade no lint)
- npx vitest run src/components/accessibility/__tests__/accessibilityHelpers.test.ts src/lib/__tests__/utils.test.ts -> 2 arquivos, 76 testes, todos passam (é o único teste de a11y do repo; não há teste de i18n)
- for f in src/components/ui/*.tsx; grep -rl importado -> 9 arquivos órfãos em src/components/ui/, incluindo form.tsx (o que faria a ligação label/erro)
- grep -rn 'index % ' src/pages src/components | grep -v 'COLORS\[' -> único caso que fabrica valor de negócio: Pedidos.tsx:294-305

### Código morto, duplicação e documentação operacional — prefixo `HIG` · **revisado**

VARRIDO: (1) Órfãos — resolvedor de imports próprio sobre os 820 arquivos rastreados de `src/` (resolve `@/`, relativos, `index.*`, `import()` dinâmico e imports multilinha; o grafo de `componentes.json` perde imports multilinha e por isso lista `ui/chart.tsx` como órfão quando não é). Resultado: 18 módulos sem nenhum importador, cada um reconfirmado com `git grep`. Os 5 hooks do `hk-dead` (useBulkOperations, useFlashHighlight, useFormDataProtection, useFormDirty, useUnsavedChangesWarning) foram confirmados órfãos e NÃO relatados — decisão DESCARTADO do dono em `docs/pendencias/hk-dead-mortos.md`. (2) Nomes duplicados — os 10 de `componentes.json` inspecionados um a um, com os importadores reais resolvidos por parser de `import {}`; 3 deles (PageHero, PageHeaderStats, PageHeaderQuickActions) são artefato do gerador (barril `page-header.tsx:11` reexporta de `page-header-extras.tsx`) e Toaster é alias intencional em `App.tsx:4-5` — nenhum é duplicata real. (3) Utilitários reimplementados — moeda (7 implementações), data (2 pilhas paralelas: `lib/utils.ts` × `lib/dateUtils.ts`), normalização de texto (1 canônica + 2 slugs ad hoc), CNPJ (2 máscaras: entrada progressiva × exibição), percentual de variação (8 cópias, todas com guarda de divisor zero — divergem só no rótulo, não no número). Dias úteis: NÃO EXISTE no repo (`grep -i 'diasuteis|businessday|addBusinessDays|workingDay'` em `src` e `supabase` = 0 ocorrências). Divergências de moeda medidas numericamente em Node. (4) Os 2 ciclos de `grafo.json` analisados: um é só de tipos (erasado na compilação), o outro é runtime real. (5) TODO/FIXME/HACK/XXX/WIP em `src/` e `supabase/functions/` fora de teste = ZERO (os 5 de `baseline.json` são a própria regex de `scripts/ai-context/gerar.mjs`); `@ts-expect-error`/`@ts-ignore` em produção = 1 (`supabase/functions/_shared/contracts.ts:1`, import remoto Deno, legítimo); `eslint-disable` em produção = 1 (`src/components/ui/enhanced-search.tsx:102`). Nada a relatar nesse item — a camada está sã aí. (6) Histórico de `types.ts` lido (repo é shallow, 50 commits). (7) `render-workflow-docs.mjs --check` e `gerar-matriz-edge-tabela.mjs --check` executados: ambos OK — a documentação GERADA está em sincronia; a divergência está na documentação ESCRITA À MÃO. (8) Cada afirmação checável de `AGENTS.md` e de `docs/agentes/{deploy,github-ci,banco,regras-dominio}.md` verificada contra o repo, contra o snapshot de produção, contra os logs de CI e contra a API do GitHub. (9) `ESTADO_ATUAL.md` + `DOCS/ESTADO/` datados e confrontados com o código de hoje. FORA DE ESCOPO (outras camadas): regras RLS/policies, lógica de negócio dos fluxos, tipos de edge functions (`deno check`), segurança de autenticação. NÃO RELATADO POR SER AMBIENTE, NÃO DEFEITO: `npm run guards` falha aqui com 46/559 (todas em `scripts/ci/inventario-types/gentypes.unit.mjs`, asserções de limpeza de temporário em `/tmp` após SIGTERM); o MESMO commit `d9c58bc` tem `guards.yml` run 647 VERDE no CI — é diferença do contêiner, não regressão do repo. Um agente futuro não deve perseguir isso.

**Comandos executados nesta camada:**

- python3 resolvedor de imports sobre `git ls-files src` -> 18 módulos de src/ sem nenhum importador
- git grep -n <Componente> -- src (para cada órfão) -> só a própria definição; confirma órfão
- git log --oneline -- src/components/compras/SourcingHistoryConsole.tsx -> d9c58bc (#306), 32f87b2 (#304), 64c1922
- git show --stat d9c58bc -> SourcingHistoryConsole.tsx +623, sourcingAnalytics.ts +413, teste +155 = 1026 inserções
- node -e '<5 formatadores de moeda do repo em paralelo>' -> 1234.567 vira 'R$ 1.234,57' na tela e 'R$ 1.234,567' no CSV; null vira 'R$ 0,00' em lib/utils e '—' em xbzHelpers; priceHistoryHelpers.formatBRL(null) lança TypeError
- node -e "createClient(undefined,undefined)" -> THROWS: supabaseUrl is required.
- node scripts/ci/render-workflow-docs.mjs --check -> exit 0: 'OK: docs/ci/README.md bate com os 13 workflows.'
- node scripts/ci/gerar-matriz-edge-tabela.mjs --check -> exit 0
- node scripts/ci/check-agents-md-integrity.mjs -> exit 0: 'AGENTS.md OK: 8 secoes presentes; 84844 bytes' (só conta seções e bytes, não confere fato nenhum)
- npx tsc --noEmit -p tsconfig.app.json --noUnusedLocals -> 467 erros TS6133/TS6192; 459 fora de testes; 121 com identificador minúsculo (estado/handler/variável, não ícone)
- npx eslint src/pages/fornecedores/Fornecedores.tsx -> exit 0 (porque no-unused-vars está off em eslint.config.js:23,25)
- grep -rn 'functions deploy' .github/workflows/ -> 1 ocorrência (deploy-edge-functions.yml:194); docs/agentes/deploy.md:23 afirma que esse grep dá zero
- python3 contagem do FUNCTIONS=() do deploy script x pastas -> 31 no script, 40 pastas com index.ts, 42 pastas; 9 edges fora do script
- ls .github/workflows/*.yml | wc -l -> 13 (AGENTS.md:99-101 diz 7)
- ls supabase/migrations/*.sql | wc -l -> 325 (AGENTS.md:86 diz 279)
- github_get_job_logs(job 137335181082, grep RLS) -> '✅ RLS Audit: 340 política(s) em 160 tabela(s), nenhuma aberta' — a auditoria RODA em produção
- GET /repos/adm01-debug/Promo_Supply_V2/branches/main/protection -> HTTP 200 com required_status_checks ['Contratos da automação local'], allow_force_pushes:false, allow_deletions:false (docs/agentes/github-ci.md:167 afirma 404)
- GET /repos/adm01-debug/Promo_Supply_V2 -> private:false, visibility:'public', secret_scanning:disabled, secret_scanning_push_protection:disabled, delete_branch_on_merge:false
- github_list_runs_for_workflow(guards.yml, main) -> run 647 em d9c58bc: success (contra 46 falhas locais)
- grep -rn 'compras_sla' . --exclude-dir=node_modules --exclude-dir=.git -> só docs/pendencias/_indice.md; a função existe em produção (snapshot functions.md:88) sem migration e sem chamador
- npm run guards -> exit 1, 46/559 falhas, TODAS em gentypes.unit.mjs (artefato de ambiente; CI verde no mesmo commit)

