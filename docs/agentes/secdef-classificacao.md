# Funções SECURITY DEFINER do schema `public` — quem pode executar

Base da migration `supabase/migrations/20261112171300_secdef_revoga_anon.sql`. Levantamento em produção
(`lmypcdfsrgfftzhxawao`, 2026-11-12): 154 funções `SECURITY DEFINER` em `public`, 150 executáveis por `anon`
(`pg_proc.prosecdef` + `has_function_privilege('anon', oid, 'EXECUTE')`). Todas são do `postgres` e
ganhavam EXECUTE de `PUBLIC`, `anon`, `authenticated` e `service_role` pelo default privilege.

Regra ao criar função nova em `public`: depois desta migration ela nasce **sem** `anon` (só `postgres`,
`authenticated`, `service_role`). Se a tela de login precisar dela, dê `GRANT EXECUTE ... TO anon` explícito
e acrescente a linha aqui.

## Como cada uma foi classificada

| Critério | Fonte da evidência |
|---|---|
| (a) usada em policy, default, view ou check | `pg_policies.qual/with_check`, `pg_attrdef`, `pg_views`, `pg_constraint` (regex `\m<nome>\M`). Policies valem para `{public}` e `{authenticated}` → anon também avalia |
| (b) RPC do front | `grep -rhoE "rpc\(['\"]<nome>" src` + `origin/contexto:docs/contexto/codigo/rotas.json` (campo `rpcs`) |
| (c) edge | `grep rpc( supabase/functions` — todas usam `SUPABASE_SERVICE_ROLE_KEY` (`_shared/rate_limit.ts:24`, `alert-dispatcher/index.ts:241`, `webauthn-authenticate/index.ts:44`, `workflow-engine/index.ts:34`) |
| (c) cron | `cron.job.command` (todos os 20 jobs rodam como `postgres`) |
| (c) trigger | `pg_trigger.tgfoid` / retorno `trigger`/`event_trigger`. EXECUTE só é checado no `CREATE TRIGGER`, não no disparo |
| sem chamador | nenhuma das fontes acima; nenhuma função `SECURITY INVOKER` as chama (consulta em `pg_proc.prosrc` voltou 0 linhas) |

Chamadas entre funções `SECURITY DEFINER` rodam como o dono (`postgres`) e não dependem do grant do chamador.

## Resultado

### Ficam com anon + authenticated (sem mudança) — 9 (8 desde `20261112223649_security_papel_empresa_kpis.sql`)

| Função | Motivo |
|---|---|
| `current_tenant_id()` | (a) policies + default de coluna; front `src/features/auth/hooks/useAuth.tsx:55` |
| `get_my_organization()` | (a) policies |
| `get_user_grupo_id()` | (a) policies |
| `has_role(uuid,app_role)` | (a) policies; front `src/lib/supabaseRpc.ts:211`. Uuid diferente de `auth.uid()` só responde a service_role/postgres (anon/authenticated recebem `false`) desde `20261112223649` |
| `tenant_in_my_group(uuid)` | (a) policies |
| `user_belongs_to_tenant(uuid,uuid)` | (a) policy só `TO authenticated`: PUBLIC/anon revogados e uuid alheio → `false` em `20261112223649` |
| `is_account_locked(text)` | (b) tela `/auth` antes do login — `src/hooks/useAccountLockout.ts:46` |
| `record_failed_login(text)` | (b) login falhou, sem sessão — `src/hooks/useAccountLockout.ts:76` |
| `log_login_attempt(text,text,text,boolean,text)` | (b) login falhou, sem sessão — `src/pages/auth/Auth.tsx:112` |

### Só authenticated (sai anon) — 17

| Função | Chamada no front |
|---|---|
| `clear_login_lockout(text)` | `src/pages/auth/Auth.tsx:140`, só no ramo de sucesso do `signIn` (já há sessão) |
| `admin_scan_runs_sla_status()` | `rpc('admin_scan_runs_sla_status')` |
| `alerts_mttr_by_type(integer)` | idem (também edge `health-dashboard` com service_role) |
| `alerts_noisy_scanners(integer)` | idem |
| `alerts_severity_timeseries(integer)` | idem |
| `check_budget_availability(uuid,numeric)` | `rpc('check_budget_availability')` |
| `count_legacy_storage_urls()` | `rpc('count_legacy_storage_urls')` |
| `find_approval_rule(numeric,uuid)` | `rpc('find_approval_rule')` |
| `generate_sequential_number(text,text)` | `rpc('generate_sequential_number')` |
| `get_compras_dashboard_metrics(uuid,text,uuid,uuid)` | `rpc('get_compras_dashboard_metrics')` |
| `get_cost_center_performance_report()` | `rpc('get_cost_center_performance_report')` |
| `get_effective_approver(uuid,uuid,numeric)` | `rpc('get_effective_approver')` |
| `get_fornecedores_kpis(uuid)` | `rpc('get_fornecedores_kpis')` |
| `get_pagamentos_kpis(uuid)` | `rpc('get_pagamentos_kpis')` |
| `get_pedidos_kpis(uuid)` | `rpc('get_pedidos_kpis')` |
| `get_solicitacoes_kpis(uuid)` | `rpc('get_solicitacoes_kpis')` |
| `resolve_alert(uuid,text)` | `rpc('resolve_alert')` |

### Só service_role (sai anon e authenticated) — 124

| Grupo | Funções |
|---|---|
| (c) edge, service_role (4) | `alert_subscribers_for(text,text)` (devolvia `webhook_secret` para qualquer visitante), `check_rate_limit(text,text,integer,integer)`, `check_workflow_sod(uuid,uuid,uuid)`, `log_security_event(uuid,text,text,text,text,jsonb,text)` |
| (c) cron (6) | `_invoke_edge_function(text)`, `_invoke_xbz_sync()`, `apply_lgpd_retention()`, `cleanup_old_integration_outbox()`, `refresh_mv_dashboard_kpis()`, `xbz_sync_watchdog()` |
| (c) trigger (33) | `alert_on_outbox_dead`, `audit_pagamento_changes`, `audit_user_roles_changes`, `auto_approve_low_value_solicitacao`, `auto_block_low_score_supplier`, `auto_calculate_delivery_penalty`, `auto_create_pagamento_on_delivery`, `auto_transition_solicitacao_on_cotacao_approval`, `auto_transition_solicitacao_on_pedido_delivery`, `auto_update_supplier_score_on_delivery`, `calculate_cotacao_scores`, `check_telemetry_alerts`, `enforce_audit_integrity`, `grant_tenant_access_on_insert`, `handle_new_user`, `handle_pedido_budget_realization`, `handle_solicitacao_budget_change`, `log_budget_changes`, `log_cotacao_action`, `recalculate_all_solicitacao_cotacoes`, `rls_auto_enable` (event trigger), `sanitize_audit_metadata`, `sanitize_session_token`, `sync_budget_on_payment`, `trg_cotacao_approved_transition`, `trg_pedido_entregue_transition`, `trg_solicitacao_approved_transition`, `trigger_recalculate_qualification_score`, `trigger_update_saldo_on_pagamento`, `trigger_update_saldo_on_pedido`, `update_cost_center_budget_totals`, `update_estoque_saldo`, `update_licitacao_best_bid` (todas sem argumentos) |
| (c) sem chamador (14) | `calculate_supplier_qualification_score(uuid)`, `fx_convert(numeric,character,character,date)`, `get_dashboard_kpis(date,date)`, `get_failed_login_count(text,integer)`, `get_user_role(uuid)`, `has_permission(uuid,text,text)`, `is_ip_blocked(text)`, `is_ip_whitelisted(text)`, `log_audit_event(text,text,text,text,jsonb,jsonb,jsonb)`, `tenants_in_my_group()`, e sobras de teste `t1(uuid,text,uuid,uuid)`, `test_no_defaults(uuid,text,uuid,uuid)`, `test_subselect(uuid,text,uuid)`, `test_with_defaults(uuid,text,uuid,uuid)` |
| (d) manutenção / diagnóstico (67) | `archive_audit_logs_older_than(integer)`, `archive_telemetry_logs_older_than(integer)`, `check_escalation()`, `check_secret_rotation_due()`, 15 `cleanup_*()`, `cron_watchdog()`, `ensure_audit_logs_partition(date)`, `ensure_telemetry_logs_partition(date)`, `get_cron_job_staleness()`, `get_db_health_snapshot()`, `pg_activity_watchdog()`, `recalculate_saldo_comprometido(uuid)`, `run_all_health_scans()`, 39 `scan_*` (inclui as duas sobrecargas de `scan_cache_hit_ratio` e `scan_connection_saturation`), `simulate_scan_sla_loop(integer,double precision)` |

Assinaturas exatas: a lista da migration (cada uma passa por `::regprocedure`, que aborta tudo se alguma não existir).

## Default privileges (funções futuras)

| Dono | Antes | Depois |
|---|---|---|
| `postgres` em `public` | postgres, anon, authenticated, service_role | postgres, authenticated, service_role |
| `postgres` global | (implícito) PUBLIC | só postgres — sem isso anon herdava via PUBLIC, porque o default por schema só soma ao global |
| `supabase_admin` em `public` | postgres, anon, authenticated, service_role | **sem mudança**: `postgres` não é membro de `supabase_admin` (`pg_has_role` = false) e o `ALTER` dá `permission denied to change default privileges`; a migration só avisa (NOTICE) |

Efeito colateral do default global: função que o `postgres` criar em **outro** schema também nasce sem
EXECUTE para PUBLIC (precisa de GRANT explícito). Em `storage` o default do schema continua concedendo a anon,
authenticated e service_role.
