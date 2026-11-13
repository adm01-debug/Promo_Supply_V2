# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada hora pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `975d0f9582d4a73f2d87e3cc10356fd6968a7634` (2026-11-13T09:35:48-03:00).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (688), SQL (294), Markdown (72), JavaScript (65), JSON (23), YAML (9), Shell (7), CSS (6)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: tailwind, radix/shadcn
- estado: react-query, zustand
- gerenciador_pacotes: bun
- node: n/d
- python: n/d
- deploy: vercel
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 1190 |
| arquivos_codigo | 756 |
| linhas_codigo | 159947 |
| rotas | 55 |
| rotas_http_backend | 0 |
| vistas_por_id | 0 |
| itens_menu | 48 |
| modulos | 86 |
| componentes | 328 |
| hooks | 89 |
| edge_functions | 37 |
| tabelas | 163 |
| migrations | 293 |
| cron_jobs | 68 |
| testes | 165 |
| workflows | 8 |
| scripts | 47 |
| docs_md | 72 |

## Onde ficam as coisas
- telas: src/pages (53)
- componentes: src/components (214), src/pages (78), src/features (33)
- hooks: src/hooks (60), src/features (11), src/components (10)
- servicos_logica: src/lib (21), src/stores (5), src/integrations (3)
- testes: co-localizado (__tests__) (99), outro (37), co-localizado (*.test) (19)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/ci (15), scripts/types-sync (7), scripts/inventario (5)
- docs: (raiz) (4), docs (2)
- nomenclatura: {"componentes":"PascalCase (84%)","hooks":"use + PascalCase","servicos":"camelCase (94%)","edge_functions":"kebab-case (97%)","tabelas":"snake_case (89%)"}
- instruções para agentes no repo: AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| components/accessibility | 0 | 0 | 5 | 1 | 0 | 0 |
| components/admin | 0 | 0 | 9 | 5 | 1 | 7 |
| components/compras | 0 | 0 | 103 | 80 | 6 | 58 |
| components/navigation | 0 | 0 | 5 | 1 | 1 | 0 |
| components/pagamentos | 0 | 0 | 9 | 12 | 1 | 9 |
| components/security | 0 | 0 | 15 | 9 | 3 | 18 |
| components/ui | 0 | 0 | 61 | 12 | 1 | 0 |
| features/auth | 0 | 0 | 7 | 1 | 1 | 3 |
| features/layout | 0 | 0 | 32 | 77 | 6 | 54 |
| hooks | 0 | 0 | 61 | 56 | 6 | 60 |
| lib | 0 | 0 | 21 | 53 | 5 | 46 |
| pages | 0 | 1 | 1 | 0 | 1 | 0 |
| pages/acompanhamento | 1 | 1 | 2 | 6 | 1 | 4 |
| pages/admin | 10 | 11 | 14 | 4 | 9 | 16 |
| pages/admin-telemetria | 1 | 1 | 2 | 2 | 2 | 3 |
| pages/aprovacoes | 1 | 1 | 2 | 10 | 1 | 11 |
| pages/auditoria | 1 | 1 | 1 | 2 | 1 | 1 |
| pages/auth | 0 | 1 | 2 | 5 | 3 | 4 |
| pages/buyer | 1 | 1 | 3 | 5 | 1 | 8 |
| pages/catalogo-produtos | 1 | 1 | 1 | 7 | 1 | 7 |
| pages/catalogo-spot | 1 | 1 | 6 | 82 | 7 | 58 |
| pages/catalogo-xbz | 1 | 1 | 9 | 79 | 7 | 54 |
| pages/compliance | 1 | 1 | 2 | 3 | 1 | 7 |
| pages/configuracoes | 1 | 1 | 1 | 77 | 6 | 54 |
| pages/contratos | 1 | 1 | 1 | 4 | 2 | 9 |
| pages/cotacao | 1 | 2 | 2 | 14 | 1 | 14 |
| pages/dashboard | 3 | 2 | 2 | 28 | 2 | 26 |
| pages/dev | 0 | 1 | 1 | 3 | 2 | 0 |
| pages/devolucoes | 1 | 1 | 3 | 9 | 1 | 9 |
| pages/documentos | 1 | 1 | 1 | 2 | 2 | 2 |
| pages/estoque | 1 | 1 | 1 | 5 | 1 | 7 |
| pages/fornecedores | 3 | 2 | 3 | 10 | 2 | 10 |
| pages/gerar-ordem | 0 | 1 | 2 | 8 | 1 | 9 |
| pages/historico | 1 | 1 | 7 | 7 | 1 | 11 |
| pages/kanban | 1 | 1 | 1 | 2 | 1 | 1 |
| pages/licitacoes | 1 | 1 | 2 | 77 | 6 | 54 |
| pages/negociacao-ia | 1 | 1 | 1 | 3 | 2 | 6 |
| pages/orcamentos | 1 | 1 | 1 | 78 | 6 | 55 |
| pages/pagamentos | 1 | 1 | 1 | 12 | 1 | 9 |
| pages/pedidos | 1 | 1 | 3 | 13 | 1 | 8 |
| pages/portal-fornecedor | 0 | 1 | 2 | 78 | 6 | 55 |
| pages/qualificacao | 1 | 1 | 1 | 78 | 6 | 58 |
| pages/recebimento | 1 | 1 | 3 | 3 | 1 | 5 |
| pages/recompra | 1 | 1 | 1 | 3 | 1 | 7 |
| pages/relatorio-negociacoes | 1 | 1 | 3 | 5 | 1 | 9 |
| pages/relatorios | 1 | 1 | 2 | 4 | 2 | 5 |
| pages/seguranca | 1 | 1 | 1 | 83 | 9 | 67 |
| pages/solicitacoes | 1 | 1 | 2 | 20 | 2 | 14 |
| pages/sourcing | 1 | 4 | 4 | 8 | 1 | 15 |
| stores | 0 | 0 | 5 | 0 | 1 | 2 |

## Rotas (url → arquivo)
- `/` [redirect] → **ARQUIVO NÃO RESOLVIDO** (protegida)
- `/__dev/xbz-network-panel` [tela] → src/pages/dev/XbzNetworkPanelHarness.tsx
- `/*` [tela] → src/pages/NotFound.tsx
- `/acompanhamento` [tela] → src/pages/acompanhamento/Acompanhamento.tsx (protegida)
- `/admin/dependency-health` [tela] → src/pages/admin/DependencyHealth.tsx (protegida)
- `/admin/docs` [tela] → src/pages/admin/DeveloperDocs.tsx (protegida)
- `/admin/erp` [tela] → src/pages/admin/ERPConnections.tsx (protegida)
- `/admin/fiscal` [tela] → src/pages/admin/FiscalDashboard.tsx (protegida)
- `/admin/health` [tela] → src/pages/admin/HealthDashboard.tsx (protegida)
- `/admin/health/alerts/:id` [tela] → src/pages/admin/AlertDetail.tsx (protegida)
- `/admin/punchout` [tela] → src/pages/admin/PunchOutCatalogs.tsx (protegida)
- `/admin/sourcing-pipeline` [tela] → src/pages/admin/SourcingPipeline.tsx (protegida)
- `/admin/sso` [tela] → src/pages/admin/SSOConfig.tsx (protegida)
- `/admin/storage-migration` [tela] → src/pages/admin/StorageMigration.tsx (protegida)
- `/admin/telemetria` [tela] → src/pages/admin-telemetria/AdminTelemetria.tsx (protegida)
- `/admin/workflows` [tela] → src/pages/admin/WorkflowAdmin.tsx (protegida)
- `/aprovacoes` [tela] → src/pages/aprovacoes/Aprovacoes.tsx (protegida)
- `/auditoria` [tela] → src/pages/auditoria/Auditoria.tsx (protegida)
- `/auth` [tela] → src/pages/auth/Auth.tsx
- `/buyer-performance` [tela] → src/pages/buyer/BuyerPerformanceDashboard.tsx (protegida)
- `/catalogo-produtos` [tela] → src/pages/catalogo-produtos/CatalogoProdutos.tsx (protegida)
- `/catalogo-spot` [tela] → src/pages/catalogo-spot/CatalogoSpot.tsx (protegida)
- `/catalogo-xbz` [tela] → src/pages/catalogo-xbz/CatalogoXbz.tsx (protegida)
- `/compliance` [tela] → src/pages/compliance/ComplianceDashboard.tsx (protegida)
- `/compras` [tela] → src/pages/dashboard/ComprasDashboard.tsx (protegida)
- `/configuracoes-centro-custo` [tela] → src/pages/configuracoes/ConfiguracoesCentroCusto.tsx (protegida)
- `/contratos` [tela] → src/pages/contratos/Contratos.tsx (protegida)
- `/cotacao` [tela] → src/pages/cotacao/Cotacao.tsx (protegida)
- `/cotacao/:id` [tela] → src/pages/cotacao/Cotacao.tsx (protegida)
- `/dashboard-executivo` [tela] → src/pages/dashboard/DashboardExecutivo.tsx (protegida)
- `/devolucoes` [tela] → src/pages/devolucoes/Devolucoes.tsx (protegida)
- `/documentos-fiscais` [tela] → src/pages/documentos/DocumentosFiscais.tsx (protegida)
- `/estoque` [tela] → src/pages/estoque/GestaoEstoque.tsx (protegida)
- `/fornecedores` [tela] → src/pages/fornecedores/Fornecedores.tsx (protegida)
- `/gerar-ordem` [tela] → src/pages/gerar-ordem/GerarOrdem.tsx (protegida)
- `/historico-compras` [tela] → src/pages/historico/HistoricoCompras.tsx (protegida)
- `/kanban` [tela] → src/pages/kanban/KanbanWorkflow.tsx (protegida)
- `/licitacoes` [tela] → src/pages/licitacoes/Licitacoes.tsx (protegida)
- `/negociacao-ia` [tela] → src/pages/negociacao-ia/NegociacaoIA.tsx (protegida)
- `/orcamentos` [tela] → src/pages/orcamentos/Orcamentos.tsx (protegida)
- `/pagamentos` [tela] → src/pages/pagamentos/Pagamentos.tsx (protegida)
- `/pedidos` [tela] → src/pages/pedidos/Pedidos.tsx (protegida)
- `/portal-fornecedor` [tela] → src/pages/portal-fornecedor/PortalFornecedor.tsx (protegida)
- `/qualificacao-fornecedores` [tela] → src/pages/qualificacao/QualificacaoFornecedores.tsx (protegida)
- `/recebimento` [tela] → src/pages/recebimento/RecebimentoOffline.tsx (protegida)
- `/recompra-inteligente` [tela] → src/pages/recompra/RecompraInteligente.tsx (protegida)
- `/relatorios` [tela] → src/pages/relatorios/Relatorios.tsx (protegida)
- `/relatorios/negociacoes` [tela] → src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx (protegida)
- `/seguranca` [tela] → src/pages/seguranca/Seguranca.tsx (protegida)
- `/solicitacoes` [tela] → src/pages/solicitacoes/Solicitacoes.tsx (protegida)
- `/sourcing` [tela] → src/pages/sourcing/Sourcing.tsx (protegida)
- `/sourcing/:id` [tela] → src/pages/sourcing/RFxDetails.tsx (protegida)
- `/sourcing/:id/auction` [tela] → src/pages/sourcing/AuctionRoom.tsx (protegida)
- `/sourcing/novo` [tela] → src/pages/sourcing/RFxCreate.tsx (protegida)
- `/supplier-performance` [tela] → src/pages/fornecedores/SupplierPerformance.tsx (protegida)

## Rotas HTTP de backend
- (nenhum)

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `ai-demand-prediction` — tabelas: -; chamada por 1 arquivo(s) do front
- `ai-negotiation` — tabelas: -; chamada por 1 arquivo(s) do front
- `ai-supplier-risk` — tabelas: -; chamada por 1 arquivo(s) do front
- `ai-supplier-suggestion` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `alert-dispatcher` — tabelas: notifications, system_alerts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `check-approval-escalations` — tabelas: approval_history, approval_steps, approval_workflows, notifications; chamada por 0 arquivo(s) do front, por SQL/cron
- `check-cotacao-followup` — tabelas: cotacoes, notifications, profiles; chamada por 0 arquivo(s) do front, por SQL/cron
- `check-expiry-alerts` — tabelas: cotacoes, notifications, pagamentos, user_roles; chamada por 0 arquivo(s) do front, por SQL/cron
- `check-sla-alerts` — tabelas: notifications, pagamentos, pedidos, solicitacoes, user_roles; chamada por 1 arquivo(s) do front, por SQL/cron
- `dependency-health` — tabelas: audit_logs, dependency_health, dependency_health_history; chamada por 1 arquivo(s) do front
- `erp-sync` — tabelas: erp_connections, erp_sync_log; chamada por 1 arquivo(s) do front
- `external-db-bridge` — tabelas: query_telemetry; chamada por 1 arquivo(s) do front
- `fiscal-orchestrator` — tabelas: fiscal_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `generate-contract-pdf` — tabelas: contract_items, contract_penalties, contracts; chamada por 1 arquivo(s) do front
- `guided-buying-ai` — tabelas: fornecedores, produtos; chamada por 1 arquivo(s) do front
- `health-dashboard` — tabelas: audit_logs, health_scan_runs, system_alerts, v_system_health_overview; chamada por 1 arquivo(s) do front
- `maintain-partitions` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `migrate-helper` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `migrate-storage-paths` — tabelas: profiles; chamada por 1 arquivo(s) do front
- `process-invoice-idp` — tabelas: -; chamada por 1 arquivo(s) do front
- `process-outbox` — tabelas: integration_outbox, system_alerts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `punchout-receive` — tabelas: punchout_sessions, solicitacoes; chamada por 0 arquivo(s) do front
- `punchout-setup` — tabelas: punchout_catalogs, punchout_sessions, user_tenants; chamada por 1 arquivo(s) do front
- `run-audit` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `scim-v2` — tabelas: sso_configurations; chamada por 1 arquivo(s) do front
- `send-push-notification` — tabelas: notifications, push_subscriptions; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `spot-api` — tabelas: spot_api_sync_log, spot_pedidos, spot_sessions, user_roles; chamada por 0 arquivo(s) do front, por SQL/cron
- `spot-proxy` — tabelas: spot_pedidos, spot_sessions, user_roles; chamada por 1 arquivo(s) do front
- `system-simulation` — tabelas: -; chamada por 1 arquivo(s) do front
- `telemetry` — tabelas: telemetry_logs; chamada por 1 arquivo(s) do front
- `webauthn-authenticate` — tabelas: webauthn_challenges, webauthn_credentials; chamada por 1 arquivo(s) do front
- `webauthn-register` — tabelas: webauthn_challenges, webauthn_credentials; chamada por 1 arquivo(s) do front
- `weekly-report` — tabelas: cotacoes, notifications, pagamentos, pedidos, solicitacoes, user_roles; chamada por 0 arquivo(s) do front, por SQL/cron
- `weekly-summary-report` — tabelas: cotacoes, notifications, pedidos, solicitacoes, user_roles; chamada por 0 arquivo(s) do front, por SQL/cron
- `workflow-engine` — tabelas: workflow_approvals, workflow_edges, workflow_instances, workflow_logs, workflow_nodes; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `xbz-proxy` — tabelas: xbz_carrinho_log, xbz_credentials; chamada por 1 arquivo(s) do front
- `xbz-sync-pedidos` — tabelas: system_alerts, xbz_credentials, xbz_pedido_status_history, xbz_pedidos; chamada por 0 arquivo(s) do front, por SQL/cron

## Cron jobs (pg_cron / vercel)
- `alert-dispatcher-1min` * * * * * (20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql)
- `approval-escalation-check` */15 * * * * → edge check-approval-escalations (20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql)
- `archive-audit-logs-old-partitions` 30 3 2 * * (20260712223354_e00522cc-ebe6-4957-bfef-dd6d115c4f5b.sql)
- `archive-telemetry-logs-old-partitions` 45 3 3 * * (20260712223444_2608de7b-4f9c-4f50-a31a-d8f8834233e9.sql)
- `check_secret_rotation_due_daily` 0 6 * * * (20260712222404_4c5c4e92-d7a7-4548-9b05-5a5607c29869.sql)
- `cleanup_expired_password_resets_daily` 35 3 * * * (20260712222142_a253a878-d059-471c-bcd0-7a8f1ce178b9.sql)
- `cleanup-audit-logs-daily` 15 3 * * * (20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql)
- `cleanup-deadlock-snapshots-daily` 15 4 * * * (20260712193607_e90c84a9-d4eb-42b3-8564-899bacc01fa2.sql)
- `cleanup-geo-access-logs` 05 4 * * * (20260711183924_3acc4e45-ed15-45d8-b20d-15add5c34b87.sql)
- `cleanup-health-scan-runs-daily` 5 8 * * * (20260712195527_2f3ed84f-104a-4828-8d30-2e569a97d1e9.sql)
- `cleanup-integration-outbox-daily` 30 3 * * * (20260711183148_8694a780-0861-49f9-a337-d565e5e15ef4.sql)
- `cleanup-login-attempts` 55 3 * * * (20260711183924_3acc4e45-ed15-45d8-b20d-15add5c34b87.sql)
- `cleanup-query-telemetry` 55 3 * * * (20260711191946_872a6814-ab1c-4596-b6d7-c3e5c8379396.sql)
- `cleanup-rate-limit-logs` 00 4 * * * (20260711183924_3acc4e45-ed15-45d8-b20d-15add5c34b87.sql)
- `cleanup-security-logs-daily` 0 3 * * * (20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql)
- `cleanup-system-alerts` 45 3 * * * (20260711183647_cb1ddb07-f7db-40d3-bb0e-d42adfb914a0.sql)
- `cleanup-telemetry-hourly` 30 * * * * (20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql)
- `cleanup-telemetry-logs` 50 3 * * * (20260711183924_3acc4e45-ed15-45d8-b20d-15add5c34b87.sql)
- `cleanup-temp-file-snapshots-daily` 20 3 * * * (20260712221049_be67ff27-0f0f-4271-9017-6ebe0acafe1b.sql)
- `cleanup-wal-rate-snapshots-daily` 25 3 * * * (20260712221049_be67ff27-0f0f-4271-9017-6ebe0acafe1b.sql)
- `cleanup-webhook-events-daily` 15 3 * * * (20260711183148_8694a780-0861-49f9-a337-d565e5e15ef4.sql)
- `contract-expiry-check` 0 7 * * * → edge check-expiry-alerts (20260402113249_b5e59bf9-8946-423d-8295-96738436f121.sql)
- `cotacao-followup-check` 0 12 * * * → edge check-cotacao-followup (20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql)
- `cron-watchdog` */5 * * * * (20260711183343_43dc2b31-4f1c-4e2d-bea9-1da967fe29e5.sql)
- `ensure-audit-logs-next-partition` 0 4 25 * * (20260712223300_6f689f47-2c15-468b-b667-679e47facc11.sql)
- `ensure-telemetry-logs-next-partition` 0 4 25 * * (20260712222930_cd4547af-7aac-44d8-8ac2-48991a40dfbf.sql)
- `expiry-alerts-check` 0 10 * * * → edge check-expiry-alerts (20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql)
- `lgpd_retention_daily` 15 3 * * * (20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql)
- `outbox-worker-1min` * * * * * (20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql)
- `pg-activity-watchdog` */2 * * * * (20260712110815_762ad29c-b3f7-4e44-a0ec-f6b624174ca3.sql)
- `refresh-mv-dashboard-kpis` */15 * * * * (20260712222620_110cc02b-1d32-42e6-a778-96d41f60eeb2.sql)
- `run-all-health-scans-hourly` 17 * * * * (20260712195527_2f3ed84f-104a-4828-8d30-2e569a97d1e9.sql)
- `scan_duplicate_indexes_weekly` 47 4 * * 1 (20260713110159_94ff935c-b0ce-41ae-8d40-bda6ca91f908.sql)
- `scan_table_growth_daily` 17 3 * * * (20260713105907_4b197a0e-74a0-4812-9175-87b9ca7c56ba.sql)
- `scan_txid_wraparound_30min` */30 * * * * (20260713110314_5a4d642f-daaa-45c3-903b-93a46d92bfa6.sql)
- `scan_unused_indexes_weekly` 23 4 * * 1 (20260713110028_8ada5be7-193d-41f7-be83-9cd839c1ea56.sql)
- `scan-autovacuum-starvation-daily` 45 5 * * * (20260712193915_b284d70d-8be1-40ea-bc27-9960670c2653.sql)
- `scan-blocking-locks-1m` * * * * * (20260713105330_daf01ebf-ca7d-477b-b37a-d968d74afc67.sql)
- `scan-cache-hit-ratio-30m` */30 * * * * (20260713105021_ef02f040-6e49-4cd8-b68f-8a9c06e9abdb.sql)
- `scan-connection-saturation-5m` */5 * * * * (20260713105021_ef02f040-6e49-4cd8-b68f-8a9c06e9abdb.sql)
- `scan-dangerous-statements` 17 * * * * (20260712110143_e51c0b00-e688-4f8e-971f-74952f32cac7.sql)
- `scan-deadlocks-conflicts-15min` */15 * * * * (20260712193607_e90c84a9-d4eb-42b3-8564-899bacc01fa2.sql)
- `scan-idle-in-txn-2m` */2 * * * * (20260713105624_e9839757-2d20-4362-9acb-6a4c4e20a482.sql)
- `scan-invalid-dup-indexes-daily` 45 4 * * * (20260712194543_ce151ace-bcd7-41ef-a90a-45b137ebd495.sql)
- `scan-lock-waits-2min` */2 * * * * (20260712195141_7ca09192-718b-4750-8fc4-0c2f7e582404.sql)
- `scan-long-running-queries-2m` */2 * * * * (20260713105021_ef02f040-6e49-4cd8-b68f-8a9c06e9abdb.sql)
- `scan-long-running-transactions-10min` */10 * * * * (20260712142817_cb94f248-eabf-4053-bdd7-aa03f4bf09f1.sql)
- `scan-long-running-txn-5min` */5 * * * * (20260712195030_ff90d369-cac2-4bc6-949e-efc30b3cb9f9.sql)
- `scan-partition-candidates-weekly` 0 6 * * 3 (20260712141935_8b9bcc8b-e10f-4daf-9fff-34edf503ca62.sql)
- `scan-replication-slots-30m` */30 * * * * (20260712194423_2774c8d2-c16b-490e-baec-5530d857a2d8.sql)
- `scan-rollback-rate-15m` */15 * * * * (20260713104844_2b93e809-e50c-42b3-8e4d-116073563946.sql)
- `scan-scan-runs-sla` */10 * * * * (20260712224134_ca41be74-9d7b-4676-9337-9ebbdecedab3.sql)
- `scan-schema-hygiene-weekly` 0 7 * * 0 (20260712195253_10a16ba3-8b4a-424c-ba4b-2c3af454030a.sql)
- `scan-sequence-exhaustion-daily` 15 6 * * * (20260712194927_357b0d5b-8b64-42dd-8df1-0dcedef79735.sql)
- `scan-slow-query-hotspots-1h` 7 * * * * (20260713105738_d761e68c-1321-43bc-b757-9ede7dc86517.sql)
- `scan-stale-alerts-daily` 30 7 * * * (20260712195408_36fb0763-69fd-42de-8270-201660eb8fe7.sql)
- `scan-tables-without-pk-daily` 15 5 * * * (20260712192008_74f174de-700f-4c1e-93fe-f8cea3ca8355.sql)
- `scan-temp-file-usage-10min` */10 * * * * (20260712192153_2a9b74d6-8ba5-4308-ba55-87b4b9396331.sql)
- `scan-temp-spill-15m` */15 * * * * (20260713105504_34c5b9f6-89bd-47ed-956a-449faeb0d993.sql)
- `scan-toast-bloat-weekly` 0 6 * * 0 (20260712194040_3b7d19ab-d3dd-42ee-933b-4340975fe077.sql)
- `scan-unindexed-fks-weekly` 30 5 * * 1 (20260713105146_e80e0d55-eec6-4fb9-a279-49501a05bb70.sql)
- `scan-unused-indexes-weekly` 15 5 * * 1 (20260712194659_702ebacc-eef1-4a7a-a2fc-2a58f8ea316e.sql)
- `scan-xid-wraparound-daily` 30 3 * * * (20260712194304_ad9d9443-9507-4e9f-8751-193ff290401e.sql)
- `security_definer_drift_quarterly` 0 4 1 1,4,7,10 * (20260712215549_fcc6489a-009e-4050-8955-9ac162d4f3dd.sql)
- `sla-alert-check` 0 */4 * * * → edge check-sla-alerts (20260402113249_b5e59bf9-8946-423d-8295-96738436f121.sql)
- `sla-alerts-check` */30 * * * * → edge check-sla-alerts (20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql)
- `weekly-procurement-report` 0 11 * * 1 → edge weekly-report (20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql)
- `weekly-summary-report-job` 0 8 * * 1 → edge weekly-summary-report (20260507194402_b30cf397-f164-4a9e-b0d1-bbe8d1ecc990.sql)

## Integrações externas
- SDKs: Supabase, i18next, react-query, zod
- hosts mais citados: api.resend.com, wa.me, ws.spotgifts.com.br, www.spotgifts.com.br, ai.gateway.lovable.dev, api.pwnedpasswords.com, example.okta.com, hooks.slack.com, hub-harmony-unite.lovable.app, lmypcdfsrgfftzhxawao.supabase.co, raw.githubusercontent.com, xml.cxml.org
- webhooks recebidos: migrate-helper
- env de integração (só nomes): CRON_SECRET, GITHUB_DISPATCH_TOKEN, LOVABLE_API_KEY, RESEND_API_KEY, SCIM_BEARER_TOKEN, SEFAZ_API_TOKEN, SEFAZ_WEBHOOK_URL, SLACK_WEBHOOK_URL, VITE_BITRIX_WEBHOOK_URL

## Permissões / papéis
- papéis no código: user (6), admin (5), system (4), assistant (1)
- enums de papel: app_role: admin|coordinator|buyer|finance|viewer|supplier
- guards: src/features/auth/components/ProtectedRoute.tsx · rotas protegidas: 52 · públicas: /__dev/xbz-network-panel, /*, /auth
- feature flags: nenhuma

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- componentes_ambiguos: 0
- menu_sem_destino: 2 — ex.: Fechar -> close-modal, Mais -> more
- edges_orfas: 8 — ex.: ai-supplier-suggestion, alert-dispatcher, fiscal-orchestrator
- edges_chamadas_sem_pasta: 1 — ex.: process-solicitacao-neural
- tabelas_sem_rls: 0
- tabelas_usadas_sem_definicao: 0
- tabelas_com_drift_migration_vs_types: 49 — ex.: active_sessions, approval_delegations, approval_hierarchy
- rpcs_sem_definicao: 0
- componentes_orfaos: 13 — ex.: src/components/atoms/EliteImage.tsx, src/components/atoms/PreloadLink.tsx, src/components/compras/HistoricoComprasModal.tsx
- componentes_com_nome_duplicado: 10 — ex.: AnimatedCounter, COLORS, Confetti
- scripts_orfaos: 0
- arquivos_nao_lidos_por_tamanho: 0
- env_usadas_nao_declaradas: 1 — ex.: VITE_SUPABASE_PUBLISHABLE_KEY
- ciclos_de_import: 2
- possiveis_segredos_no_codigo: 4 — ex.: scripts/ci/inventario-types/banco.unit.mjs:18, scripts/ci/inventario-types/banco.unit.mjs:227, scripts/ci/inventario-types/pg.mjs:51

## Grafo de código (graphify)
- não gerado neste run. uvx --from "graphifyy[sql]" graphify update .  (ou: bun run graph:update); saída em graphify-out/ — graph.json e graph.html NÃO são versionados (dezenas de MB); use `graphify query/path/explain` localmente

## Hotspots (arquivos mais alterados, 90 dias)
- AGENTS.md (6)
- package.json (6)
- .github/workflows/contexto.yml (4)
- .github/workflows/main.yml (4)
- ESTADO_ATUAL.md (3)
- docs/agentes/contexto-ia.md (3)
- docs/agentes/github-ci.md (3)
- docs/agentes/mapa-repo.md (3)
- docs/ci/README.md (3)
- scripts/ai-context/README.md (3)
- scripts/automation.config.json (3)
- scripts/ci/branch-podaveis.mjs (3)
- scripts/supabase_snapshot/README.md (3)
- scripts/supabase_snapshot/snapshot.py (3)
- .github/workflows/notifica-falha-main.yml (2)

## Workflows
- `automation-local.yml` — Automação local (pull_request, push, workflow_dispatch)
- `branch-hygiene-audit.yml` — Branch Hygiene Audit (schedule, workflow_dispatch; cron 34 9 * * 1)
- `contexto.yml` — Contexto para agentes de IA (1h) (push, schedule, workflow_dispatch; cron 3 * * * *)
- `guards.yml` — Guards offline do repositorio (pull_request, push, workflow_dispatch)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 41 10 * * 1)
- `main.yml` — Freight Quest CI/CD (pull_request, push)
- `notifica-falha-main.yml` — Notifica falha na main (workflow_run)
- `types-sync.yml` — types-sync (push, schedule, workflow_dispatch; cron 7 * * * *)

## Scripts npm
- `maintenance:doctor`: `sh scripts/maintenance/run.sh doctor --root .`
- `maintenance:check`: `sh scripts/maintenance/run.sh check --root . --ref origin/main`
- `maintenance:heal`: `sh scripts/maintenance/run.sh heal --root . --ref origin/main`
- `test:maintenance`: `node --test scripts/maintenance/maintenance.unit.mjs`
- `dev`: `vite`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `test`: `vitest run`
- `test:rls`: `vitest run --config ./vitest.rls.config.ts`
- `test:bridge`: `bun run scripts/validate-bridge.ts`
- `test:watch`: `vitest`
- `test:e2e`: `playwright test`
- `test:load`: `npx artillery run src/tests/load/backend-stress.yml`
- `test:coverage`: `vitest run --coverage`
- `test:all`: `npm run lint && npm run typecheck && npm run test && npm run test:coverage && npm run test:e2e`
- `test:simulate`: `curl -X POST "$VITE_SUPABASE_URL/functions/v1/system-simulation" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d '{"iterations": 50}'`
- `typecheck`: `tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json`
- `contexto:codigo`: `node scripts/ai-context/gerar.mjs --out docs/contexto/codigo`
- `contexto:regras`: `python3 scripts/regras_negocio/generate.py --repo . --out docs/contexto/regras --profile regras --schema-snapshot docs/contexto/supabase --no-pointer`
- `contexto:banco`: `python3 scripts/supabase_snapshot/snapshot.py`
- `contexto:indice`: `python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md --fonte "banco real=docs/contexto/supabase" --fonte "código=docs/contexto/codigo" --fonte "regras de negócio=docs/contexto/regras"`
- `test:scripts`: `node --test scripts/ci/*.unit.mjs scripts/lib/*.test.mjs`
- `docs:ci`: `node scripts/ci/render-workflow-docs.mjs`
- `docs:matriz-edge`: `node scripts/ci/gerar-matriz-edge-tabela.mjs`
- `guards`: `npm run test:scripts && node scripts/ci/check-test-inventory.mjs && node scripts/ci/render-workflow-docs.mjs --check && node scripts/ci/gerar-matriz-edge-tabela.mjs --check`
- `prepare`: ``
- `automation:doctor`: `node scripts/automation.mjs doctor`
- `automation:test`: `node scripts/automation.mjs test`
- `automation:check`: `node scripts/automation.mjs check --ref HEAD`
- `automation:heal`: `node scripts/automation.mjs heal --ref origin/main`
- `automation:nightly`: `node scripts/automation.mjs nightly --ref origin/main`
- `automation:graph`: `node scripts/automation.mjs graph`
- `automation:status`: `node scripts/automation.mjs graph status`
- `automation:install-hooks`: `node scripts/automation.mjs install-hooks`
- `automation:uninstall-hooks`: `node scripts/automation.mjs uninstall-hooks`

## Documentos (raiz e docs/)
- `AGENTS.md` — AGENTS.md — Promo Supply V2 (128 linhas)
- `CLAUDE.md` (2 linhas)
- `ESTADO_ATUAL.md` — ESTADO ATUAL DO SISTEMA — Promo Supply V2 (264 linhas)
- `README.md` — Welcome to your Lovable project (59 linhas)
- `docs/AUTOMACAO_LOCAL.md` — Automação local — Promo_Supply_V2 (124 linhas)
- `docs/prod-readiness.md` — Prontidão para produção — Promo Supply V2 (478 linhas)
- subpastas de docs/: docs/agentes (8), docs/contexto (2), docs/ci (1), docs/conventions (1), docs/mapa (1)


## Últimos commits
- 2026-11-13 `975d0f95` chore(deps): converge lockfile p/ versoes corretas (OSV -84%) (#68)
- 2026-11-13 `e7ff5fb4` fix(rls): comprador passa a ver contratos (só leitura) para comprar dentro dos acordos (#65)
- 2026-11-13 `fa24df57` docs(prod): inventário e prontidão para produção com provas (docs/prod-readiness.md) (#45)
- 2026-11-13 `50817a04` fix(ci): guard de encoding pega mojibake de acento, seta e U+FFFD (#67)
- 2026-11-12 `3118a1fd` fix(scripts): corrige e blinda os scripts operacionais, de CI e de contexto (#31)
- 2026-11-12 `6c530a06` security(banco): fecha vazamento de papel/empresa e KPIs de outras organizações (#66)
- 2026-11-12 `f6c2d75b` fix(banco): cadastro preenche a empresa certa quando o app envia vazia ou errada (#64)
- 2026-11-12 `9eefca6e` fix(dashboard): números do dashboard de compras deixam de vir inflados e o período passa a valer (#63)
- 2026-11-12 `27032009` fix(banco): cotação e pedido voltam a ser criados (coluna de moeda com 1 caractere) (#62)
- 2026-11-12 `db1dfe5c` fix(deps): zera vulns high/critical do advisory e corrige regressoes do bump zod (#61)
- 2026-11-12 `e06e53b1` fix(ui): seta do tour de onboarding aparecia corrompida (#57)
- 2026-11-12 `62016b23` chore: resgata fixes ôrfãos de agentes (logger truncation + inventário) (#60)
- 2026-11-12 `b6e0427f` fix(ui): vencimento das urgências aparecia um dia antes (#59)
- 2026-11-12 `284eef46` fix(export): números do CSV saíam com ponto decimal no Excel pt-BR (#58)
- 2026-11-12 `d429cef0` fix(dashboard): KPIs de compras voltam a carregar e ficam restritos ao grupo do usuário (#55)

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
