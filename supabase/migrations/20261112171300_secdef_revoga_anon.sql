-- ============================================
-- MIGRATION: fecha funções SECURITY DEFINER do schema public para anon
-- Data: 2026-11-12
--
-- Causa: o default privilege do Supabase concede EXECUTE a PUBLIC, anon,
-- authenticated e service_role em toda função criada por postgres no schema
-- public (pg_default_acl postgres:f:public e o default global de funções =
-- PUBLIC). Em produção 150 funções SECURITY DEFINER eram executáveis por
-- anon pela API REST (/rest/v1/rpc/<nome>) só com a chave pública — por
-- exemplo archive_audit_logs_older_than, run_all_health_scans,
-- log_security_event e alert_subscribers_for (devolve webhook_secret).
--
-- Classificação completa: docs/agentes/secdef-classificacao.md
--   (a) usadas em policy/default → sem mudança (anon + authenticated)
--   (b) RPC do front antes do login → sem mudança (anon + authenticated)
--   (b) RPC do front só logado → revoga PUBLIC/anon, mantém authenticated
--   (c)/(d) edge (service_role), cron, trigger, manutenção, sem chamador →
--       revoga PUBLIC/anon/authenticated, mantém service_role
--
-- Funções novas: ALTER DEFAULT PRIVILEGES tira anon do default do schema
-- public e PUBLIC do default global do dono (sem isso anon herda via PUBLIC).
-- Função nova que precise de anon (tela de login) exige GRANT explícito.
-- ============================================

-- Cada item é uma assinatura explícita; o cast ::regprocedure aborta a
-- migration inteira se alguma assinatura não existir (nada fica pela metade).

-- (b) RPC chamada pelo front só com sessão: sai PUBLIC/anon, fica authenticated
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.admin_scan_runs_sla_status()',
    'public.alerts_mttr_by_type(integer)',
    'public.alerts_noisy_scanners(integer)',
    'public.alerts_severity_timeseries(integer)',
    'public.check_budget_availability(uuid,numeric)',
    'public.clear_login_lockout(text)',
    'public.count_legacy_storage_urls()',
    'public.find_approval_rule(numeric,uuid)',
    'public.generate_sequential_number(text,text)',
    'public.get_compras_dashboard_metrics(uuid,text,uuid,uuid)',
    'public.get_cost_center_performance_report()',
    'public.get_effective_approver(uuid,uuid,numeric)',
    'public.get_fornecedores_kpis(uuid)',
    'public.get_pagamentos_kpis(uuid)',
    'public.get_pedidos_kpis(uuid)',
    'public.get_solicitacoes_kpis(uuid)',
    'public.resolve_alert(uuid,text)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', s::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', s::regprocedure);
  END LOOP;
END
$$;

-- (c)/(d) só servidor: sai PUBLIC/anon/authenticated, fica service_role
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    -- (c) edge com service_role (supabase/functions/*: _shared/rate_limit.ts, alert-dispatcher, webauthn-authenticate, workflow-engine)
    'public.alert_subscribers_for(text,text)',
    'public.check_rate_limit(text,text,integer,integer)',
    'public.check_workflow_sod(uuid,uuid,uuid)',
    'public.log_security_event(uuid,text,text,text,text,jsonb,text)',
    -- (c) cron (cron.job, username postgres)
    'public._invoke_edge_function(text)',
    'public._invoke_xbz_sync()',
    'public.apply_lgpd_retention()',
    'public.cleanup_old_integration_outbox()',
    'public.refresh_mv_dashboard_kpis()',
    'public.xbz_sync_watchdog()',
    -- (c) funções de trigger/event trigger (EXECUTE só é checado no CREATE TRIGGER, não no disparo)
    'public.alert_on_outbox_dead()',
    'public.audit_pagamento_changes()',
    'public.audit_user_roles_changes()',
    'public.auto_approve_low_value_solicitacao()',
    'public.auto_block_low_score_supplier()',
    'public.auto_calculate_delivery_penalty()',
    'public.auto_create_pagamento_on_delivery()',
    'public.auto_transition_solicitacao_on_cotacao_approval()',
    'public.auto_transition_solicitacao_on_pedido_delivery()',
    'public.auto_update_supplier_score_on_delivery()',
    'public.calculate_cotacao_scores()',
    'public.check_telemetry_alerts()',
    'public.enforce_audit_integrity()',
    'public.grant_tenant_access_on_insert()',
    'public.handle_new_user()',
    'public.handle_pedido_budget_realization()',
    'public.handle_solicitacao_budget_change()',
    'public.log_budget_changes()',
    'public.log_cotacao_action()',
    'public.recalculate_all_solicitacao_cotacoes()',
    'public.rls_auto_enable()',
    'public.sanitize_audit_metadata()',
    'public.sanitize_session_token()',
    'public.sync_budget_on_payment()',
    'public.trg_cotacao_approved_transition()',
    'public.trg_pedido_entregue_transition()',
    'public.trg_solicitacao_approved_transition()',
    'public.trigger_recalculate_qualification_score()',
    'public.trigger_update_saldo_on_pagamento()',
    'public.trigger_update_saldo_on_pedido()',
    'public.update_cost_center_budget_totals()',
    'public.update_estoque_saldo()',
    'public.update_licitacao_best_bid()',
    -- (c) sem chamador no front, em edge, em policy, view, default ou função SECURITY INVOKER (só chamadas de outras SECURITY DEFINER, que rodam como o dono); t1/test_* são sobras de teste
    'public.calculate_supplier_qualification_score(uuid)',
    'public.fx_convert(numeric,character,character,date)',
    'public.get_dashboard_kpis(date,date)',
    'public.get_failed_login_count(text,integer)',
    'public.get_user_role(uuid)',
    'public.has_permission(uuid,text,text)',
    'public.is_ip_blocked(text)',
    'public.is_ip_whitelisted(text)',
    'public.log_audit_event(text,text,text,text,jsonb,jsonb,jsonb)',
    'public.t1(uuid,text,uuid,uuid)',
    'public.tenants_in_my_group()',
    'public.test_no_defaults(uuid,text,uuid,uuid)',
    'public.test_subselect(uuid,text,uuid)',
    'public.test_with_defaults(uuid,text,uuid,uuid)',
    -- (d) manutenção / diagnóstico / DDL
    'public.archive_audit_logs_older_than(integer)',
    'public.archive_telemetry_logs_older_than(integer)',
    'public.check_escalation()',
    'public.check_secret_rotation_due()',
    'public.cleanup_deadlock_snapshots()',
    'public.cleanup_expired_challenges()',
    'public.cleanup_expired_password_resets()',
    'public.cleanup_health_scan_runs()',
    'public.cleanup_old_audit_logs()',
    'public.cleanup_old_geo_access_logs()',
    'public.cleanup_old_login_attempts()',
    'public.cleanup_old_query_telemetry()',
    'public.cleanup_old_rate_limit_logs()',
    'public.cleanup_old_security_logs()',
    'public.cleanup_old_system_alerts()',
    'public.cleanup_old_telemetry_logs()',
    'public.cleanup_old_temp_file_snapshots()',
    'public.cleanup_old_wal_rate_snapshots()',
    'public.cleanup_old_webhook_events()',
    'public.cron_watchdog()',
    'public.ensure_audit_logs_partition(date)',
    'public.ensure_telemetry_logs_partition(date)',
    'public.get_cron_job_staleness()',
    'public.get_db_health_snapshot()',
    'public.pg_activity_watchdog()',
    'public.recalculate_saldo_comprometido(uuid)',
    'public.run_all_health_scans()',
    'public.scan_autovacuum_starvation(numeric,numeric,integer,integer)',
    'public.scan_blocking_locks()',
    'public.scan_cache_hit_ratio()',
    'public.scan_cache_hit_ratio(numeric,bigint)',
    'public.scan_checkpoint_health(numeric,numeric,numeric,numeric,numeric)',
    'public.scan_connection_saturation()',
    'public.scan_connection_saturation(numeric,numeric)',
    'public.scan_dangerous_statements()',
    'public.scan_deadlocks_and_conflicts(integer,integer,integer)',
    'public.scan_duplicate_indexes()',
    'public.scan_fk_without_cascade()',
    'public.scan_idle_in_transaction()',
    'public.scan_invalid_and_duplicate_indexes()',
    'public.scan_lock_waits()',
    'public.scan_long_running_queries()',
    'public.scan_long_running_transactions()',
    'public.scan_partition_candidates(numeric)',
    'public.scan_replication_lag(integer,integer)',
    'public.scan_replication_slots()',
    'public.scan_rollback_rate()',
    'public.scan_scan_runs_sla()',
    'public.scan_schema_hygiene()',
    'public.scan_security_definer_drift()',
    'public.scan_sequence_exhaustion()',
    'public.scan_slow_query_hotspots()',
    'public.scan_stale_alerts()',
    'public.scan_stale_statistics(integer,numeric)',
    'public.scan_table_bloat(numeric,bigint)',
    'public.scan_table_growth()',
    'public.scan_tables_without_pk(bigint,text[])',
    'public.scan_temp_file_usage(numeric,numeric,numeric,numeric)',
    'public.scan_temp_files_spill()',
    'public.scan_toast_bloat(numeric,numeric,numeric,numeric)',
    'public.scan_txid_wraparound()',
    'public.scan_unindexed_fks()',
    'public.scan_unindexed_foreign_keys()',
    'public.scan_unused_indexes()',
    'public.scan_wal_generation_rate(numeric,numeric,numeric)',
    'public.scan_xid_wraparound()',
    'public.simulate_scan_sla_loop(integer,double precision)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', s::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', s::regprocedure);
  END LOOP;
END
$$;

-- Funções futuras criadas por postgres: sem anon no schema public e sem PUBLIC
-- no default global (o default por schema só soma ao global; sem a segunda
-- linha anon continuaria executando via PUBLIC). authenticated e service_role
-- seguem recebendo EXECUTE pelo default do schema public.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- supabase_admin também tem default em public, mas postgres não é membro dele
-- (pg_has_role = false): o ALTER falha com insufficient_privilege. Tenta e,
-- sem permissão, só avisa — não aborta a migration.
DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'sem permissão para alterar default privileges de supabase_admin (%); fica para o painel/suporte', SQLERRM;
END
$$;
