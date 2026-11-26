
-- Retenção: telemetria 30d, login_attempts 90d, rate_limit_logs 30d, geo_access_logs 90d

CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry_logs()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.telemetry_logs
     WHERE created_at < now() - INTERVAL '30 days'
       AND level <> 'ERROR'
    RETURNING 1
  ) SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.login_attempts
     WHERE created_at < now() - INTERVAL '90 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.rate_limit_logs
     WHERE created_at < now() - INTERVAL '30 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_old_geo_access_logs()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.geo_access_logs
     WHERE created_at < now() - INTERVAL '90 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END; $$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_telemetry_logs()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_login_attempts()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limit_logs()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_geo_access_logs()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_telemetry_logs()  TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts()  TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_geo_access_logs() TO service_role;

-- Índices BRIN (baratos, ideais para retenção por data em tabelas append-only)
CREATE INDEX IF NOT EXISTS brin_telemetry_logs_created  ON public.telemetry_logs   USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS brin_login_attempts_created  ON public.login_attempts   USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS brin_rate_limit_logs_created ON public.rate_limit_logs  USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS brin_geo_access_logs_created ON public.geo_access_logs  USING BRIN (created_at);

-- Agenda: escalonado entre 03:50-04:05 UTC para evitar spike simultâneo
SELECT cron.schedule('cleanup-telemetry-logs',  '50 3 * * *', $$SELECT public.cleanup_old_telemetry_logs();$$);
SELECT cron.schedule('cleanup-login-attempts',  '55 3 * * *', $$SELECT public.cleanup_old_login_attempts();$$);
SELECT cron.schedule('cleanup-rate-limit-logs', '00 4 * * *', $$SELECT public.cleanup_old_rate_limit_logs();$$);
SELECT cron.schedule('cleanup-geo-access-logs', '05 4 * * *', $$SELECT public.cleanup_old_geo_access_logs();$$);

-- Adiciona esses novos jobs ao watchdog
CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
DECLARE
  v_job RECORD; v_last_run TIMESTAMPTZ; v_last_status TEXT;
  v_sla_minutes INT; v_recent_failures INT; v_dedup_exists BOOLEAN;
  v_alert_type TEXT;
BEGIN
  FOR v_job IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname IN (
      'cleanup-audit-logs','cleanup-security-logs','cleanup-webhook-events',
      'cleanup-integration-outbox','process-outbox','alert-dispatcher','cron-watchdog',
      'cleanup-system-alerts','cleanup-telemetry-logs','cleanup-login-attempts',
      'cleanup-rate-limit-logs','cleanup-geo-access-logs'
    )
  LOOP
    v_sla_minutes := CASE
      WHEN v_job.jobname IN ('alert-dispatcher','process-outbox','cron-watchdog') THEN 10
      ELSE 1560
    END;

    SELECT start_time, status INTO v_last_run, v_last_status
    FROM cron.job_run_details WHERE jobid = v_job.jobid
    ORDER BY start_time DESC LIMIT 1;

    IF v_last_run IS NULL OR v_last_run < now() - (v_sla_minutes || ' minutes')::interval THEN
      v_alert_type := 'cron_watchdog.stalled.' || v_job.jobname;
      SELECT EXISTS (SELECT 1 FROM public.system_alerts
        WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'
      ) INTO v_dedup_exists;
      IF NOT v_dedup_exists THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (v_alert_type, 'high',
                format('Job %s não executa desde %s (SLA %s min).',
                       v_job.jobname, COALESCE(v_last_run::text,'nunca'), v_sla_minutes),
                jsonb_build_object('jobid',v_job.jobid,'jobname',v_job.jobname,'last_run',v_last_run));
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_recent_failures FROM (
      SELECT status FROM cron.job_run_details
      WHERE jobid = v_job.jobid ORDER BY start_time DESC LIMIT 5
    ) t WHERE status <> 'succeeded';

    IF v_recent_failures >= 5 THEN
      v_alert_type := 'cron_watchdog.failing.' || v_job.jobname;
      SELECT EXISTS (SELECT 1 FROM public.system_alerts
        WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'
      ) INTO v_dedup_exists;
      IF NOT v_dedup_exists THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (v_alert_type, 'high',
                format('Últimas 5 execuções de %s falharam.', v_job.jobname),
                jsonb_build_object('jobid',v_job.jobid,'jobname',v_job.jobname));
      END IF;
    END IF;
  END LOOP;
END; $$;
