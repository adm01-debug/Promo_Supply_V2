
CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
DECLARE
  v_job RECORD;
  v_last_run TIMESTAMPTZ;
  v_last_status TEXT;
  v_sla_minutes INT;
  v_recent_failures INT;
  v_dedup_exists BOOLEAN;
  v_alert_type TEXT;
  v_msg TEXT;
BEGIN
  FOR v_job IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname IN (
      'cleanup-audit-logs','cleanup-security-logs','cleanup-webhook-events',
      'cleanup-integration-outbox','process-outbox','alert-dispatcher','cron-watchdog',
      'cleanup-system-alerts'
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
      SELECT EXISTS (
        SELECT 1 FROM public.system_alerts
        WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'
      ) INTO v_dedup_exists;
      IF NOT v_dedup_exists THEN
        v_msg := format('Job %s não executa desde %s (SLA %s min).',
                        v_job.jobname, COALESCE(v_last_run::text,'nunca'), v_sla_minutes);
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (v_alert_type, 'high', v_msg,
                jsonb_build_object('jobid',v_job.jobid,'jobname',v_job.jobname,'last_run',v_last_run));
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_recent_failures FROM (
      SELECT status FROM cron.job_run_details
      WHERE jobid = v_job.jobid ORDER BY start_time DESC LIMIT 5
    ) t WHERE status <> 'succeeded';

    IF v_recent_failures >= 5 THEN
      v_alert_type := 'cron_watchdog.failing.' || v_job.jobname;
      SELECT EXISTS (
        SELECT 1 FROM public.system_alerts
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
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_system_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.system_alerts
  WHERE (resolved_at IS NOT NULL AND resolved_at < now() - interval '60 days')
     OR (resolved_at IS NULL AND created_at < now() - interval '180 days');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_system_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_system_alerts() TO service_role;

CREATE INDEX IF NOT EXISTS idx_system_alerts_type_created
  ON public.system_alerts (alert_type, created_at DESC);

SELECT cron.schedule(
  'cleanup-system-alerts',
  '45 3 * * *',
  $$SELECT public.cleanup_old_system_alerts();$$
);
