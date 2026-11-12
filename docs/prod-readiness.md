# Prontidão para produção — Promo Supply V2

> Auditoria de 2026-11-12 sobre a `main` em `4cc1a7a` (deploy Vercel `dpl_3PGp8bQVi6VSdWBB8yTK48fb9RKB`, READY).
> Banco auditado: Supabase `lmypcdfsrgfftzhxawao` (confirmado por `supabase_functions_list` → `project_ref`).
> Toda prova abaixo foi obtida nesta sessão (saída de comando, query ou request). Status: **OK** (com prova) ou **BLOQUEADO** (erro exato + o que falta).

## 0. Resumo

| Área | Situação |
|---|---|
| Build / typecheck / lint / testes (local, `main`) | OK — ver §1 |
| GitHub Actions na `main` | orçamento liberado pelo dono; runs #367/#36/#18 re-executados → SUCCESS — ver §2 |
| Banco: RLS | OK — após #42: **156/156 tabelas com RLS, 0 sem policy** |
| Banco: advisors nível ERROR | OK — após #41: 0 `security_definer_view`, 0 `rls_disabled_in_public`, 0 `policy_exists_rls_disabled`, 0 `user_metadata` |
| **Segurança crítica** | OK — após #40 (aplicada com aprovação do dono): `anon` → `permission denied for function execute_read_query` |
| Produção front | OK — SPA 200, 0 erro de runtime em 24h |
| Edges | 27 no ar; 5 não publicadas + 1 inexistente; 5 com 500 — ver §4 |
| Código pela metade | 0 TODO/FIXME/WIP; 8 botões ligados (#43, #46); restam 65 elementos clicáveis sem ação + mocks no dashboard executivo e card fictício — BLOQUEADO por definição de negócio, ver §5 |

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
| Testes edge (Deno) | `deno test --no-check --node-modules-dir=none --allow-net --allow-env --allow-read --import-map=<local> supabase/functions/` | OK — `ok \| 36 passed \| 0 failed \| 13 ignored`, exit 0. O import map (só local, fora do repo) troca `esm.sh`/`deno.land` (bloqueados pelo proxy desta sessão) pelos mesmos pacotes em `npm:`/`jsr:`; os 13 ignorados são os de integração, que se pulam sem Supabase local (igual ao CI). `--no-check` porque o `@std/dotenv` do jsr não tem `allowEmptyValues` da std 0.224 — diferença da substituição, não do repo |
| E2E (Playwright) | `npx playwright test --project=chromium --trace off` (dev server em `127.0.0.1:8080`; build 1234 do Chromium apontado para o 1243 instalado) | OK — `30 passed (22.5s)`, exit 0 |

## 2. GitHub Actions (8 workflows do repo + 2 dinâmicos do Copilot)

Causa das falhas da `main` em `4cc1a7a` (11:02 UTC): anotação do check-run → **"The job was not started because an Actions budget is preventing further use."** Os jobs não chegaram a executar (`steps: []`, `runner_id: 0`, log 404). Consumo da conta em novembro (`GET /users/adm01-debug/settings/billing/usage/summary`): **444.980 min Linux brutos, 34.931 cobráveis = US$ 209,59** — o orçamento de Actions foi atingido. Os agendados `types-sync` e `contexto` (cada um a cada 10 min) são os maiores consumidores recorrentes deste repo. Runs posteriores executaram (types-sync 13:14 ✅, contexto 12:54 ✅), então os 3 runs foram re-executados às 13:40 UTC; reproduzi localmente cada passo deles (§1) e todos passam.

| Workflow | Último run na `main` | Status |
|---|---|---|
| `main.yml` (Freight Quest CI/CD) | #367 re-executado → `COMPLETED SUCCESS` (14:28) após o dono liberar o orçamento | OK |
| `guards.yml` | #36 re-executado → `COMPLETED SUCCESS` (14:15) | OK |
| `automation-local.yml` | #18 re-executado → `COMPLETED SUCCESS` (14:07) | OK |
| `types-sync.yml` (a cada 10 min) | #483 success (13:14) | OK |
| **Execução após o último merge (`5cdeeac`, 14:40)** | `main.yml`, `guards.yml`, `automation-local.yml` e os checks das PRs #45/#47/#48/#50 ficaram `queued` de 14:40 até pelo menos 15:23; consumo subiu de 34.931 para 35.889 min cobráveis (US$ 215,33) | BLOQUEADO — o novo teto de orçamento foi atingido de novo (custo, decisão do dono). Os mesmos passos rodados localmente na `main`+#44+#46: typecheck OK, vitest 2250/2262, build OK |
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
| `security_definer_view` | antes: `supplier_compliance_summary`, `v_system_health_overview` (anon lia 10 linhas). **Depois da #41 aplicada**: lint → `[]`; anon → `permission denied for view supplier_compliance_summary`; admin logado → compliance 10, saúde 2 | OK |
| (WARN) `materialized_view_in_api` | `mv_dashboard_kpis`: anon_sel `false` após #41 | OK |
| **Função `execute_read_query`** | antes: executável por `anon` e permitia escrita como `postgres` (1 linha inserida em teste revertido). **Depois da #40 aplicada**: `anon_exec=false`, `auth_exec=false`, `service_exec=true`; chamada como anon → `permission denied for function execute_read_query` | OK |
| SECURITY DEFINER com SQL dinâmico executável por `anon` | `[]` | OK |

### 3.2 Migrations × banco
BLOQUEADO — não existe ledger: `supabase_db_migrations` → "Tabela supabase_migrations.schema_migrations não encontrada neste projeto". 280 arquivos em `supabase/migrations/` sem registro do que rodou. Amostra: a migration mais recente (`20261107150000_execute_read_query.sql`) está aplicada (função existe, corpo com o filtro `EXPLAIN`), **mas** o `REVOKE … FROM PUBLIC` dela não tirou `anon`/`authenticated` (ver 3.1). Comparar os 280 exige decidir com o dono o caminho de apply/baseline.

### 3.3 Tabelas (162 na linha de base; 156 após remover as 6 tabelas-lixo na #42) — RLS e policies
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
| `v_cotacao_status` | 1 | 0 | REMOVIDA (PR #42 aplicada): tabela-lixo criada por `SELECT … INTO` fora de função; 0 dependências, sem uso no código |
| `v_kpis` | 1 | 0 | REMOVIDA (PR #42 aplicada): tabela-lixo criada por `SELECT … INTO` fora de função; 0 dependências, sem uso no código |
| `v_pipeline` | 0 | 0 | REMOVIDA (PR #42 aplicada): tabela-lixo criada por `SELECT … INTO` fora de função; 0 dependências, sem uso no código |
| `v_top_categories` | 1 | 0 | REMOVIDA (PR #42 aplicada): tabela-lixo criada por `SELECT … INTO` fora de função; 0 dependências, sem uso no código |
| `v_trends` | 1 | 0 | REMOVIDA (PR #42 aplicada): tabela-lixo criada por `SELECT … INTO` fora de função; 0 dependências, sem uso no código |
| `v_urgent_items` | 1 | 0 | REMOVIDA (PR #42 aplicada): tabela-lixo criada por `SELECT … INTO` fora de função; 0 dependências, sem uso no código |
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
| `ai-demand-prediction` | `DemandPredictionPanel.tsx` | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`, e nada chega a `telemetry_logs`: o worker cai antes do código rodar. O código da `main` carrega: `deno check supabase/functions/_shared/ai_gateway.ts` OK e `import()` do módulo em runtime → `carregou: AIGatewayCircuitOpenError,callAIGateway,…`. Logo a versão **publicada** difere da `main` ou falta variável de ambiente; republicar exige `SUPABASE_ACCESS_TOKEN`. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `ai-negotiation` | `NegociacaoIA.tsx` | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`, e nada chega a `telemetry_logs`: o worker cai antes do código rodar. O código da `main` carrega: `deno check supabase/functions/_shared/ai_gateway.ts` OK e `import()` do módulo em runtime → `carregou: AIGatewayCircuitOpenError,callAIGateway,…`. Logo a versão **publicada** difere da `main` ou falta variável de ambiente; republicar exige `SUPABASE_ACCESS_TOKEN`. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `ai-supplier-risk` | `SupplierRiskAnalysis.tsx` | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`, e nada chega a `telemetry_logs`: o worker cai antes do código rodar. O código da `main` carrega: `deno check supabase/functions/_shared/ai_gateway.ts` OK e `import()` do módulo em runtime → `carregou: AIGatewayCircuitOpenError,callAIGateway,…`. Logo a versão **publicada** difere da `main` ou falta variável de ambiente; republicar exige `SUPABASE_ACCESS_TOKEN`. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `ai-supplier-suggestion` | — | 500 | BLOQUEADO | ping 500 — `GET` devolve texto puro `Internal Server Error`, não o JSON de `_shared/validation.ts:42`, e nada chega a `telemetry_logs`: o worker cai antes do código rodar. O código da `main` carrega: `deno check supabase/functions/_shared/ai_gateway.ts` OK e `import()` do módulo em runtime → `carregou: AIGatewayCircuitOpenError,callAIGateway,…`. Logo a versão **publicada** difere da `main` ou falta variável de ambiente; republicar exige `SUPABASE_ACCESS_TOKEN`. Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
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
| `migrate-helper` | — | 500 | BLOQUEADO | ping 500. Log real em `telemetry_logs` (13:48:27 UTC): **`[migrate-helper] server_misconfigured: MIGRATE_HELPER_ACCESS_KEY ausente`** — falta o segredo `MIGRATE_HELPER_ACCESS_KEY` nas secrets das edges (decisão do dono; segredo nunca passa por PR). Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
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
| Elementos clicáveis sem ação (varredura AST em 269 `.tsx`) | 3 ligados na #43, 5 na #46, 2 na #47; os restantes foram triados um a um (§5.1) e exigem definição de negócio: 1 no-op, 3 só com toast "em desenvolvimento", 59 botões sem handler, 7 itens de menu sem handler (+8 limítrofes que funcionam por bolha de clique) | BLOQUEADO — cada um é uma funcionalidade a definir (ex.: "Chat com Fornecedores", "Cobrar Fornecedores (WhatsApp)", "Gerar Token SCIM", "Autorizar Redespacho", "Bloquear fornecedor"); exigem regra de negócio e, em parte, integração/custo. Lista completa em §5.1 |
| Dados fixos (mock) em produção | `src/components/compras/executive/executiveDashboardData.ts` alimenta `ExecutiveDashboard.tsx` (fallback `rm.x \|\| executiveMetrics.x`), `ExecutiveChartsRow`, `ExecutiveFiltersBar`, `ExecutiveDrillDownModal`; `procurement-kpis/kpiMockData` em `AdvancedProcurementKPIs.tsx:47` | BLOQUEADO — substituir exige definir metas (targets) e séries reais; não há tabela de metas no banco |
| Card fictício `AISupplierSuggestion` | `src/components/compras/AISupplierSuggestion.tsx:36-39` exibe fornecedores escritos no código ("AluTech Indústria 98% Match", "12 qualified suppliers") nas telas Cotação e Fornecedores | BLOQUEADO — decidir: ligar à edge `ai-supplier-suggestion` (hoje 500) ou retirar o card |
| Fio cortado: front chama edge `process-solicitacao-neural` | não existe | BLOQUEADO (§4) |

### 5.1 Elementos clicáveis sem ação — triagem
Workflow de 35 agentes (1 por arquivo + 1 verificador cético por classificação "implementável"; 0 erros): **2 implementáveis** confirmados (Iniciar Cotação Imediata, VER MATRIZ KRALJIC → PR #47) e o cético achou 1 bug real (link "Citar Agora" com id errado → PR #48). Os demais exigem definição de negócio — cada um com a evidência:

| Arquivo:linha | Rótulo | Por que exige definição de negócio |
|---|---|---|
| `src/pages/acompanhamento/Acompanhamento.tsx:198` | NOVA ATUALIZAÇÃO (onClick no-op) | onClick={() => {}} em Acompanhamento.tsx:198. Não há Dialog/formulário de atualização no componente; o único Dialog (408-457) é o de detalhes. handleStatusChange (144-146) só dispara toast e não grava nada. Não está definido se 'atualização' é mudar status … |
| `src/pages/acompanhamento/Acompanhamento.tsx:298` | FILTROS AVANÇADOS | EliteButton sem onClick em Acompanhamento.tsx:298. Os únicos filtros que existem são searchTerm e filtroSLA (50-53, 129-142); não há painel, Sheet ou critérios avançados especificados. Implementar exigiria inventar filtros novos. |
| `src/pages/acompanhamento/Acompanhamento.tsx:450` | VISUALIZAR NF-E | Botão sem onClick em Acompanhamento.tsx:450. A query de pedidos (83) não carrega campo de NF-e (xml, url, chave ou número) e AcompanhamentoPedido (111-118) não tem URL de nota. Também não há rota de NF-e em AppRoutes.tsx (grep por nf/nota sem resultado). Ex… |
| `src/pages/acompanhamento/Acompanhamento.tsx:451` | HISTÓRICO DE LOGS | Botão sem onClick em Acompanhamento.tsx:451. Nenhum log ou histórico do pedido é carregado no componente. A rota /auditoria (AppRoutes.tsx:103) é genérica, não casa exatamente com o rótulo e não recebe filtro por pedido. /historico-compras (AppRoutes.tsx:10… |
| `src/pages/catalogo-spot/CatalogoSpot.tsx:216` | Finalizar Pedido (só toast 'Em desenvolvimento') | Hoje o botão só mostra um toast (CatalogoSpot.tsx:216). Finalizar o pedido cria uma compra real no fornecedor SPOT/Stricker, com compromisso financeiro, e o código existente não faz isso. O hook getCheckoutInfo (useSpotIntegration.ts:166-170) chama a ação '… |
| `src/components/compras/BulkOperationsPreview.tsx:189` | Desfazer (só toast) | O botão Desfazer aparece no toast de sucesso depois que onExecute (BulkOperationsPreview.tsx:173) já gravou a ação em massa (mudança de status ou exclusão) por meio de um callback do componente pai. O contrato BulkOperationsPreviewProps (bulk-operations/bul… |
| `src/pages/admin/ERPConnections.tsx:80` | Configurar Nova Conexão | Não existe Dialog/Sheet nem formulário de criação de conexão no componente (ERPConnections.tsx:22-231 só tem as queries erp_connections/erp_sync_log e a syncMutation); não há rota de criação de conexão ERP em AppRoutes.tsx (só /admin/erp em AppRoutes.tsx:12… |
| `src/pages/admin/ERPConnections.tsx:119` | Documentação de API | A rota mais próxima é /admin/docs (AppRoutes.tsx:131, DeveloperDocs; sidebar 'Documentação' em AppSidebar.tsx:144), mas o nome não casa com o rótulo e o conteúdo é documentação de arquitetura/ADRs, com contrato apenas do external-db-bridge (DeveloperDocs.ts… |
| `src/pages/admin/ERPConnections.tsx:159` | ícone Settings2 | Botão de engrenagem por conexão sem rótulo nem Dialog de edição no componente; não há rota de detalhe/edição de conexão ERP em AppRoutes.tsx. A intenção (editar, ativar/desativar is_active, excluir, testar conexão) é ambígua e envolveria UPDATE em erp_conne… |
| `src/pages/admin/ERPConnections.tsx:208` | Ver Log Completo | O componente carrega só os 10 últimos registros de erp_sync_log (ERPConnections.tsx:40-44). Não existe rota de log de sincronização ERP em AppRoutes.tsx; /auditoria (AppRoutes.tsx:103) é a trilha de auditoria geral, não erp_sync_log. Exigiria tela/listagem … |
| `src/pages/admin/ERPConnections.tsx:224` | Configurar Campos | Card 'Mapeamento Dinâmico' (ERPConnections.tsx:220-224) promete mapeamento de campos/transformações, mas não há Dialog, rota (nenhuma rota de mapping em AppRoutes.tsx) nem dado de mapeamento carregado no componente. Exige definir modelo de mapeamento e pers… |
| `src/pages/admin/PunchOutCatalogs.tsx:52` | Novo Catálogo | Não existe Dialog/Sheet nem formulário de criação no componente (PunchOutCatalogs.tsx:1-105 só tem useQuery de leitura e handleLaunch) nem rota de criação: a única rota é /admin/punchout (AppRoutes.tsx:126). punchout_catalogs só é referenciada neste arquivo… |
| `src/pages/admin/PunchOutCatalogs.tsx:91` | ícone Settings2 | Botão só com ícone, sem rótulo, sem tooltip: intenção ambígua (editar configuração, ativar/inativar is_active, ver credenciais?). Não há Dialog/Sheet de edição no componente nem rota de detalhe/edição (só /admin/punchout em AppRoutes.tsx:126). Qualquer ação… |
| `src/pages/admin/SSOConfig.tsx:214` | Gerar Token SCIM | Não existe gerador de token: nenhum hook nem edge cria ou rotaciona token SCIM (só aparecem a coluna sso_configurations.scim_token_hash/scim_token_last4 em types.ts:7032-7033 e a validação em supabase/functions/scim-v2/index.ts:101-133). Gerar o token no na… |
| `src/pages/admin/WorkflowAdmin.tsx:54` | Novo Workflow | Nenhum Dialog/Sheet de criação existe no componente (WorkflowAdmin.tsx:1-247 só tem useQuery de leitura em :16-38). Única rota de workflow em AppRoutes.tsx:130 é /admin/workflows (esta própria página); /kanban (AppRoutes.tsx:111) é outro fluxo. Nenhum outro… |
| `src/pages/admin/WorkflowAdmin.tsx:136` | Configurar | O texto em WorkflowAdmin.tsx:155-157 cita um 'Workflow Designer Canvas'/editor visual, mas ele não existe: é só placeholder estático, sem rota (AppRoutes.tsx:58 mapeia WorkflowDesigner para a própria WorkflowAdmin em :130) e sem componente de edição. Config… |
| `src/pages/admin/WorkflowAdmin.tsx:167` | Adicionar Regra | Não há Dialog/form no componente nem em outro arquivo de src/ que escreva em workflow_sod_rules (grep só acha WorkflowAdmin.tsx). Criar regra SoD exige definir quais roles podem ser incompatíveis, severidades válidas e INSERT no banco — regra de compliance … |
| `src/pages/admin/WorkflowAdmin.tsx:204` | Editar | Sem Dialog de edição existente no componente; edição de regra SoD (incompatible_roles, severity, is_active em :188-201) exige formulário novo e UPDATE em workflow_sod_rules, alterando política de segregação de funções em produção. |
| `src/pages/portal-fornecedor/PortalFornecedor.tsx:378` | Ver via Magic Link (sempre disabled) | O botão em PortalFornecedor.tsx:378 é fixo `disabled` e não tem onClick. O rótulo pede um fluxo de Magic Link, e esse fluxo não existe no código. Busca por 'magic link' em src/ só encontra este arquivo e src/hooks/useWebAuthn.ts, que trata de passkey e não … |
| `src/pages/negociacao-ia/NegociacaoIA.tsx:590` | Saber mais | Botão em card promocional estático 'Otimização Avançada' (NegociacaoIA.tsx:580-595) sem destino definido: não há rota de ajuda/explicação da IA em src/routes/AppRoutes.tsx (só /negociacao-ia em :110, a própria página, e /admin/docs em :131, restrito a admin… |
| `src/pages/relatorios/RelatoriosCharts.tsx:202` | FULL REPORT | O rótulo genérico 'FULL REPORT' não corresponde exatamente a nenhuma rota. O candidato mais próximo é /supplier-performance (AppRoutes.tsx:97), mas a página se chama 'Intelligence Hub' (SupplierPerformance.tsx:35), não 'relatório completo'. O botão também p… |
| `src/pages/relatorios/RelatoriosCharts.tsx:247` | ícone ChevronRight em linha de tabela | Não existe rota de detalhe de fornecedor: só /fornecedores (AppRoutes.tsx:91) e /supplier-performance (AppRoutes.tsx:97), as duas sem :id. Os únicos :id registrados são de cotação, sourcing e alertas (AppRoutes.tsx:87,119,134). Os dados da linha também não … |
| `src/pages/relatorios/Relatorios.tsx:240` | ABRIR CHAMADO | O botão (Relatorios.tsx:240) fica num card que diz 'Solicite ao suporte técnico ou use a API' (Relatorios.tsx:238). O componente não tem Dialog, Sheet nem formulário de chamado (Relatorios.tsx:1-259). Também não há rota de suporte, chamado, ticket, ajuda ou… |
| `src/pages/pedidos/PedidoDetailsDialog.tsx:193` | E-MAIL CRIPTOGRAFADO | O botão implica enviar mensagem ao fornecedor, e o componente não tem dado de e-mail: o join em src/features/pedidos/hooks/usePedidos.ts:82 traz só `fornecedor:fornecedores(id, razao_social, nome_fantasia)`, sem e-mail. Não há nem um mailto pronto para usar… |
| `src/pages/pedidos/PedidoDetailsDialog.tsx:196` | HUB DE COMUNICAÇÃO | Não há rota de comunicação, chat ou mensagens em src/routes/AppRoutes.tsx:84-137 (grep por comunica/hub/chat/mensag não achou nada). O componente também não tem Dialog ou Sheet de comunicação. A intenção é ambígua: pode ser chat com o fornecedor, WhatsApp o… |
| `src/pages/pedidos/PedidoDetailsDialog.tsx:430` | AUTORIZAR REDESPACHO | 'Autorizar' mudaria um status ou dado no banco. Não existe status de redespacho no statusConfig (linhas 21-29: pendente/aprovado/enviado/em_transito/entregue/parcial/cancelado). Também não há nenhum outro uso de 'redespacho' em src/, nem rota ou hook para i… |
| `src/pages/historico/HistoricoSourcingTab.tsx:294` | Ver Análise Detalhada | Botão sem onClick no widget 'Price Benchmark' (HistoricoSourcingTab.tsx:275-296). Não há rota de análise de preço/benchmark em src/routes/AppRoutes.tsx (grep por analise/benchmark/preco só acha /relatorios:94 e /relatorios/negociacoes:95, que não casam com … |
| `src/pages/historico/HistoricoSourcingTab.tsx:329` | Gerar Executive Sourcing Report | Botão com ícone Download e sem onClick (HistoricoSourcingTab.tsx:329-331). O conteúdo e o formato do 'Executive Report' não estão definidos em lugar nenhum. Os valores do painel são fictícios: Target Price = unitPrice*0.92 (:314), Economia = totalPrice*0.08… |
| `src/pages/sourcing/Sourcing.tsx:112` | Filtros | O componente não tem nenhum Dialog, Sheet ou Popover de filtro para abrir (imports em Sourcing.tsx:1-20 não trazem nenhum) nem estado de filtro. Só existe activeTab (Sourcing.tsx:25), que é setado mas nunca usado: o único TabsContent é 'all' (Sourcing.tsx:1… |
| `src/pages/sourcing/RFxDetails.tsx:210` | ícone ArrowRight | Botão só com ícone em cada resposta (RFxDetails.tsx:189-212), sem rótulo. Não há rota de detalhe de resposta: em AppRoutes.tsx:117-120 só existem /sourcing, /sourcing/novo, /sourcing/:id e /sourcing/:id/auction. Também não há Dialog/Sheet de resposta no com… |
| `src/pages/sourcing/RFxDetails.tsx:255` | Gerenciar Convites | Não há rota nem Dialog de convites: AppRoutes.tsx:117-120 só tem lista, criação, detalhe e leilão. O componente só lê event.invitations para contar (RFxDetails.tsx:234-246). Gerenciar convites (convidar ou remover fornecedor) grava em sourcing_invitations (… |
| `src/pages/sourcing/RFxDetails.tsx:259` | Chat com Fornecedores | Envia mensagem a fornecedores. Não existe rota de chat de sourcing em AppRoutes.tsx:117-120 nem componente de chat neste arquivo. Exige integração ou canal novo. |
| `src/pages/sourcing/RFxDetails.tsx:263` | Cancelar Evento | Muda o status de sourcing_events no banco. Não há status de cancelado em getStatusLabel (RFxDetails.tsx:65-74), nem mutation para isso no hook useSourcingEventDetails (useLicitacoes.ts:220+, que só faz leitura). É uma regra de negócio: quem pode cancelar, s… |
| `src/pages/sourcing/RFxDetails.tsx:307` | Gerar Tabela Comparativa Automática | Rótulo ambíguo, num bloco de 'Inteligência de Compras' por IA (RFxDetails.tsx:288-306). Não diz se é exportação, tela nova ou análise por IA, nem quais colunas ou critérios a tabela teria. O componente carrega respostas e critérios (RFxDetails.tsx:131, 189)… |
| `src/pages/sourcing/RFxDetails.tsx:310` | Cobrar Fornecedores Pendentes (WhatsApp) | Envia mensagem por WhatsApp a fornecedores, o que exige integração e um texto de cobrança. O componente não tem telefone de fornecedor: o hook só busca id e razao_social em fornecedores (useLicitacoes.ts:259). |
| `src/pages/estoque/GestaoEstoque.tsx:166` | Filtros Avançados | O Button em GestaoEstoque.tsx:166-169 não tem onClick, e o componente não tem nenhum Dialog, Sheet ou Popover de filtros. Os únicos Dialogs são 'Novo Item' (:265) e 'Movimentação' (:309). O único estado de filtro é `search`, usado no filtro textual em :46-5… |
| `src/components/compras/IAAdvisor.tsx:40` | Ver Insights | O componente só recebe stats {pending, value, total} (IAAdvisor.tsx:6-12) e não tem Dialog/Sheet nem lista de insights. Nenhuma rota de insights está registrada (grep 'insight' em src/routes/AppRoutes.tsx não encontrou nada). O único uso é Solicitacoes.tsx:… |
| `src/components/compras/IAAdvisor.tsx:43` | Ação Rápida | O rótulo genérico 'Ação Rápida' não indica qual ação executar. A recomendação em IAAdvisor.tsx:34 ('priorizar itens de alto valor') daria várias leituras possíveis: filtrar por status pendente, ordenar por valor, rolar até o BulkPlanningConsole (Solicitacoe… |
| `src/components/compras/executive/ExecutiveAIInsights.tsx:173` | {insight.action} | Um único botão renderiza 4 ações diferentes, conforme o insight: 'Iniciar RFP' (linha 40), 'Cobrar Fornecedores' (linha 53), 'Notificar Aprovadores' (linha 63) e 'Analisar Cauda' (linha 88). O tipo Insight (linhas 15-23) só guarda o texto do botão (action?:… |
| `src/components/compras/BulkPlanningConsole.tsx:105` | Disparar Cotações (n) | O componente inteiro roda sobre dados fictícios: mockPlanningData (BulkPlanningConsole.tsx:23-57) e freightAnalysis fixo (BulkPlanningConsole.tsx:62-66). Não há hook, edge nem tabela ligados aos lotes. Disparar cotações significa mandar pedidos aos forneced… |
| `src/components/compras/BulkPlanningConsole.tsx:242` | VALIDAR | O card promete 'Validando propostas vs. benchmark de mercado' por IA (BulkPlanningConsole.tsx:239-240). O componente não tem propostas, benchmark nem chamada de IA; os únicos dados são o mock das linhas 23-57. Também não existe Dialog ou Sheet que o botão p… |
| `src/components/compras/BulkPlanningConsole.tsx:257` | REVISAR FILA | Nenhuma rota em src/routes/AppRoutes.tsx contém 'fila' ou 'queue' (grep sem resultado). A fila de disparos não existe no componente, que só tem a lista mock das linhas 23-57, e não há Dialog nem seção de fila a que rolar. A intenção é ambígua: não está defi… |
| `src/components/compras/SupplierIntelligenceConsole.tsx:173` | GERAR PEDIDO PREDITIVO | O botão fica abaixo de uma 'recomendação preditiva' com texto fixo no código (categoria 'Alumínio', alta de '8%' em SupplierIntelligenceConsole.tsx:168-171). Nenhum dado real sustenta essa previsão: o componente só recebe `suppliers` (linha 13), e o próprio… |
| `src/components/compras/ProductionRoutingEngine.tsx:174` | LISTAR / CONECTAR (button nativo) | O botão alterna o rótulo conforme item.count (linha 180). A query das linhas 126-129 busca só o `id` de produto_fornecedores, com count, e não traz nome nem dado de fornecedor, então não há lista carregada para mostrar em 'LISTAR'. O componente não tem Dial… |
| `src/components/compras/SourcingHistoryConsole.tsx:615` | Exportar Dados | A tabela 'Matriz de Comparação Competitiva' que o botão exportaria é um array fixo no código (SourcingHistoryConsole.tsx:632-637: 'Eletrônicos R$ 450 / mercado R$ 490' etc.), não vem do usePurchaseHistory (linha 50). Seria tecnicamente possível chamar expor… |
| `src/components/compras/SourcingHistoryConsole.tsx:702` | Executar Análise de Demanda Global | Nada no código faz essa análise: não há hook nem edge function para ela no componente (só o usePurchaseHistory, na linha 50), e as previsões exibidas também são fixas no código (linhas 681-685). Fazer o botão funcionar exige criar um motor de previsão e dec… |
| `src/components/compras/SourcingHistoryConsole.tsx:763` | Deep Scan | O rótulo não diz o que deve acontecer, e o componente não tem nenhuma ação ou dado que corresponda a um 'Deep Scan'. Os cards da Matriz de Inteligência de Custo também são fixos no código (linhas 769-773). Seria preciso definir o comportamento do zero. |
| `src/components/compras/SourcingHistoryConsole.tsx:764` | Audit Log | Existe a rota /auditoria (AppRoutes.tsx:103), mas ela mostra a auditoria geral do sistema, não um registro da matriz de custo. Também não existe uma rota com o nome exato 'audit-log'. Não dá para garantir que levar à auditoria geral é o que se espera nem sa… |
| `src/components/compras/SourcingHistoryConsole.tsx:879` | Dossiê Completo | O botão fica no card de cada fornecedor (supplier.id, linha 787), mas não existe rota de detalhe de fornecedor: a busca por 'fornecedores/:' em AppRoutes.tsx não retornou nada, só a lista /fornecedores (AppRoutes.tsx:91). O componente também não tem nenhum … |
| `src/components/compras/EnhancedPedidoTimeline.tsx:294` | {doc.nome} (botão de documento) | O tipo TimelineStep declara documentos?: { nome: string; url: string }[] (src/components/compras/timeline/timelineConfig.ts:12), então a URL do arquivo já está no objeto renderizado (doc). O botão já mostra o ícone ExternalLink (EnhancedPedidoTimeline.tsx:2… |
| `src/components/compras/AISupplierSuggestion.tsx:59` | Open Sourcing Panel (card inteiro usa fornecedores escritos no código) | O botão em si poderia ir para /sourcing (rota registrada em src/routes/AppRoutes.tsx:117, já usada em src/components/compras/ActiveSourcingWidget.tsx:71/82 e no menu como 'Sourcing (RFx)' em src/features/layout/components/AppSidebar.tsx:102). Mas há outra r… |
| `src/components/compras/SolicitacaoCard.tsx:303` | ícone ArrowRight (enviar nota no popover) | O popover 'Neural Context Thread' é mock: mensagens e autores fixos no JSX (SolicitacaoCard.tsx:286-299), e o Input da linha 302 não tem estado nem onChange. Não há tabela, hook ou prop para gravar notas (as props estão em SolicitacaoCard.tsx:29-40). Enviar… |
| `src/components/compras/SolicitacaoCard.tsx:318` | {actions.secondary.label} | O mesmo botão mostra rótulos diferentes conforme o status: 'View' (SolicitacaoCard.tsx:50, 58, 62) e 'Select' (SolicitacaoCard.tsx:54, EM_COTACAO). 'Select' significa escolher fornecedor, o que muda o status no banco, e o card não recebe callback nem dado p… |
| `src/components/compras/SolicitacaoCard.tsx:341` | {actions.primary.label} | Este ramo só aparece quando a ação primária não tem href, ou seja, no status ENTREGUE, rótulo 'View Details' (SolicitacaoCard.tsx:76). AppRoutes.tsx não registra rota de detalhe de solicitação (só /solicitacoes:88, /pedidos:89, /historico-compras:100), e nã… |
| `src/components/compras/DashboardInsights.tsx:186` | {insight.action} | O botão é único, mas mostra 5 rótulos diferentes vindos do array montado em DashboardInsights.tsx:36-111, e a interface Insight (linhas 21-30) não tem campo de rota/href. Dois rótulos casam com rotas registradas: 'Revisar cotações em aberto' (linha 50) → /c… |
| `src/components/compras/DigitalSignature.tsx:273` | ícone Download | O tipo SignatureRequest (src/components/compras/digital-signature/signatureHelpers.ts:3-14) não tem campo de URL/arquivo do documento: só id, documentName, documentType, status, datas e signer. Os dados vêm de mockSignatureRequests (signatureHelpers.ts:16, … |
| `src/components/compras/PendingApprovalsList.tsx:433` | DropdownMenuItem Ver Histórico | O item fica no menu de cada aprovação (PendingApprovalsList.tsx:425-437), então o esperado é o histórico daquela solicitação. Só que o componente não tem nenhum Dialog ou Sheet de histórico: os únicos modais são RejectModal e DetailsModal (linhas 446-464, i… |
| `src/features/layout/components/chat/ChatArea.tsx:132` | ícone Phone | ChatContact (ChatArea.tsx:48-55) não tem telefone; a ligação exigiria buscar o contato do fornecedor e decidir o canal (tel:, VoIP, WhatsApp). Não há dado nem integração carregados no componente. |
| `src/features/layout/components/chat/ChatArea.tsx:135` | ícone Video | Não existe integração de videochamada no repositório e o ChatContact (ChatArea.tsx:48-55) não tem link de reunião. Seria preciso escolher um provedor e criar o fluxo. |
| `src/features/layout/components/chat/ChatArea.tsx:145` | Ver perfil completo | Não há rota de perfil por fornecedor: AppRoutes.tsx:91 registra só /fornecedores (lista), sem /fornecedores/:id, e Fornecedores.tsx não lê searchParams/useParams para abrir o fornecedor de fornecedorId (ChatArea.tsx:54). Além disso, o chat é um Dialog modal… |
| `src/features/layout/components/chat/ChatArea.tsx:146` | Histórico de cotações | A rota /cotacao (AppRoutes.tsx:86) só lê ?id= de solicitação (Cotacao.tsx:49-50) e não filtra por fornecedor. HistoricoCompras também não tem filtro por fornecedorId. Mostrar o histórico deste fornecedor exige um filtro novo, sem especificação. |
| `src/features/layout/components/chat/ChatArea.tsx:147` | Análise de performance | A rota /supplier-performance existe (AppRoutes.tsx:97), mas SupplierPerformance.tsx não lê searchParams/useParams (só tem activeTab em :22). Navegar para lá abriria o painel geral, não a análise do fornecedor do chat (fornecedorId em ChatArea.tsx:54). També… |
| `src/features/layout/components/chat/ChatArea.tsx:149` | Bloquear fornecedor | Muda o status do fornecedor no banco (ação destrutiva/regra de negócio). Não há handler, prop nem hook de bloqueio passado ao ChatArea (props em ChatArea.tsx:57-68). |
| `src/features/layout/components/chat/ChatArea.tsx:221` | ícone Paperclip | Message aceita attachmentUrl/attachmentName (ChatArea.tsx:44-45), mas o ChatArea só recebe onSendMessage sem anexo (ChatArea.tsx:67). Anexar exige upload para o Storage (bucket, limites, tipos aceitos) e enviar mensagem, ou seja, comportamento novo. |
| `src/features/layout/components/chat/ChatArea.tsx:240` | ícone Smile | Não há seletor de emoji no repositório (sem emoji-picker/emoji-mart em src/ nem no package.json). Seria preciso adicionar uma dependência ou criar um componente novo e decidir o conjunto de emojis. |
| `src/features/layout/components/UserMenu.tsx:75` | Meu Perfil | Não há rota de perfil registrada: AppRoutes.tsx:76-148 não tem /perfil, /profile, /meu-perfil nem /conta. O mesmo item 'Meu Perfil' também está sem ação no CommandPalette.tsx:166 (action: () => {}). O componente não tem Dialog/Sheet de perfil (UserMenu.tsx:… |
| `src/features/layout/components/UserMenu.tsx:79` | Configurações | Não existe rota /configuracoes em AppRoutes.tsx. SmartBackButton.tsx:75 tem o rótulo '/configuracoes': 'Configurações', mas a rota não está registrada. A única rota parecida é /configuracoes-centro-custo (AppRoutes.tsx:137), que é específica de centro de cu… |

## 6. Inventário de telas (55 rotas)
| Rota | Tela | Registro | Status | Prova / pendência |
|---|---|---|---|---|
| `/` | → /compras | `AppRoutes.tsx:84` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/__dev/xbz-network-panel` | XbzNetworkPanelHarness | `AppRoutes.tsx:141` | OK | só em `import.meta.env.DEV` (`AppRoutes.tsx:140`); não vai para produção |
| `/*` | NotFound | `AppRoutes.tsx:148` | OK | rota pública (fora do `ProtectedRoute`); após #50 qualquer caminho inexistente recebe o `index.html` e a SPA mostra NotFound |
| `/acompanhamento` | Acompanhamento | `AppRoutes.tsx:92` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: NOVA ATUALIZAÇÃO (:198), FILTROS AVANÇADOS (:298), VISUALIZAR NF-E (:450), HISTÓRICO DE LOGS (:451) — falta definição de negócio do que cada um faz |
| `/admin/dependency-health` | DependencyHealth | `AppRoutes.tsx:124` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/docs` | DeveloperDocs | `AppRoutes.tsx:131` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/erp` | ERPConnections | `AppRoutes.tsx:127` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Configurar Nova Conexão (:80), Documentação de API (:119), ícone config (:159), Ver Log Completo (:208), Configurar Campos (:224) — falta definição de negócio do que cada um faz |
| `/admin/fiscal` | FiscalDashboard | `AppRoutes.tsx:128` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/health` | HealthDashboard | `AppRoutes.tsx:133` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/health/alerts/:id` | AlertDetail | `AppRoutes.tsx:134` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/punchout` | PunchOutCatalogs | `AppRoutes.tsx:126` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Novo Catálogo (:52), ícone config (:91) — falta definição de negócio do que cada um faz |
| `/admin/sourcing-pipeline` | SourcingPipeline | `AppRoutes.tsx:129` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/sso` | SSOConfig | `AppRoutes.tsx:125` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Gerar Token SCIM (:214) — falta definição de negócio do que cada um faz |
| `/admin/storage-migration` | StorageMigration | `AppRoutes.tsx:132` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/telemetria` | AdminTelemetria | `AppRoutes.tsx:123` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/admin/workflows` | WorkflowDesigner | `AppRoutes.tsx:130` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Novo Workflow (:54), Configurar (:136), Adicionar Regra (:167), Editar (:204) — falta definição de negócio do que cada um faz |
| `/aprovacoes` | Aprovacoes | `AppRoutes.tsx:96` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/auditoria` | Auditoria | `AppRoutes.tsx:103` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/auth` | Auth | `AppRoutes.tsx:76` | OK | rota pública (login); build OK; link direto 200 após #50 |
| `/buyer-performance` | BuyerPerformanceDashboard | `AppRoutes.tsx:99` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/catalogo-produtos` | CatalogoProdutos | `AppRoutes.tsx:115` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/catalogo-spot` | CatalogoSpot | `AppRoutes.tsx:105` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Finalizar Pedido só mostra toast "Em desenvolvimento" (CatalogoSpot.tsx:216) — falta definição de negócio do que cada um faz |
| `/catalogo-xbz` | CatalogoXbz | `AppRoutes.tsx:106` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/compliance` | ComplianceDashboard | `AppRoutes.tsx:102` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/compras` | ComprasDashboard | `AppRoutes.tsx:85` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: IAAdvisor.tsx:40/43, DashboardInsights.tsx:186, BulkPlanningConsole.tsx:105/242/257 (Iniciar Cotação Imediata ligado na #47; Citar Agora corrigido na #48; Urgências voltam a carregar com a #55); AdvancedProcurementKPIs usa kpiMockData — falta definição de negócio do que cada um faz |
| `/configuracoes-centro-custo` | ConfiguracoesCentroCusto | `AppRoutes.tsx:137` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/contratos` | Contratos | `AppRoutes.tsx:101` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/cotacao` | Cotacao | `AppRoutes.tsx:86` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/cotacao/:id` | Cotacao | `AppRoutes.tsx:87` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/dashboard-executivo` | DashboardExecutivo | `AppRoutes.tsx:98` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: VER MATRIZ KRALJIC ligado na #47; métricas/tendências/categorias/compradores vêm de valores FIXOS (executive/executiveDashboardData.ts) quando o dado real é 0 — falta definição de negócio do que cada um faz |
| `/devolucoes` | Devolucoes | `AppRoutes.tsx:114` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/documentos-fiscais` | DocumentosFiscais | `AppRoutes.tsx:112` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/estoque` | GestaoEstoque | `AppRoutes.tsx:116` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Filtros Avançados (GestaoEstoque.tsx:166) — falta definição de negócio do que cada um faz |
| `/fornecedores` | Fornecedores | `AppRoutes.tsx:91` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/gerar-ordem` | GerarOrdem | `AppRoutes.tsx:93` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/historico-compras` | HistoricoCompras | `AppRoutes.tsx:100` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Ver Análise Detalhada, Gerar Executive Sourcing Report (HistoricoSourcingTab.tsx:294/329); SourcingHistoryConsole.tsx:615/702/763/764/879 — falta definição de negócio do que cada um faz |
| `/kanban` | KanbanWorkflow | `AppRoutes.tsx:111` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/licitacoes` | Licitacoes | `AppRoutes.tsx:121` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/negociacao-ia` | NegociacaoIA | `AppRoutes.tsx:110` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Saber mais (:590) — falta definição de negócio do que cada um faz |
| `/orcamentos` | Orcamentos | `AppRoutes.tsx:109` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/pagamentos` | Pagamentos | `AppRoutes.tsx:90` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/pedidos` | Pedidos | `AppRoutes.tsx:89` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: E-MAIL CRIPTOGRAFADO, HUB DE COMUNICAÇÃO, AUTORIZAR REDESPACHO (PedidoDetailsDialog.tsx:193/196/430) — falta definição de negócio do que cada um faz |
| `/portal-fornecedor` | PortalFornecedor | `AppRoutes.tsx:136` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Ver via Magic Link (:378, sempre disabled) — falta definição de negócio do que cada um faz |
| `/qualificacao-fornecedores` | QualificacaoFornecedores | `AppRoutes.tsx:108` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/recebimento` | RecebimentoOffline | `AppRoutes.tsx:122` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/recompra-inteligente` | RecompraInteligente | `AppRoutes.tsx:113` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/relatorios` | Relatorios | `AppRoutes.tsx:94` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: ABRIR CHAMADO (Relatorios.tsx:240), FULL REPORT (RelatoriosCharts.tsx:202), seta da linha (RelatoriosCharts.tsx:247) — falta definição de negócio do que cada um faz |
| `/relatorios/negociacoes` | RelatorioNegociacoes | `AppRoutes.tsx:95` | OK | Exportar ligado na #46 (CSV dos compradores; números em formato pt-BR após #58); link direto 200 após #50 |
| `/seguranca` | Seguranca | `AppRoutes.tsx:104` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/solicitacoes` | Solicitacoes | `AppRoutes.tsx:88` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/sourcing` | Sourcing | `AppRoutes.tsx:117` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: Filtros (:112) — Novo Evento ligado na #46 — falta definição de negócio do que cada um faz |
| `/sourcing/:id` | RFxDetails | `AppRoutes.tsx:119` | BLOQUEADO (parcial) | tela carrega (build OK; link direto 200 após #50); botões sem ação: seta (:210), Gerenciar Convites (:255), Chat com Fornecedores (:259), Cancelar Evento (:263), Gerar Tabela Comparativa (:307), Cobrar Fornecedores (WhatsApp) (:310) — falta definição de negócio do que cada um faz |
| `/sourcing/:id/auction` | AuctionRoom | `AppRoutes.tsx:120` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/sourcing/novo` | RFxCreate | `AppRoutes.tsx:118` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |
| `/supplier-performance` | SupplierPerformance | `AppRoutes.tsx:97` | OK | rota registrada sob `ProtectedRoute` (`AppRoutes.tsx:83`), build OK; link direto em produção 200 após #50 (`GET /pedidos` → 200 `index.html`) |

## 7. Integrações externas
| Integração | Onde | Status |
|---|---|---|
| Vercel (front) | projeto `promo-supply-v2` | OK na home — deploys de produção READY para #43 (`e897b42`), #44 (`257a4c4`) e #46 (`5cdeeac`, `dpl_Gpa7SE4Auyd2wWzKr4HSpjgUJBQZ`); `get_runtime_errors(2h)` → "No runtime errors found". **BLOQUEADO em links diretos**: `GET /compras` → 404 `NOT_FOUND` (já era assim na linha de base `4cc1a7a`): falta `vercel.json` com rewrite da SPA → PR #50; preview `promo-supply-v2-3kf2yhzhf`: `/compras` → 200 `index.html` e `/manifest.webmanifest` → 200 `application/manifest+json` |
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
| [#40](https://github.com/adm01-debug/Promo_Supply_V2/pull/40) | revoga `execute_read_query` de `anon`/`authenticated` | aplicada em produção com aprovação do dono; anon → `permission denied` | **mergeada** (`c9488d5`), CI verde |
| [#41](https://github.com/adm01-debug/Promo_Supply_V2/pull/41) | views com `security_invoker` + revoga SELECT de `anon` | aplicada; anon → `permission denied`; admin ainda lê 10/2 | **mergeada** (`5001fc3`), CI verde |
| [#42](https://github.com/adm01-debug/Promo_Supply_V2/pull/42) | remove 6 tabelas-lixo `v_*` | aplicada; 156/156 com RLS, 0 sem policy | **mergeada** (`aca8fbd`), CI verde |
| [#43](https://github.com/adm01-debug/Promo_Supply_V2/pull/43) | liga CSV, EXPORT REPORT e VER TUDO | CI verde; deploy Vercel `dpl_7XG4VrRHuztHknoQLcj6rJ284j4o` READY (`e897b42`) | **mergeada** |
| [#46](https://github.com/adm01-debug/Promo_Supply_V2/pull/46) | liga Novo Evento, Ver Pedido, Rastrear Entrega e 2× Exportar | typecheck OK, eslint 0 erros, vitest 395/395 nas áreas tocadas | **mergeada** (`5cdeeac`), CI verde incl. E2E |
| [#47](https://github.com/adm01-debug/Promo_Supply_V2/pull/47) | Iniciar Cotação Imediata abre a cotação; VER MATRIZ KRALJIC rola até a matriz | typecheck OK, eslint 0, vitest 368/368 | ver estado final no PR |
| [#48](https://github.com/adm01-debug/Promo_Supply_V2/pull/48) | "Citar Agora" usava o número de exibição como id → cotação vazia | produção: 11/11 solicitações com `numero` (ex.: `SOL-2026-1000`), busca do número como id → 0; vitest 368/368 | ver estado final no PR |
| [#50](https://github.com/adm01-debug/Promo_Supply_V2/pull/50) | `vercel.json` com rewrite da SPA (link direto/F5 em qualquer tela dava 404) | produção `/compras` → 404; preview da PR → 200 | aberta, aguardando CI (Actions sem orçamento) |
| [#44](https://github.com/adm01-debug/Promo_Supply_V2/pull/44) | corrige acentuação corrompida em 12 telas | CI verde; `main`+#44+#46 local: typecheck OK, 2250/2262 (= linha de base), build OK | **mergeada** (`257a4c4`) |

## 9. Aguardando decisão do dono
Decididos e executados nesta sessão: aplicar #40/#41/#42 em produção (feito e verificado) e liberar o orçamento do Actions (feito; CI voltou a rodar).

Ainda pendentes (BLOQUEADO):
0. **Orçamento do Actions esgotado de novo** (US$ 215,33): sem ele, o CI pós-merge da `main` e o das PRs #45, #47, #48 e #50 não rodam, e elas não podem ser mergeadas com CI verde.
1. **Edge functions** — publicar `health-dashboard`, `maintain-partitions`, `spot-api`, `xbz-proxy`, `xbz-sync-pedidos`; republicar as 4 `ai-*`; cadastrar o segredo `MIGRATE_HELPER_ACCESS_KEY`. Exige `SUPABASE_ACCESS_TOKEN` (PAT `sbp_…`): o dono recusou fornecê-lo nesta sessão; o MCP Promo Supply V2 e o gateway `supabase-supply-mcp` não publicam edge (`supabase_functions_list` → "Listagem requer SUPABASE_ACCESS_TOKEN"); os MCPs que publicam ("GESTÃO DE CLIENTES/PRODUTOS") estão presos a outros projetos.
2. **`process-solicitacao-neural`** — criar a edge ou remover a chamada do front (decisão de produto).
3. **Elementos clicáveis sem ação triados como "negócio" (§5.1), card fictício `AISupplierSuggestion` e métricas fixas do dashboard executivo** — exigem definição de negócio (o que cada ação faz; metas reais).
4. **Ledger de migrations** — o banco não tem `supabase_migrations.schema_migrations`; decidir se cria baseline (a partir de agora os arquivos `20261112*` documentam exatamente o que foi aplicado hoje).
5. **Inventário semanal** — habilitar "Allow GitHub Actions to create and approve pull requests" (Settings → Actions).
6. **Segurança** — o repositório está **público** (`"visibility":"public"`) embora o `AGENTS.md` diga privado; um token Vercel (`vcp_…`) foi colado no chat desta sessão e deve ser revogado.
7. **Custo de Actions** — `types-sync` e `contexto` rodam a cada 10 min e são o maior gasto recorrente deste repo.
