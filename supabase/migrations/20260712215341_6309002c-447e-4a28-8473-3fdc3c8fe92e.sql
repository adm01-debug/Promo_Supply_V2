
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

  DELETE FROM public.wal_rate_snapshots WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('wal_rate_snapshots', v_deleted);

  DELETE FROM public.deadlock_snapshots WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_result := v_result || jsonb_build_object('deadlock_snapshots', v_deleted);

  -- Webhooks processados — 90 dias
  DELETE FROM public.webhook_events
    WHERE created_at < now() - interval '90 days'
      AND (processed_at IS NOT NULL OR status IN ('processed','failed','skipped'));
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

REVOKE EXECUTE ON FUNCTION public.apply_lgpd_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_lgpd_retention() TO service_role;

-- Agenda diária às 03:15 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lgpd_retention_daily') THEN
    PERFORM cron.unschedule('lgpd_retention_daily');
  END IF;
  PERFORM cron.schedule(
    'lgpd_retention_daily',
    '15 3 * * *',
    $cron$ SELECT public.apply_lgpd_retention(); $cron$
  );
END $$;
