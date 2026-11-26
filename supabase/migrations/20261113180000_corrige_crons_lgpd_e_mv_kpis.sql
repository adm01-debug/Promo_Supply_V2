-- ============================================
-- MIGRATION: conserta 2 jobs pg_cron que falham em toda execução desde set/2026
-- Data: 2026-11-13
--
-- (a) lgpd_retention_daily (03:15 UTC) -> public.apply_lgpd_retention()
--     Causa: a função (20260712215341_6309002c...sql) filtra por colunas que não
--     existem em produção:
--       - wal_rate_snapshots.created_at  -> a coluna real é captured_at
--       - deadlock_snapshots.created_at  -> a coluna real é captured_at
--       - webhook_events.processed_at    -> não existe; o fim do processamento
--         já é dito pelo status ('processed'/'failed', CHECK da tabela)
--     O primeiro erro aborta a função inteira, então NENHUMA das 12 tabelas tem
--     retenção LGPD aplicada (63 falhas em cron.job_run_details, 0 sucessos).
--     Efeito: a função volta a rodar e APAGA DE VERDADE as linhas fora do prazo
--     (auditoria/segurança/financeiro 5 anos; acesso/rate-limit 180 dias;
--     telemetria/snapshots/webhooks 90 dias; notificações lidas 180 dias).
--     Só essas 3 referências mudam; prazos, tabelas e permissões ficam iguais
--     (CREATE OR REPLACE mantém dono e GRANTs).
--
-- (b) refresh-mv-dashboard-kpis (a cada 15 min) -> public.refresh_mv_dashboard_kpis()
--     Causa: REFRESH ... CONCURRENTLY exige índice único na MV, e em produção a
--     MV não tem nenhum índice (o idx_mv_dashboard_kpis_pk declarado em
--     20260712222620_110cc02b...sql:20 não existe no banco). 6064 falhas, 0 sucessos.
--     Efeito: recria o índice único em (tenant_id, dia) — único por construção,
--     é a chave do GROUP BY da MV. A MV volta a ser atualizada; nada é apagado.
--
-- Idempotente: CREATE OR REPLACE / CREATE UNIQUE INDEX IF NOT EXISTS.
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_lgpd_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_deleted bigint;
  v_started timestamptz := clock_timestamp();
BEGIN
  -- Logs de auditoria / segurança / financeiro — 5 anos (LGPD art.16)
  DELETE FROM public.audit_logs WHERE created_at < now() - interval '5 years';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('audit_logs', v_deleted);

  DELETE FROM public.security_logs WHERE created_at < now() - interval '5 years';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('security_logs', v_deleted);

  DELETE FROM public.financial_audit_logs WHERE created_at < now() - interval '5 years';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('financial_audit_logs', v_deleted);

  -- Acesso / rate-limit — 180 dias
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('login_attempts', v_deleted);

  DELETE FROM public.geo_access_logs WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('geo_access_logs', v_deleted);

  DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('rate_limit_logs', v_deleted);

  -- Telemetria — 90 dias
  DELETE FROM public.telemetry_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('telemetry_logs', v_deleted);

  DELETE FROM public.query_telemetry WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('query_telemetry', v_deleted);

  DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('wal_rate_snapshots', v_deleted);

  DELETE FROM public.deadlock_snapshots WHERE captured_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('deadlock_snapshots', v_deleted);

  -- Webhooks processados — 90 dias
  DELETE FROM public.webhook_events
    WHERE created_at < now() - interval '90 days'
      AND status IN ('processed','failed','skipped');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('webhook_events', v_deleted);

  -- Notificações lidas — 180 dias
  DELETE FROM public.notifications
    WHERE created_at < now() - interval '180 days'
      AND read = true;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('notifications_read', v_deleted);

  -- Trilha em health_scan_runs
  INSERT INTO public.health_scan_runs(scan_name, status, duration_ms, details)
  VALUES (
    'lgpd_retention',
    'success',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
    v_result
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.health_scan_runs(scan_name, status, duration_ms, details)
  VALUES (
    'lgpd_retention',
    'error',
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
    jsonb_build_object('error', SQLERRM, 'partial', v_result)
  );
  RAISE;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_kpis_pk
  ON public.mv_dashboard_kpis (tenant_id, dia);
