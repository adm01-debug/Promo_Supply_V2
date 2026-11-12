# Prontidão para produção — Promo Supply V2

> Auditoria de 2026-11-12 sobre a `main` em `4cc1a7a` (deploy Vercel `dpl_3PGp8bQVi6VSdWBB8yTK48fb9RKB`, READY).
> Banco auditado: Supabase `lmypcdfsrgfftzhxawao` (confirmado por `supabase_functions_list` → `project_ref`).
> Toda prova abaixo foi obtida nesta sessão (saída de comando, query ou request). Status: **OK** (com prova) ou **BLOQUEADO** (erro exato + o que falta).

## 0. Resumo

| Área | Situação |
|---|---|
| Build / typecheck / lint / testes (local, `main`) | OK — ver §1 |
| GitHub Actions na `main` | BLOQUEADO até a fila do Actions rodar — ver §2 |
| Banco: RLS | 162/162 tabelas com RLS; 6 sem policy (lixo) → PR #42 |
| Banco: advisors nível ERROR | 2 views `SECURITY DEFINER` → PR #41 |
| **Segurança crítica** | `execute_read_query` executável por visitante sem login e permite escrita como `postgres` → **PR #40** |
| Produção front | OK — SPA 200, 0 erro de runtime em 24h |
| Edges | 27 no ar; 5 não publicadas + 1 inexistente; 5 com 500 — ver §4 |
| Código pela metade | 0 TODO/FIXME/WIP; 70 elementos clicáveis sem ação, mocks no dashboard executivo — ver §5 |

## 1. Linha de base de qualidade (antes de qualquer mudança)

| Verificação | Comando | Resultado |
|---|---|---|
| Instalação | `bun install --frozen-lockfile` | BLOQUEADO **só nesta sessão**: `error: ProxyConnectFailed (403) downloading tarball jspdf@4.2.1` — `bun.lock` resolve 496 pacotes em `europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache` (bloqueado pelo proxy daqui). Contornado com `npm ci` (`package-lock.json`, registry.npmjs.org): `added 1412 packages`, exit 0 |
| Typecheck | `npm run typecheck` | OK — exit 0 |
| Lint | `npx eslint .` | OK — `0 errors, 9 warnings`, exit 0 |
| Build | `npx vite build` | OK — exit 0 |
| Testes front | `npx vitest run` | OK — `102 passed \| 1 skipped (103)` arquivos; `2250 passed \| 12 skipped (2262)` testes; exit 0. **Linha de base: 2262 testes** |
| Guards | `npm run guards` | OK — `tests 196, pass 196, fail 0`; inventário de testes OK; `docs/ci/README.md bate com os 8 workflows` |
| Segredo no bundle | `node scripts/ci/check-bundle-secrets.mjs --dist dist --env .env` | OK — `nenhum JWT service_role no bundle (137 arquivo(s))` |
| Advisory de produção | `bun audit` + `node scripts/ci/audit-prod.mjs --level high` | OK — `nenhuma advisory >= high alcancavel por dependencia de producao` (179 advisories totais, todas em devDependencies ou abaixo de high) |
| Automação local | `node scripts/automation.mjs doctor --static` / `test` | OK — `"status":"healthy"`, `issues: []`; testes exit 0 |
| Testes edge (Deno) | `deno test --allow-net --allow-env --allow-read supabase/functions/` | BLOQUEADO nesta sessão: `error: Import 'https://esm.sh/zod@3.22.4' failed` (proxy bloqueia esm.sh). Roda no job "Unit & Integration Tests" do CI |
| E2E (Playwright) | — | BLOQUEADO nesta sessão: o app em produção chama `*.supabase.co`, bloqueado pelo proxy (`curl: (56) CONNECT tunnel failed, response 403`). Roda no job E2E do CI |

## 2. GitHub Actions (8 workflows do repo + 2 dinâmicos do Copilot)

Causa das falhas da `main` em `4cc1a7a` (11:02 UTC): anotação do check-run → **"The job was not started because an Actions budget is preventing further use."** Os jobs não chegaram a executar (`steps: []`, `runner_id: 0`, log 404). Runs posteriores executaram (types-sync 13:14 ✅, contexto 12:54 ✅), então os 3 runs foram re-executados às 13:40 UTC; reproduzi localmente cada passo deles (§1) e todos passam.

| Workflow | Último run na `main` | Status |
|---|---|---|
| `main.yml` (Freight Quest CI/CD) | #367 re-executado, na fila | BLOQUEADO até rodar — falha original = orçamento do Actions, não código |
| `guards.yml` | #36 re-executado, na fila | BLOQUEADO até rodar — idem |
| `automation-local.yml` | #18 re-executado, na fila | BLOQUEADO até rodar — idem |
| `types-sync.yml` (a cada 10 min) | #483 success (13:14) | OK |
| `contexto.yml` (a cada 10 min) | #170 success (12:54); #172/#173 `cancelled` por concorrência (run novo cancela o anterior) | OK |
| `branch-hygiene-audit.yml` (semanal) | #1 success | OK |
| `notifica-falha-main.yml` | último `skipped` (nada a notificar) | OK |
| `inventario-estado-semanal.yml` (semanal) | #1 failure no passo "Abrir ou atualizar PR do inventário": `##[error]GitHub Actions is not permitted to create or approve pull requests.` | BLOQUEADO — configuração do repositório (Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"); é setting de CI/segurança, decisão do dono |

## 3. Banco (`lmypcdfsrgfftzhxawao`)

### 3.1 Advisors (lints nível ERROR, por SQL — o MCP deste projeto não expõe `get_advisors`)
| Lint | Resultado | Status |
|---|---|---|
| `rls_disabled_in_public` | 0 (162/162 com RLS) | OK |
| `policy_exists_rls_disabled` | 0 | OK |
| `auth_users_exposed` | 0 | OK |
| `rls_references_user_metadata` | 0 | OK |
| `security_definer_view` | `supplier_compliance_summary`, `v_system_health_overview` — e como `anon`: `select count(*) from supplier_compliance_summary` → **10 linhas sem login** | BLOQUEADO → PR #41 (DDL, aguardando dono) |
| (WARN) `materialized_view_in_api` | `mv_dashboard_kpis` legível por `anon` (0 linhas hoje) | BLOQUEADO → PR #41 |
| **Função `execute_read_query`** | `SECURITY DEFINER`, executável por `anon`/`authenticated`; como `anon`, `EXPLAIN (ANALYZE) WITH d AS (INSERT …) SELECT …` inseriu 1 linha (teste em transação revertida) | BLOQUEADO → **PR #40** (crítico, aguardando dono) |

### 3.2 Migrations × banco
BLOQUEADO — não existe ledger: `supabase_db_migrations` → "Tabela supabase_migrations.schema_migrations não encontrada neste projeto". 280 arquivos em `supabase/migrations/` sem registro do que rodou. Amostra: a migration mais recente (`20261107150000_execute_read_query.sql`) está aplicada (função existe, corpo com o filtro `EXPLAIN`), **mas** o `REVOKE … FROM PUBLIC` dela não tirou `anon`/`authenticated` (ver 3.1). Comparar os 280 exige decidir com o dono o caminho de apply/baseline.

### 3.3 Tabelas (162) — RLS e policies
| Tabela | Linhas (est.) | Policies | Status |
|---|---|---|---|
| `account_lockouts` | 4 | 2 | OK — RLS ativo + 2 policy(s) |
| `active_sessions` | 0 | 7 | OK — RLS ativo + 7 policy(s) |
| `alert_subscriptions` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `aliquotas_tributarias` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `allowed_countries` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `approval_delegations` | 0 | 6 | OK — RLS ativo + 6 policy(s) |
| `approval_hierarchy` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `approval_history` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `approval_rules` | 0 | 5 | OK — RLS ativo + 5 policy(s) |
| `approval_steps` | 0 | 4 | OK — RLS ativo + 4 policy(s) |
| `approval_workflows` | 0 | 6 | OK — RLS ativo + 6 policy(s) |
| `auction_bids` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `audit_logs` | 15 | 3 | OK — RLS ativo + 3 policy(s) |
| `audit_logs_202605` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `audit_logs_202606` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `audit_logs_202607` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `audit_logs_202608` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `audit_logs_202609` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `audit_logs_legacy_20260712` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `blocked_countries` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `blocked_ips` | 1 | 2 | OK — RLS ativo + 2 policy(s) |
| `budget_audit_logs` | 32 | 1 | OK — RLS ativo + 1 policy(s) |
| `budget_transactions` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `categorias` | 9 | 5 | OK — RLS ativo + 5 policy(s) |
| `category_strategies` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `checkpoint_snapshots` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `contact_notes` | 0 | 5 | OK — RLS ativo + 5 policy(s) |
| `contract_documents` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `contract_history` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `contract_items` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `contract_penalties` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `contracts` | 5 | 4 | OK — RLS ativo + 4 policy(s) |
| `cost_centers` | 7 | 2 | OK — RLS ativo + 2 policy(s) |
| `cotacoes` | 61 | 3 | OK — RLS ativo + 3 policy(s) |
| `creditos_fornecedor` | 1 | 2 | OK — RLS ativo + 2 policy(s) |
| `currencies` | 3 | 1 | OK — RLS ativo + 1 policy(s) |
| `dashboard_filter_favorites` | 0 | 4 | OK — RLS ativo + 4 policy(s) |
| `dashboard_layouts` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `deadlock_snapshots` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `department_budgets` | 32 | 6 | OK — RLS ativo + 6 policy(s) |
| `dependency_health` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `dependency_health_history` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `devolucao_itens` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `devolucoes` | 3 | 3 | OK — RLS ativo + 3 policy(s) |
| `erp_connections` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `erp_field_mappings` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `erp_sync_log` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `estoque` | 24 | 2 | OK — RLS ativo + 2 policy(s) |
| `estoque_movimentacoes` | 72 | 2 | OK — RLS ativo + 2 policy(s) |
| `exchange_rates` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `financial_audit_logs` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `fiscal_documents` | 20 | 4 | OK — RLS ativo + 4 policy(s) |
| `fiscal_events` | 10 | 1 | OK — RLS ativo + 1 policy(s) |
| `fornecedor_categorias` | 2 | 1 | OK — RLS ativo + 1 policy(s) |
| `fornecedores` | 10 | 3 | OK — RLS ativo + 3 policy(s) |
| `geo_access_logs` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `geo_settings` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `health_scan_runs` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `integration_outbox` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `ip_whitelist` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `licitacao_lances` | 17 | 1 | OK — RLS ativo + 1 policy(s) |
| `licitacao_propostas` | 13 | 2 | OK — RLS ativo + 2 policy(s) |
| `licitacoes` | 7 | 3 | OK — RLS ativo + 3 policy(s) |
| `login_attempts` | 107 | 2 | OK — RLS ativo + 2 policy(s) |
| `mfa_settings` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `negotiation_analyses` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `notification_preferences` | 3 | 1 | OK — RLS ativo + 1 policy(s) |
| `notifications` | 0 | 4 | OK — RLS ativo + 4 policy(s) |
| `order_contracts` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `organizations` | 1 | 1 | OK — RLS ativo + 1 policy(s) |
| `pagamentos` | 3 | 4 | OK — RLS ativo + 4 policy(s) |
| `password_reset_requests` | 0 | 4 | OK — RLS ativo + 4 policy(s) |
| `payment_history` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `pedido_itens` | 7 | 3 | OK — RLS ativo + 3 policy(s) |
| `pedidos` | 34 | 4 | OK — RLS ativo + 4 policy(s) |
| `penalty_escalation_config` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `permissions` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `produto_fornecedores` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `produtos` | 12 | 4 | OK — RLS ativo + 4 policy(s) |
| `profiles` | 12 | 6 | OK — RLS ativo + 6 policy(s) |
| `punchout_catalogs` | 4 | 1 | OK — RLS ativo + 1 policy(s) |
| `punchout_sessions` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `push_subscriptions` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `qualification_history` | 31 | 2 | OK — RLS ativo + 2 policy(s) |
| `qualification_requirements` | 15 | 2 | OK — RLS ativo + 2 policy(s) |
| `query_telemetry` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `rate_limit_logs` | 1 | 2 | OK — RLS ativo + 2 policy(s) |
| `receiving_checklists` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `repurchase_suggestions` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `role_permissions` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `savings_tracker` | 5 | 1 | OK — RLS ativo + 1 policy(s) |
| `scim_provisioning_log` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `secret_rotation_schedule` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `security_definer_baseline` | 117 | 1 | OK — RLS ativo + 1 policy(s) |
| `security_logs` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `solicitacoes` | 11 | 6 | OK — RLS ativo + 6 policy(s) |
| `sourcing_awards` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_event_criteria` | 18 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_event_lots` | 6 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_event_questions` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_events` | 6 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_invitations` | 30 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_pipeline` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_projects` | 5 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_response_answers` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_response_items` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `sourcing_responses` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `spend_forecasts` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `spot_api_sync_log` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `spot_customization_options` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `spot_estoque` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `spot_pedidos` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `spot_produtos` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `spot_sessions` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `spot_skus` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `sso_configurations` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `supplier_bonifications` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `supplier_documents` | 111 | 3 | OK — RLS ativo + 3 policy(s) |
| `supplier_qualification_scores` | 10 | 3 | OK — RLS ativo + 3 policy(s) |
| `system_alerts` | 5 | 1 | OK — RLS ativo + 1 policy(s) |
| `table_size_snapshots` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `telemetry_logs` | 3 | 2 | OK — RLS ativo + 2 policy(s) |
| `telemetry_logs_202605` | 560 | 2 | OK — RLS ativo + 2 policy(s) |
| `telemetry_logs_202606` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `telemetry_logs_202607` | 50 | 2 | OK — RLS ativo + 2 policy(s) |
| `telemetry_logs_202608` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `telemetry_logs_202609` | 0 | 2 | OK — RLS ativo + 2 policy(s) |
| `telemetry_logs_legacy_20260712` | 567 | 3 | OK — RLS ativo + 3 policy(s) |
| `temp_file_snapshots` | 145 | 1 | OK — RLS ativo + 1 policy(s) |
| `tenants` | 1 | 1 | OK — RLS ativo + 1 policy(s) |
| `unspsc_codes` | 23 | 1 | OK — RLS ativo + 1 policy(s) |
| `user_filter_preferences` | 1 | 4 | OK — RLS ativo + 4 policy(s) |
| `user_organizations` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `user_roles` | 5 | 2 | OK — RLS ativo + 2 policy(s) |
| `user_tenants` | 5 | 1 | OK — RLS ativo + 1 policy(s) |
| `user_tour_preferences` | 2 | 4 | OK — RLS ativo + 4 policy(s) |
| `v_cotacao_status` | 1 | 0 | BLOQUEADO — RLS sem policy; tabela-lixo criada por `SELECT … INTO` fora de função; remoção na PR #42 (aguardando dono) |
| `v_kpis` | 1 | 0 | BLOQUEADO — RLS sem policy; tabela-lixo criada por `SELECT … INTO` fora de função; remoção na PR #42 (aguardando dono) |
| `v_pipeline` | 0 | 0 | BLOQUEADO — RLS sem policy; tabela-lixo criada por `SELECT … INTO` fora de função; remoção na PR #42 (aguardando dono) |
| `v_top_categories` | 1 | 0 | BLOQUEADO — RLS sem policy; tabela-lixo criada por `SELECT … INTO` fora de função; remoção na PR #42 (aguardando dono) |
| `v_trends` | 1 | 0 | BLOQUEADO — RLS sem policy; tabela-lixo criada por `SELECT … INTO` fora de função; remoção na PR #42 (aguardando dono) |
| `v_urgent_items` | 1 | 0 | BLOQUEADO — RLS sem policy; tabela-lixo criada por `SELECT … INTO` fora de função; remoção na PR #42 (aguardando dono) |
| `wal_rate_snapshots` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `webauthn_challenges` | 0 | 3 | OK — RLS ativo + 3 policy(s) |
| `webauthn_credentials` | 0 | 4 | OK — RLS ativo + 4 policy(s) |
| `webhook_events` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_approvals` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_audit_log` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_edges` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_instances` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_logs` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_nodes` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_sod_rules` | 7 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_tasks` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `workflow_templates` | 8 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_carrinho_log` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_cores` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_credentials` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_pedido_status_history` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_pedidos` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_produto_fiscal` | 0 | 1 | OK — RLS ativo + 1 policy(s) |
| `xbz_produtos` | 0 | 1 | OK — RLS ativo + 1 policy(s) |

## 4. Edge functions (38 pastas)
Prova: `supabase_functions_ping` (MCP Promo Supply V2) em cada nome, 2026-11-12 ~13:50 UTC.

| Edge | Chamada pelo front | HTTP no ping | Status | Prova / pendência |
|---|---|---|---|---|
| `ai-demand-prediction` | `DemandPredictionPanel.tsx` | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`: falha no boot do worker, comum às 4 edges de IA. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `ai-negotiation` | `NegociacaoIA.tsx` | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`: falha no boot do worker, comum às 4 edges de IA. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `ai-supplier-risk` | `SupplierRiskAnalysis.tsx` | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`: falha no boot do worker, comum às 4 edges de IA. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `ai-supplier-suggestion` | — | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`: falha no boot do worker, comum às 4 edges de IA. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `alert-dispatcher` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `check-approval-escalations` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `check-cotacao-followup` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `check-expiry-alerts` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `check-sla-alerts` | `NotificationSettingsPanel.tsx` | 200 | OK | `supabase_functions_ping` → 200: responde |
| `dependency-health` | `DependencyHealth.tsx` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `erp-sync` | `ERPConnections.tsx` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `external-db-bridge` | `DeveloperDocs.tsx` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `fiscal-orchestrator` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `generate-contract-pdf` | `ContractDetailsModal.tsx` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `guided-buying-ai` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `health-dashboard` | — | 404 | BLOQUEADO | não publicada em `lmypcdfsrgfftzhxawao` (ping 404). Deploy de edge é manual (`deploy_edge_functions_promo_supply.sh`, exige `SUPABASE_ACCESS_TOKEN`); o MCP desta sessão não publica edge (`supabase_functions_list` → "requer SUPABASE_ACCESS_TOKEN") |
| `maintain-partitions` | — | 404 | BLOQUEADO | não publicada em `lmypcdfsrgfftzhxawao` (ping 404). Deploy de edge é manual (`deploy_edge_functions_promo_supply.sh`, exige `SUPABASE_ACCESS_TOKEN`); o MCP desta sessão não publica edge (`supabase_functions_list` → "requer SUPABASE_ACCESS_TOKEN") |
| `migrate-helper` | — | 500 | BLOQUEADO | ping 500 (não invocada: chamada negada pelo classificador de permissões por ser função de migração). Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `migrate-storage-paths` | `StorageMigration.tsx` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `process-invoice-idp` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `process-outbox` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `punchout-receive` | — | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `punchout-setup` | `PunchOutCatalogs.tsx` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `run-audit` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `scim-v2` | `SSOConfig.tsx` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `send-push-notification` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `spot-api` | — | 404 | BLOQUEADO | não publicada em `lmypcdfsrgfftzhxawao` (ping 404). Deploy de edge é manual (`deploy_edge_functions_promo_supply.sh`, exige `SUPABASE_ACCESS_TOKEN`); o MCP desta sessão não publica edge (`supabase_functions_list` → "requer SUPABASE_ACCESS_TOKEN") |
| `spot-proxy` | `useSpotIntegration.ts` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `system-simulation` | `AdminTelemetria.tsx` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `telemetry` | `logger.ts` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `tests/` | — | — | OK | pasta de suítes (`fuzzing_suite.ts`, `integration_suite.ts`), não é função publicada |
| `webauthn-authenticate` | `useWebAuthn.ts` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `webauthn-register` | `useWebAuthn.ts` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `weekly-report` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `weekly-summary-report` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `workflow-engine` | — | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `xbz-proxy` | — | 404 | BLOQUEADO | não publicada em `lmypcdfsrgfftzhxawao` (ping 404). Deploy de edge é manual (`deploy_edge_functions_promo_supply.sh`, exige `SUPABASE_ACCESS_TOKEN`); o MCP desta sessão não publica edge (`supabase_functions_list` → "requer SUPABASE_ACCESS_TOKEN") |
| `xbz-sync-pedidos` | — | 404 | BLOQUEADO | não publicada em `lmypcdfsrgfftzhxawao` (ping 404). Deploy de edge é manual (`deploy_edge_functions_promo_supply.sh`, exige `SUPABASE_ACCESS_TOKEN`); o MCP desta sessão não publica edge (`supabase_functions_list` → "requer SUPABASE_ACCESS_TOKEN") |
| `process-solicitacao-neural` | chamada em `src/` mas **sem pasta** em `supabase/functions/` | 404 | BLOQUEADO | fio cortado: o front chama uma edge que não existe no repo nem em produção (`edge-functions.json: chamadas_sem_pasta`) — exige decidir se cria a função ou remove a chamada |

## 5. Código pela metade

| Verificação | Resultado | Status |
|---|---|---|
| `TODO`/`FIXME`/`WIP`/`XXX`/`HACK` em `src/` e `supabase/functions/` (fora de testes) | 0 ocorrências | OK |
| Rotas não registradas | 0 — 55 caminhos em `AppRoutes.tsx`, todos com componente; `/__dev` só em DEV | OK |
| Mojibake (acentuação corrompida) em 12 telas | corrigido na PR #44 | ver §6 |
| `onClick={() => {}}` em CSV (Relatórios), EXPORT REPORT (Executivo), VER TUDO (Compras) | ligados na PR #43 | ver §6 |
| Elementos clicáveis sem ação (varredura AST em 269 `.tsx`) | **70**: 1 no-op, 3 só com toast "em desenvolvimento", 59 botões sem handler, 7 itens de menu sem handler (+8 limítrofes que funcionam por bolha de clique) | BLOQUEADO — cada um é uma funcionalidade a definir (ex.: "Chat com Fornecedores", "Cobrar Fornecedores (WhatsApp)", "Gerar Token SCIM", "Autorizar Redespacho", "Bloquear fornecedor"); exigem regra de negócio e, em parte, integração/custo. Lista completa em §5.1 |
| Dados fixos (mock) em produção | `src/components/compras/executive/executiveDashboardData.ts` alimenta `ExecutiveDashboard.tsx` (fallback `rm.x \|\| executiveMetrics.x`), `ExecutiveChartsRow`, `ExecutiveFiltersBar`, `ExecutiveDrillDownModal`; `procurement-kpis/kpiMockData` em `AdvancedProcurementKPIs.tsx:47` | BLOQUEADO — substituir exige definir metas (targets) e séries reais; não há tabela de metas no banco |
| Fio cortado: front chama edge `process-solicitacao-neural` | não existe | BLOQUEADO (§4) |

### 5.1 Elementos clicáveis sem ação (arquivo:linha · rótulo)
- `src/pages/acompanhamento/Acompanhamento.tsx`: 198 NOVA ATUALIZAÇÃO (no-op) · 298 FILTROS AVANÇADOS · 450 VISUALIZAR NF-E · 451 HISTÓRICO DE LOGS
- `src/pages/catalogo-spot/CatalogoSpot.tsx:216` Finalizar Pedido (toast "Em desenvolvimento") · `src/components/compras/dashboard/UrgencyDetailsSheet.tsx:253` Iniciar Cotação Imediata (toast) · `src/components/compras/BulkOperationsPreview.tsx:189` Desfazer (toast)
- `src/pages/admin/ERPConnections.tsx`: 80, 119, 159, 208, 224 · `PunchOutCatalogs.tsx`: 52, 91 · `SSOConfig.tsx:214` · `WorkflowAdmin.tsx`: 54, 136, 167, 204
- `src/pages/portal-fornecedor/PortalFornecedor.tsx:378` · `src/pages/negociacao-ia/NegociacaoIA.tsx:590`
- `src/pages/relatorios/RelatoriosCharts.tsx`: 202, 247 · `src/pages/relatorios/Relatorios.tsx:228` · `src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx:127`
- `src/pages/pedidos/PedidoDetailsDialog.tsx`: 193, 196, 430 · `src/pages/historico/HistoricoSourcingTab.tsx`: 294, 329
- `src/pages/sourcing/Sourcing.tsx`: 112, 173 · `src/pages/sourcing/RFxDetails.tsx`: 210, 255, 259, 263, 307, 310 · `src/pages/estoque/GestaoEstoque.tsx:166`
- `src/components/compras/`: `IAAdvisor.tsx` 40, 43 · `executive/ExecutiveAIInsights.tsx:173` · `BulkPlanningConsole.tsx` 105, 242, 257 · `SupplierIntelligenceConsole.tsx:173` · `ExecutiveDashboard.tsx:298` · `ProductionRoutingEngine.tsx:174` · `SourcingHistoryConsole.tsx` 615, 702, 763, 764, 879 · `EnhancedPedidoTimeline.tsx:294` · `CostCenterPerformanceAnalysis.tsx:183` · `AISupplierSuggestion.tsx:59` · `DeliveryCalendar.tsx` 313, 314 · `SolicitacaoCard.tsx` 303, 318, 341 · `DashboardInsights.tsx:186` · `DigitalSignature.tsx:273` · `PendingApprovalsList.tsx:433`
- `src/features/layout/components/chat/ChatArea.tsx`: 132, 135, 145, 146, 147, 149, 221, 240 · `src/features/layout/components/UserMenu.tsx`: 75 Meu Perfil, 79 Configurações

## 6. Inventário de telas (55 rotas)
| Rota | Tela | Registro | Status | Prova / pendência |
|---|---|---|---|---|
| `/` | → /compras | `AppRoutes.tsx:84` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/__dev/xbz-network-panel` | XbzNetworkPanelHarness | `AppRoutes.tsx:141` | OK | só em `import.meta.env.DEV` (`AppRoutes.tsx:140`); não vai para produção |
| `/*` | NotFound | `AppRoutes.tsx:?` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/acompanhamento` | Acompanhamento | `AppRoutes.tsx:92` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: NOVA ATUALIZAÇÃO (:198), FILTROS AVANÇADOS (:298), VISUALIZAR NF-E (:450), HISTÓRICO DE LOGS (:451) — falta definição de negócio do que cada um faz |
| `/admin/dependency-health` | DependencyHealth | `AppRoutes.tsx:124` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/docs` | DeveloperDocs | `AppRoutes.tsx:131` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/erp` | ERPConnections | `AppRoutes.tsx:127` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Configurar Nova Conexão (:80), Documentação de API (:119), ícone config (:159), Ver Log Completo (:208), Configurar Campos (:224) — falta definição de negócio do que cada um faz |
| `/admin/fiscal` | FiscalDashboard | `AppRoutes.tsx:128` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/health` | HealthDashboard | `AppRoutes.tsx:133` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/health/alerts/:id` | AlertDetail | `AppRoutes.tsx:134` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/punchout` | PunchOutCatalogs | `AppRoutes.tsx:126` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Novo Catálogo (:52), ícone config (:91) — falta definição de negócio do que cada um faz |
| `/admin/sourcing-pipeline` | SourcingPipeline | `AppRoutes.tsx:129` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/sso` | SSOConfig | `AppRoutes.tsx:125` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Gerar Token SCIM (:214) — falta definição de negócio do que cada um faz |
| `/admin/storage-migration` | StorageMigration | `AppRoutes.tsx:132` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/telemetria` | AdminTelemetria | `AppRoutes.tsx:123` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/admin/workflows` | WorkflowDesigner | `AppRoutes.tsx:130` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Novo Workflow (:54), Configurar (:136), Adicionar Regra (:167), Editar (:204) — falta definição de negócio do que cada um faz |
| `/aprovacoes` | Aprovacoes | `AppRoutes.tsx:96` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/auditoria` | Auditoria | `AppRoutes.tsx:103` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/auth` | PageLoader | `AppRoutes.tsx:76` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/buyer-performance` | BuyerPerformanceDashboard | `AppRoutes.tsx:99` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/catalogo-produtos` | CatalogoProdutos | `AppRoutes.tsx:115` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/catalogo-spot` | CatalogoSpot | `AppRoutes.tsx:105` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Finalizar Pedido só mostra toast "Em desenvolvimento" (CatalogoSpot.tsx:216) — falta definição de negócio do que cada um faz |
| `/catalogo-xbz` | CatalogoXbz | `AppRoutes.tsx:106` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/compliance` | ComplianceDashboard | `AppRoutes.tsx:102` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/compras` | ComprasDashboard | `AppRoutes.tsx:85` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: IAAdvisor.tsx:40/43, DashboardInsights.tsx:186, BulkPlanningConsole.tsx:105/242/257, UrgencyDetailsSheet.tsx:253 (toast "em desenvolvimento"); AdvancedProcurementKPIs usa kpiMockData — falta definição de negócio do que cada um faz |
| `/configuracoes-centro-custo` | ConfiguracoesCentroCusto | `AppRoutes.tsx:137` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/contratos` | Contratos | `AppRoutes.tsx:101` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/cotacao` | Cotacao | `AppRoutes.tsx:86` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/cotacao/:id` | Cotacao | `AppRoutes.tsx:87` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/dashboard-executivo` | DashboardExecutivo | `AppRoutes.tsx:98` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: VER MATRIZ KRALJIC (ExecutiveDashboard.tsx:298); métricas/tendências/categorias/compradores vêm de valores FIXOS (executive/executiveDashboardData.ts) quando o dado real é 0 — falta definição de negócio do que cada um faz |
| `/devolucoes` | Devolucoes | `AppRoutes.tsx:114` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/documentos-fiscais` | DocumentosFiscais | `AppRoutes.tsx:112` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/estoque` | GestaoEstoque | `AppRoutes.tsx:116` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Filtros Avançados (GestaoEstoque.tsx:166) — falta definição de negócio do que cada um faz |
| `/fornecedores` | Fornecedores | `AppRoutes.tsx:91` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/gerar-ordem` | GerarOrdem | `AppRoutes.tsx:93` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/historico-compras` | HistoricoCompras | `AppRoutes.tsx:100` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Ver Análise Detalhada, Gerar Executive Sourcing Report (HistoricoSourcingTab.tsx:294/329); SourcingHistoryConsole.tsx:615/702/763/764/879 — falta definição de negócio do que cada um faz |
| `/kanban` | KanbanWorkflow | `AppRoutes.tsx:111` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/licitacoes` | Licitacoes | `AppRoutes.tsx:121` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/negociacao-ia` | NegociacaoIA | `AppRoutes.tsx:110` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Saber mais (:590) — falta definição de negócio do que cada um faz |
| `/orcamentos` | Orcamentos | `AppRoutes.tsx:109` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/pagamentos` | Pagamentos | `AppRoutes.tsx:90` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/pedidos` | Pedidos | `AppRoutes.tsx:89` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: E-MAIL CRIPTOGRAFADO, HUB DE COMUNICAÇÃO, AUTORIZAR REDESPACHO (PedidoDetailsDialog.tsx:193/196/430) — falta definição de negócio do que cada um faz |
| `/portal-fornecedor` | PortalFornecedor | `AppRoutes.tsx:136` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Ver via Magic Link (:378, sempre disabled) — falta definição de negócio do que cada um faz |
| `/qualificacao-fornecedores` | QualificacaoFornecedores | `AppRoutes.tsx:108` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/recebimento` | RecebimentoOffline | `AppRoutes.tsx:122` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/recompra-inteligente` | RecompraInteligente | `AppRoutes.tsx:113` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/relatorios` | Relatorios | `AppRoutes.tsx:94` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: ABRIR CHAMADO (Relatorios.tsx:228), FULL REPORT (RelatoriosCharts.tsx:202), seta da linha (RelatoriosCharts.tsx:247) — falta definição de negócio do que cada um faz |
| `/relatorios/negociacoes` | RelatorioNegociacoes | `AppRoutes.tsx:95` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Exportar (RelatorioNegociacoes.tsx:127) — falta definição de negócio do que cada um faz |
| `/seguranca` | Seguranca | `AppRoutes.tsx:104` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/solicitacoes` | Solicitacoes | `AppRoutes.tsx:88` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/sourcing` | Sourcing | `AppRoutes.tsx:117` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: Filtros (:112), Novo Evento (:173) — falta definição de negócio do que cada um faz |
| `/sourcing/:id` | RFxDetails | `AppRoutes.tsx:119` | BLOQUEADO (parcial) | tela carrega (build OK, SPA 200); botões sem ação: seta (:210), Gerenciar Convites (:255), Chat com Fornecedores (:259), Cancelar Evento (:263), Gerar Tabela Comparativa (:307), Cobrar Fornecedores (WhatsApp) (:310) — falta definição de negócio do que cada um faz |
| `/sourcing/:id/auction` | AuctionRoom | `AppRoutes.tsx:120` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/sourcing/novo` | RFxCreate | `AppRoutes.tsx:118` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |
| `/supplier-performance` | SupplierPerformance | `AppRoutes.tsx:97` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK, SPA 200 em produção |

## 7. Integrações externas
| Integração | Onde | Status |
|---|---|---|
| Vercel (front) | projeto `promo-supply-v2` | OK — produção READY em `4cc1a7a`; `GET https://promo-supply-v2.vercel.app/` → 200; `get_runtime_errors(24h)` → "No runtime errors found" |
| Supabase Auth/DB | `lmypcdfsrgfftzhxawao` | OK — 12 usuários, 5 papéis admin; simulando um admin (`request.jwt.claims` + `role authenticated`, transação revertida): solicitações 11, pedidos 34, cotações 61, fornecedores 10, pagamentos 3; como `anon`: 0 em todas essas |
| AI Gateway (Lovable) | edges `ai-*` | BLOQUEADO — as 4 edges de IA devolvem 500 (§4) |
| XBZ | `xbz-proxy`, `xbz-sync-pedidos` | BLOQUEADO — não publicadas (404) |
| Spot Gifts | `spot-proxy` (no ar, 405 no ping) / `spot-api` | `spot-proxy` OK; `spot-api` BLOQUEADO (404) |
| ERP | `erp-sync` | OK — publicada (401 sem JWT) |
| SCIM / SSO | `scim-v2` | OK — publicada (401 sem JWT) |
| WebAuthn (passkey) | `webauthn-register`, `webauthn-authenticate` | OK — publicadas (405 no ping GET) |
| Punchout | `punchout-setup`, `punchout-receive` | OK — publicadas (405 no ping GET) |
| Fiscal (SEFAZ) | `fiscal-orchestrator` | OK — publicada (401 sem JWT) |
| Ponte externa | `external-db-bridge` | OK — publicada (405 no ping GET) |

## 8. Correções desta auditoria

| PR | O quê | Evidência | Estado |
|---|---|---|---|
| [#40](https://github.com/adm01-debug/Promo_Supply_V2/pull/40) | revoga `execute_read_query` de `anon`/`authenticated` | §3.1; migration em transação revertida: `anon_depois=false`, `service_depois=true` | **aberta, aguardando dono** (DDL em produção) |
| [#41](https://github.com/adm01-debug/Promo_Supply_V2/pull/41) | views com `security_invoker` + revoga SELECT de `anon` | rollback: `definer_restantes=0`, `anon_scs=false`, `auth_scs=true` | **aberta, aguardando dono** (DDL) |
| [#42](https://github.com/adm01-debug/Promo_Supply_V2/pull/42) | remove 6 tabelas-lixo `v_*` | sem uso no código, 0 dependências | **aberta, aguardando dono** (DDL + deleção) |
| [#43](https://github.com/adm01-debug/Promo_Supply_V2/pull/43) | liga CSV, EXPORT REPORT e VER TUDO | typecheck OK, eslint 0, vitest 368/368 nas áreas tocadas | aberta, aguardando CI (fila do Actions) |
| [#44](https://github.com/adm01-debug/Promo_Supply_V2/pull/44) | corrige acentuação corrompida em 12 telas | vitest 2250/2262 (= linha de base), typecheck OK | aberta, aguardando CI (fila do Actions) |

## 9. Aguardando decisão do dono
1. **Aplicar PR #40 já** — hoje qualquer pessoa com a chave pública do site consegue escrever no banco como `postgres`. Falta definir o caminho de apply (não há ledger).
2. PR #41 (vazamento de fornecedores/penalidades sem login) e PR #42.
3. Permitir que o GitHub Actions abra PR (Settings → Actions) para o inventário semanal.
4. Publicar as 5 edges ausentes e diagnosticar o 500 das 4 de IA (precisa de `SUPABASE_ACCESS_TOKEN` ou acesso aos logs do projeto).
5. Definir o comportamento dos 70 botões sem ação e as metas reais do dashboard executivo.
6. O repositório está **público** (`"visibility":"public"` na API do GitHub), embora o `AGENTS.md` diga privado.
