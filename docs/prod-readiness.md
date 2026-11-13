# Prontidão para produção — Promo Supply V2

> Auditoria de 2026-11-12. Linha de base: `main` em `4cc1a7a`. Estado final: `main` em `b6e0427` (deploy de produção READY após #50: `dpl_EYjKiASE1eiagykXutA5UBnbEAfg`).
> Banco auditado: Supabase `lmypcdfsrgfftzhxawao` (confirmado por `supabase_functions_list` → `project_ref`).
> **Atualização 2026-11-13:** `main` em `c4a54e7` (#76); deploy Vercel do commit `c4a54e7`: status `success` "Deployment has completed" 14:32:58 UTC. Seções 0, 2, 4, 7, 8 e 9 refletem esse estado.
> Toda prova abaixo foi obtida nesta sessão (saída de comando, query ou request). Status: **OK** (com prova) ou **BLOQUEADO** (erro exato + o que falta).

## 0. Resumo

| Área | Situação final |
|---|---|
| Qualidade na `main` final `c4a54e7` (2026-11-13) | OK — typecheck exit 0; `eslint .` exit 0 (0 erros, 9 warnings); `vitest run` exit 0: **2300 passed / 12 skipped (2312)** vs linha de base 2250/2262; build exit 0; `npm run guards` exit 0 (528 pass / 0 fail; inventário de testes OK; `docs/ci/README.md bate com os 8 workflows`); Deno `36 passed / 0 failed / 13 ignored` |
| GitHub Actions | pós-último-merge (`c4a54e7`): Freight Quest CI/CD, Guards, Automação local, CodeQL (Push on main) **success**; `notifica-falha-main` skipped; `types-sync` success (14:14); `contexto` push com 2 jobs `queued` (fila de runners); `inventario-estado-semanal` **failure** por setting do repositório — BLOQUEADO (§2) |
| Banco: RLS | OK — 156/156 tabelas com RLS, 0 sem policy (6 tabelas-lixo removidas, #42) |
| Banco: lints ERROR | OK — 0 `security_definer_view`, 0 `rls_disabled_in_public`, 0 `policy_exists_rls_disabled`, 0 `user_metadata` |
| **Segurança crítica** | OK — `execute_read_query` (#40) e `exec_sql` (#52) fechadas para visitante (`permission denied`); SECURITY DEFINER executáveis por anon **150 → 9** (#54); papéis voltaram a valer em 35 tabelas (#56) |
| Produção front | OK — link direto/F5 voltaram a funcionar (#50: `/pedidos` 200; antes 404); 0 erro de runtime Vercel |
| Dashboard de Compras | OK — `get_compras_dashboard_metrics` volta a responder (4 urgências) e fica restrito ao grupo (#55) |
| Crons do banco | OK — `edge_invoke_service_key` gravada no Vault (md5 igual ao da chave do projeto); `outbox-worker-1min` → `process-outbox` **200** `{"processed":0,"dead":0}`; `xbz-sync-pedidos-30min` 404 → **200** (15:00 UTC); `spot-api-sync-stock` 404 → 500 `SPOT_API_ACCESS_KEY não configurada` — BLOQUEADO (credencial Spot) |
| Edges | **37 no ar** (Management API `GET /functions` → 37): as 5 que faltavam publicadas e as 4 `ai-*` republicadas da `main` em 2026-11-13; BLOQUEADO: `ai-*` sem `LOVABLE_API_KEY`, `spot-api` sem `SPOT_API_ACCESS_KEY`, `migrate-helper` sem `MIGRATE_HELPER_ACCESS_KEY`, `process-solicitacao-neural` inexistente (§4) |
| Fluxo de compra completo | OK — PRs #70–#75 mergeadas pelo dono (17:04–17:11 UTC) e as 6 migrations **aplicadas em produção** com aval do dono (~17:50 UTC, 1 transação). Provado no banco vivo (roteiros em rollback): 2ª cotação grava (notas 60/20, antes `E22003`), aprovar cotação → `aprovada` (antes `EP0001`), entrega → **1** pagamento e solicitação `concluida` (antes trava/2 pagamentos), solicitação de R$100 → `aprovada` com orçamento +100 uma vez (antes `23502` e ×16), comprador não edita/apaga/aprova dado de outro nem cria em outra org (`0`/`E42501`, antes `1`) (§8.1) |
| Banco: RLS (recheck 2026-11-13) | OK — 156 tabelas, 0 sem RLS, 0 com RLS sem policy, 0 policy com RLS desligada, 0 views sem `security_invoker`, 0 views com `auth.users` para anon |
| Código pela metade | 0 TODO/FIXME/WIP; 10 botões ligados (#43/#46/#47) e 1 link corrigido (#48); 67 itens triados como decisão de negócio (§5.1) |
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

Histórico do dia: às 11:02 UTC os jobs da `main` não iniciaram — anotação do check-run: **"The job was not started because an Actions budget is preventing further use."** O dono liberou o orçamento duas vezes; nos intervalos o CI rodou e **todas as PRs desta auditoria tiveram CI verde antes do merge** (§8). A #51 (aprovada pelo dono) reduziu `types-sync`/`contexto` de 10 min para 1 h.

| Workflow | Última execução conferida | Status |
|---|---|---|
| `main.yml` (Freight Quest CI/CD) | verde em cada PR mergeada (ex.: #48, #50, #59 com 8/8 checks incl. E2E) | OK nas PRs; ver linha final |
| `guards.yml` | verde nas PRs; local na `main` final `b6e0427`: `npm run guards` → 196/196, exit 0 | OK |
| `automation-local.yml` | verde nas PRs; local: `node scripts/automation.mjs doctor --static` → `"status":"healthy"` | OK |
| `types-sync.yml` | #483 success; agora 1x/hora (#51) | OK |
| `contexto.yml` | #170 success; agora 1x/hora (#51) | OK |
| `branch-hygiene-audit.yml` | #1 success | OK |
| `notifica-falha-main.yml` | `skipped` (nada a notificar) | OK |
| `inventario-estado-semanal.yml` | #1 failure: `GitHub Actions is not permitted to create or approve pull requests.` | BLOQUEADO — setting do repositório (decisão do dono) |
| **Execução pós-último-merge na `main` (`c4a54e7`, #76, 14:31 UTC de 2026-11-13)** | Freight Quest CI/CD `success`; Guards offline `success`; Automação local `success`; Push on main (CodeQL) `success`; `notifica-falha-main` `skipped` (15:01); `types-sync` `success` (schedule 14:14); `contexto` run 43443470018: job "O que precisa rodar" success, "Produtor regras/" e "Produtor codigo/" `queued` sem runner; `inventario-estado-semanal` último run 42603442102 `failure`: `##[error]GitHub Actions is not permitted to create or approve pull requests.` | OK, exceto `contexto` (fila de runners) e `inventario-estado-semanal` — BLOQUEADO: setting do repositório "Allow GitHub Actions to create and approve pull requests" (decisão do dono; não se corrige por código) |
| Execução anterior (`b6e0427`, 19:57 UTC de 2026-11-12) | 3 checks success, 9 `queued` por mais de 1 h; o repositório tem 38 runs `queued` e nenhum iniciando; consumo cobrável estável (35.951 min, US$ 215,71), ou seja, não é o orçamento | BLOQUEADO — fila de runners da conta parada; não há o que corrigir no código. Prova de qualidade da mesma `main`, rodada localmente: typecheck 0, eslint 0 erros, vitest 2297/2309 (12 skipped), build 0, guards 196/196, Deno 36/36, E2E 30/30 |

## 3. Banco (`lmypcdfsrgfftzhxawao`)

### 3.1 Advisors (lints nível ERROR, por SQL — o MCP deste projeto não expõe `get_advisors`)
| Lint / risco | Estado final (prova) | Status |
|---|---|---|
| `rls_disabled_in_public` | 0 (156/156 com RLS) | OK |
| `policy_exists_rls_disabled` / `rls_references_user_metadata` / `auth_users_exposed` | 0 / 0 / 0 | OK |
| `security_definer_view` | antes: `supplier_compliance_summary`, `v_system_health_overview` (anon lia 10 linhas). Após #41: lint `[]`; anon → `permission denied for view`; admin lê 10/2 | OK |
| `mv_dashboard_kpis` exposta | após #41/#52: `anon` e `authenticated` sem SELECT | OK |
| `execute_read_query` (anon escrevia como postgres) | após #40: anon → `permission denied for function execute_read_query` | OK |
| `exec_sql` (anon lia `auth.users` = 12 linhas) | após #52: anon → `permission denied for function exec_sql`; service_role mantém (run-audit) | OK |
| `xbz_cron_key_get` (devolvia segredo do Vault) | após #52: só service_role | OK |
| SECURITY DEFINER executáveis por anon | **150 → 9** após #54 (ficam 6 usadas em policy + 3 do login; login sem sessão testado: `is_account_locked` → `{"locked":false}`); exploit `run_all_health_scans` como anon → `permission denied` | OK |
| Policies por papel anuladas por `tenant_isolation_*` PERMISSIVE | após #56: 35 tabelas com `tenant_isolation_*` RESTRICTIVE; admin lê pedidos 34/fornecedores 10/cotações 61; usuário sem papel: fornecedores 10 → 0 | OK |
| `has_role(uuid, role)` executável por anon (revela papel de qualquer usuário) | mantida porque é usada em policy | BLOQUEADO — exige reescrever policies para não depender de função exposta (decisão de arquitetura) |

### 3.2 Migrations × banco
BLOQUEADO — não existe ledger: `supabase_db_migrations` → "Tabela supabase_migrations.schema_migrations não encontrada neste projeto". 283 arquivos sem registro do que rodou antes desta sessão; comparar exige decidir com o dono o caminho de baseline. **O que foi aplicado nesta sessão está rastreado** (arquivo → PR mergeada → apply com aprovação do dono → prova): `20261112134500` (#40), `20261112135000` (#41), `20261112135500` (#42), `20261112165500` (#52), `20261112170347` (#56), `20261112171300` (#54), `20261112171742` (#53), `20261112171900` (#55).

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
| `ai-demand-prediction` | `DemandPredictionPanel.tsx` | 500 → republicada | BLOQUEADO | 2026-11-13: republicada da `main` (`supabase functions deploy --use-api` → "Deployed Functions."; Management API: ACTIVE v3). O código exige `Deno.env.get("LOVABLE_API_KEY")` e a lista de secrets do projeto (`GET /v1/projects/…/secrets`) não tem essa chave — falta a chave do AI Gateway da Lovable (credencial do dono) |
| `ai-negotiation` | `NegociacaoIA.tsx` | 500 → republicada | BLOQUEADO | 2026-11-13: republicada da `main` (`supabase functions deploy --use-api` → "Deployed Functions."; Management API: ACTIVE v3). O código exige `Deno.env.get("LOVABLE_API_KEY")` e a lista de secrets do projeto (`GET /v1/projects/…/secrets`) não tem essa chave — falta a chave do AI Gateway da Lovable (credencial do dono) |
| `ai-supplier-risk` | `SupplierRiskAnalysis.tsx` | 500 → republicada | BLOQUEADO | 2026-11-13: republicada da `main` (`supabase functions deploy --use-api` → "Deployed Functions."; Management API: ACTIVE v3). O código exige `Deno.env.get("LOVABLE_API_KEY")` e a lista de secrets do projeto (`GET /v1/projects/…/secrets`) não tem essa chave — falta a chave do AI Gateway da Lovable (credencial do dono) |
| `ai-supplier-suggestion` | — | 500 → republicada | BLOQUEADO | 2026-11-13: republicada da `main` (`supabase functions deploy --use-api` → "Deployed Functions."; Management API: ACTIVE v3). O código exige `Deno.env.get("LOVABLE_API_KEY")` e a lista de secrets do projeto (`GET /v1/projects/…/secrets`) não tem essa chave — falta a chave do AI Gateway da Lovable (credencial do dono) |
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
| `health-dashboard` | — | 404 → 401 | OK | 2026-11-13: publicada (ACTIVE v2). `GET` sem login pelo `pg_net` (id 95779) → 401 `{"error":"Unauthorized"}` do próprio código (antes 404 `Requested function was not found`) |
| `maintain-partitions` | — | 404 → publicada | BLOQUEADO | publicada 2026-11-13 (ACTIVE v2, `GET /functions`). Chamada real não feita: a função cria partições (escrita) e a chamada com a chave `service_role` foi negada pelo controle de permissões da sessão ("Modify Shared Resources"); nenhum cron a chama hoje |
| `migrate-helper` | — | 500 | BLOQUEADO | ping 500. Log real em `telemetry_logs` (13:48:27 UTC): **`[migrate-helper] server_misconfigured: MIGRATE_HELPER_ACCESS_KEY ausente`** — falta o segredo `MIGRATE_HELPER_ACCESS_KEY` nas secrets das edges (decisão do dono; segredo nunca passa por PR). Sem acesso a log de edge (nenhum MCP de logs para este projeto; `*.supabase.co` bloqueado pelo proxy desta sessão; `deno test` local falha em `Import https://esm.sh/zod@3.22.4 failed`) |
| `migrate-storage-paths` | `StorageMigration.tsx` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `process-invoice-idp` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `process-outbox` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `punchout-receive` | — | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `punchout-setup` | `PunchOutCatalogs.tsx` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `run-audit` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `scim-v2` | `SSOConfig.tsx` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `send-push-notification` | — | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `spot-api` | — | 404 → 500 | BLOQUEADO | publicada 2026-11-13; secret `SPOT_CRON_KEY` cadastrado (POST secrets → 201) com o valor de `spot_cron_key` do Vault. Cron `spot-api-sync-stock` 14:45 e 15:00 UTC → 500 `{"error":"SPOT_API_ACCESS_KEY não configurada"}`: passa no gateway e na chave do cron; falta a credencial da conta Spot Gifts |
| `spot-proxy` | `useSpotIntegration.ts` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `system-simulation` | `AdminTelemetria.tsx` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `telemetry` | `logger.ts` | 401 | OK | `supabase_functions_ping` → 401: publicada; exige JWT de usuário (esperado) |
| `tests/` | — | — | OK | pasta de suítes (`fuzzing_suite.ts`, `integration_suite.ts`), não é função publicada |
| `webauthn-authenticate` | `useWebAuthn.ts` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `webauthn-register` | `useWebAuthn.ts` | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `weekly-report` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `weekly-summary-report` | — | 200 | OK | `supabase_functions_ping` → 200: responde |
| `workflow-engine` | — | 405 | OK | `supabase_functions_ping` → 405: publicada; ping usa método não aceito (só POST/OPTIONS) — esperado |
| `xbz-proxy` | — | 404 → 405 | OK | publicada 2026-11-13. `GET` pelo `pg_net` (id 95780) → 405 `{"error":"Método não permitido","requestId":…}` do próprio código (só POST) |
| `xbz-sync-pedidos` | — | 404 → 200 | OK | publicada 2026-11-13. Cron `xbz-sync-pedidos-30min` 15:00 UTC → 200 `{"results":[],"requestId":"f0c11d92-…"}` (antes 404 às 14:30) |
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
| AI Gateway (Lovable) | edges `ai-*` | BLOQUEADO — republicadas; falta o secret `LOVABLE_API_KEY` (§4) |
| XBZ | `xbz-proxy`, `xbz-sync-pedidos` | OK — publicadas; sincronização agendada 200 às 15:00 UTC (§4) |
| Spot Gifts | `spot-proxy` (no ar, 405 no ping) / `spot-api` | `spot-proxy` OK; `spot-api` BLOQUEADO — publicada, falta `SPOT_API_ACCESS_KEY` (500 no cron, §4) |
| ERP | `erp-sync` | OK — publicada (401 sem JWT) |
| SCIM / SSO | `scim-v2` | OK — publicada (401 sem JWT) |
| WebAuthn (passkey) | `webauthn-register`, `webauthn-authenticate` | OK — publicadas (405 no ping GET) |
| Punchout | `punchout-setup`, `punchout-receive` | OK — publicadas (405 no ping GET) |
| Fiscal (SEFAZ) | `fiscal-orchestrator` | OK — publicada (401 sem JWT) |
| Ponte externa | `external-db-bridge` | OK — publicada (405 no ping GET) |

## 8. Correções desta auditoria

| PR | O quê | Evidência | Estado |
|---|---|---|---|
| [#40](https://github.com/adm01-debug/Promo_Supply_V2/pull/40) | fecha `execute_read_query` para anon/authenticated | anon → `permission denied` | mergeada + aplicada |
| [#41](https://github.com/adm01-debug/Promo_Supply_V2/pull/41) | views com `security_invoker`, sem leitura anônima | anon → `permission denied`; admin 10/2 | mergeada + aplicada |
| [#42](https://github.com/adm01-debug/Promo_Supply_V2/pull/42) | remove 6 tabelas-lixo `v_*` | 156/156 com RLS, 0 sem policy | mergeada + aplicada |
| [#43](https://github.com/adm01-debug/Promo_Supply_V2/pull/43) | CSV, EXPORT REPORT, VER TUDO | CI verde; deploy READY | mergeada |
| [#44](https://github.com/adm01-debug/Promo_Supply_V2/pull/44) | acentuação corrompida em 12 telas | CI verde; deploy READY | mergeada |
| [#46](https://github.com/adm01-debug/Promo_Supply_V2/pull/46) | Novo Evento, Ver Pedido, Rastrear, 2× Exportar | CI verde incl. E2E; deploy READY | mergeada |
| [#47](https://github.com/adm01-debug/Promo_Supply_V2/pull/47) | Iniciar Cotação Imediata, VER MATRIZ KRALJIC | CI verde (8 checks) | mergeada |
| [#48](https://github.com/adm01-debug/Promo_Supply_V2/pull/48) | "Citar Agora" usava número de exibição como id | 11/11 com `numero`; busca por número → 0; CI verde | mergeada |
| [#50](https://github.com/adm01-debug/Promo_Supply_V2/pull/50) | `vercel.json` rewrite da SPA | produção `/pedidos` 404 → 200; deploy `dpl_EYjKiASE1eiagykXutA5UBnbEAfg` READY | mergeada |
| [#51](https://github.com/adm01-debug/Promo_Supply_V2/pull/51) | crons `types-sync`/`contexto` 10 min → 1 h (aprovado pelo dono) | guards OK; CI verde | mergeada |
| [#52](https://github.com/adm01-debug/Promo_Supply_V2/pull/52) | fecha `exec_sql` e chaves XBZ para anon | anon lia 12 usuários → `permission denied` | mergeada + aplicada |
| [#53](https://github.com/adm01-debug/Promo_Supply_V2/pull/53) | crons/chamadas de edge para o projeto certo, chaves do Vault | 0 funções/jobs com ref errado ou JWT; 3 funções em `lmypcdfsrgfftzhxawao` | mergeada + aplicada |
| [#54](https://github.com/adm01-debug/Promo_Supply_V2/pull/54) | revoga 141 SECURITY DEFINER de anon | 150 → 9; login sem sessão OK | mergeada + aplicada |
| [#55](https://github.com/adm01-debug/Promo_Supply_V2/pull/55) | dashboard de compras volta a carregar, restrito ao grupo | admin: KPIs + 4 urgências; anon → `permission denied` | mergeada + aplicada |
| [#56](https://github.com/adm01-debug/Promo_Supply_V2/pull/56) | `tenant_isolation_*` RESTRICTIVE em 35 tabelas | admin vê tudo; sem papel: fornecedores 10 → 0 | mergeada + aplicada |
| [#57](https://github.com/adm01-debug/Promo_Supply_V2/pull/57) | seta do tour corrompida + guard de encoding | local após rebase: guards 198/198, vitest onboarding 59/59, doctor healthy | mergeada |
| [#58](https://github.com/adm01-debug/Promo_Supply_V2/pull/58) | números do CSV em formato pt-BR | CI verde | mergeada |
| [#59](https://github.com/adm01-debug/Promo_Supply_V2/pull/59) | vencimento das urgências um dia antes | `main`+#59: typecheck OK, 1011/1011 | mergeada |
| [#62](https://github.com/adm01-debug/Promo_Supply_V2/pull/62) | moeda `char(1)` → `char(3)`: cotação e pedido voltam a ser criados | recheck 2026-11-13: `cotacoes`, `pedidos`, `savings_tracker` = `character(3)` | mergeada + aplicada |
| [#63](https://github.com/adm01-debug/Promo_Supply_V2/pull/63) | números do dashboard de compras sem inflar; período passa a valer | migration `20261112222833` aplicada | mergeada + aplicada |
| [#64](https://github.com/adm01-debug/Promo_Supply_V2/pull/64) | cadastro preenche a empresa certa | recheck: 37 gatilhos `fill_tenant_id*` ativos | mergeada + aplicada |
| [#65](https://github.com/adm01-debug/Promo_Supply_V2/pull/65) | comprador lê contratos (só leitura; aprovado pelo dono, opção A) | recheck: policies `buyer_le_contracts`, `buyer_le_contract_items`, `buyer_le_contract_documents` | mergeada + aplicada |
| [#66](https://github.com/adm01-debug/Promo_Supply_V2/pull/66) | fecha vazamento de papel/empresa e KPIs de outras organizações | recheck: `has_function_privilege('anon','user_belongs_to_tenant')` = false | mergeada + aplicada |
| [#67](https://github.com/adm01-debug/Promo_Supply_V2/pull/67) | guard de encoding pega acento corrompido, seta e U+FFFD | guards 528/528 na `main` `c4a54e7` | mergeada |

Também mergeadas na `main` no período (escopo de outras frentes): #60, #61, #68, #76.

Operações em produção de 2026-11-13 (aprovadas pelo dono, "APROVADO 1, 2 e 3"): `vault.create_secret` de `edge_invoke_service_key` (valor lido pela Management API e gravado sem exibir; md5 no Vault = md5 da chave do projeto); deploy de `health-dashboard`, `maintain-partitions`, `spot-api`, `xbz-proxy`, `xbz-sync-pedidos` e redeploy das 4 `ai-*` a partir da `main`; secret `SPOT_CRON_KEY` (201). Papéis: 7 usuários com `buyer` (recheck).

### 8.1 Fluxo de compra (#70–#75) — mergeado e aplicado

Provas antes da aplicação (3 especialistas + verificador cético, cada um aplicando as 6 migrations em `begin … rollback` no banco de produção): fluxo de compra, matriz de permissões por papel e idempotência (3 passadas seguidas sem erro; hashes de 46 gatilhos, 58 policies e 363 funções idênticos entre passadas). Veredito do verificador: **APLICAR**. Ordem aplicada (timestamp): 122251 (#71) → 122616 (#70) → 123212 (#72) → 123531 (#73) → 123738 (#75) → 124508 (#74); a regra de entrega que #71 e #70 redefinem fica com a versão da #70 (guarda `status = 'em_andamento'`). Arquivos idênticos aos da `main` (`cmp`).

| Prova no banco vivo (pós-aplicação, rollback) | Antes | Depois |
|---|---|---|
| 2ª cotação com valor diferente | `E22003 numeric field overflow` | grava; notas `4550: 100/0/60`, `4830: 0/100/20` |
| Aprovar cotação (`selectCotacao`) | `EP0001 Transição de status inválida: pendente → em_andamento` | `aprovada`; pedido leva a `em_andamento` |
| Entregar pedido | `EP0001 … pendente → concluida`; sem solicitação: 2 pagamentos | `1 PAG-002027 v=4550 o=df60b900`; solicitação `concluida` |
| Solicitação de R$100 (payload do front) | `23502 tenant_id … notifications` | `aprovada`; orçamento +100,00 (soma das linhas) |
| Pedido com fornecedor de CNPJ antigo inválido | `23514 fornecedores_cnpj_valid` | grava e paga; cadastro novo com CNPJ inválido segue recusado (`23514`) |
| Comprador edita/apaga/aprova solicitação de outro | `1` / `1` / `EP0001` | `0` / `0` / `0` |
| Comprador cria em outra org / troca a própria org | `ok` / `1` | `E42501` |
| Job de limpeza do cron (#74) | job 40 | 1 job `limpa-historico-cron-semanal` (`17 4 * * 0`) |

Efeito colateral corrigido na PR [#81](https://github.com/adm01-debug/Promo_Supply_V2/pull/81): Kanban e painel de urgências mostravam "Status atualizado!" quando a policy nova devolvia 0 linhas.

Riscos aceitos e registrados pelo verificador: o comprador pode criar etapa de aprovação em que ele mesmo aprova (`approval_steps_insert_workflow_proprio` não restringe `aprovador_id`); `approval_workflows` continua editável por qualquer usuário da org; nada valida que o `cost_center_id` seja do mesmo tenant (há 1 org hoje); `score_qualidade` chega 0 (o padrão 80 nunca vale).

### 8.2 PRs abertas

| PR | Estado |
|---|---|
| [#81](https://github.com/adm01-debug/Promo_Supply_V2/pull/81) | front: aviso de "sem permissão" no Kanban/urgências — **mergeada** (13 checks verdes incl. E2E; deploy Vercel `1bb3c10` success 18:43 UTC) |
| [#78](https://github.com/adm01-debug/Promo_Supply_V2/pull/78), [#79](https://github.com/adm01-debug/Promo_Supply_V2/pull/79), [#80](https://github.com/adm01-debug/Promo_Supply_V2/pull/80) | reabertas por outro processo a partir de branches já mergeadas (#64, #66, #77): duplicatas — fechar |

### 8.3 Produção (front) — conferido em 2026-11-13 20:29 UTC

- `GET https://promo-supply-v2.vercel.app/pedidos` → **200** (`server: Vercel`, `index.html` da SPA) via MCP da Vercel.
- `get_runtime_errors` (projeto `prj_fHDZ7WsU1uW4j2HusDSrGLspbbDN`, 24 h) → **"No runtime errors found"**.
- CI da `main` `6594ae7`: Freight Quest CI/CD, Guards, Automação local e CodeQL **success**; `types-sync` e `contexto` na fila de runners.

## 10. Falhas encontradas no re-teste de 2026-11-13 (anteriores à auditoria; aguardando decisão — DDL em produção)

Re-teste só leitura/rollback de todas as entregas #40–#67: todas seguem valendo (execute_read_query, exec_sql e chaves XBZ negadas a anon `42501`; 0 views sem `security_invoker`; 35 policies RESTRICTIVE; 8 SECURITY DEFINER executáveis por anon, todas intencionais — policies e pré-login; crons via Vault no projeto certo; moeda `character(3)`; 37 gatilhos `a_fill_tenant_id`; comprador lê 5 contratos e não escreve; 156/156 tabelas com RLS e policy; 7 compradores com papel e vínculo). Bateria na `main` `53f69f3`: typecheck 0, eslint 0 erros, **vitest 2311 passed / 12 skipped (2323)**, build 0, guards 530/0, Deno 36/0, **E2E 30 passed**.

| # | Falha | Prova | Status |
|---|---|---|---|
| 1 | **Upload de arquivos quebrado para todos**: `storage.objects` com RLS e **0 policies** (buckets privados `comprovantes`, `documentos`, `fiscal-documents`) | admin: `ERR 42501 new row violates row-level security policy for table objects`; `PagamentoDetailModal.tsx:89-91` | PR [#84](https://github.com/adm01-debug/Promo_Supply_V2/pull/84) aberta, aguardando o dono — **completa**: policies resolvem a empresa pelo cadastro (`user_belongs_to_tenant`, sem depender de claim no JWT); front grava o caminho e abre por URL assinada (renovada a cada 50 min). Revisor independente: 147/147 asserções em rollback com usuários reais sem claim; nenhum acesso entre tenants; UPDATE não move arquivo para o bucket público |
| 2 | Cron `refresh-mv-dashboard-kpis` falha a cada 15 min desde 11/09 (6.064 falhas, 0 sucesso) | `cannot refresh materialized view public.mv_dashboard_kpis concurrently` (sem índice único) | PR [#83](https://github.com/adm01-debug/Promo_Supply_V2/pull/83) aberta, aguardando o dono — recria `idx_mv_dashboard_kpis_pk`; refresh `ok=true` em rollback |
| 3 | Cron `lgpd_retention_daily` falha todo dia desde 12/09: a retenção LGPD de 12 tabelas não roda | `column created_at does not exist` em `wal_rate_snapshots` (coluna real `captured_at`) | PR [#83](https://github.com/adm01-debug/Promo_Supply_V2/pull/83) aberta, aguardando o dono — corrige 3 colunas inexistentes; em rollback roda e apagaria 3 linhas de `login_attempts` (>180 dias) — deleção real |
| 4 | Gatilhos duplicados após a aplicação | `pedidos.trigger_update_saldo_on_pedido`×2 (saldo do fornecedor em dobro), `validate_pedido_status_transition`×2, `validate_solicitacao_status_transition`×2, `supplier_documents.trigger_recalculate_qualification_score`×2, `update_updated_at_column`×2 (pedidos, solicitacoes, tenants) | PR [#85](https://github.com/adm01-debug/Promo_Supply_V2/pull/85) aberta, aguardando o dono — remove só as cópias idênticas; saldo e auditoria passam a contar 1× |
| 5 | Orçamento na **aprovação do pedido** multiplica (linha anual + 7 mensais) | `handle_pedido_budget_realization` filtra só `ano`; soma −7.200/+36.400 numa compra de 900/4.550 | PR [#85](https://github.com/adm01-debug/Promo_Supply_V2/pull/85) aberta, aguardando o dono — em rollback: comprometido −4.550 e utilizado +4.600, 1× |
| 6 | Anônimo trava a conta de qualquer e-mail | `record_failed_login('x@…')` ×6 como `anon` → `is_account_locked = true` | BLOQUEADO — decisão de design do login |
| 7 | CI da `main` após os merges #70–#75 | `Freight Quest CI/CD`, `Guards`, `types-sync` e `contexto` de `53f69f3` em `queued` desde 17:11 UTC | BLOQUEADO — fila de runners/orçamento do Actions |

## 9. Aguardando decisão do dono (BLOQUEADO)
Resolvidos em 2026-11-13: `edge_invoke_service_key` no Vault, deploy das 5 edges, redeploy das 4 `ai-*`, `SPOT_CRON_KEY` e perfil do `comprador1` (§8).

1. **Falhas da §10** — 5 correções de banco (upload, 2 crons, gatilhos duplicados, orçamento na aprovação do pedido) e a decisão sobre o travamento de conta por anônimo.
2. **Credenciais de fornecedores** — `SPOT_API_ACCESS_KEY` (Spot Gifts: cron 500 `SPOT_API_ACCESS_KEY não configurada`) e `LOVABLE_API_KEY` (as 4 edges de IA). Só o dono tem os valores; entram como secrets das edges, nunca por PR.
3. **`migrate-helper`** — `server_misconfigured: MIGRATE_HELPER_ACCESS_KEY ausente`. É uma função administrativa: definir se fica desligada (estado atual, fail-closed) ou recebe a chave.
4. **`CRON_SECRET` ausente** — `verifyCronSecret` (`supabase/functions/_shared/security.ts:196`) é fail-open: qualquer um com a chave anon dispara alert-dispatcher, check-* e weekly-report. Ligar exige o mesmo valor nos crons do banco.
5. **`maintain-partitions`** — publicada, mas a chamada de prova (escreve partições) foi negada pelo controle de permissões da sessão; nenhum cron a chama.
6. **67 elementos clicáveis sem ação, card fictício `AISupplierSuggestion`, métricas fixas do dashboard executivo, `DeliveryCalendar` nunca renderizado, edge `process-solicitacao-neural` inexistente** (chamada em `NovaSolicitacaoModal.tsx:112` e `DeveloperDocs.tsx:44`) — exigem definição de negócio (§5.1).
7. **Ledger de migrations** — decidir baseline (§3.2); sem ele, "migrations do repo batem com o banco" não é verificável arquivo a arquivo.
8. **Dados com mojibake** — `sourcing_event_lots.nome` (6 linhas); correção é DML em produção.
9. **Segurança da conta** — repositório público; token Vercel (`vcp_…`) colado no chat deve ser revogado; `x-spot-cron-key` antigo em 6.037 linhas de `cron.job_run_details`.
10. **Actions** — habilitar "Allow GitHub Actions to create and approve pull requests" (inventário semanal); fila de runners do `contexto` parada (jobs `queued`).
