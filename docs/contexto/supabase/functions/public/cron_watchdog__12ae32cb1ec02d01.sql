CREATE OR REPLACE FUNCTION public.cron_watchdog()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron', 'extensions'
AS $function$
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
      'cleanup-rate-limit-logs','cleanup-geo-access-logs','cleanup-query-telemetry'
    )
  LOOP
    v_sla_minutes := CASE
      WHEN v_job.jobname IN ('process-outbox','alert-dispatcher','cron-watchdog') THEN 10
      ELSE 1560  -- ~26h para jobs diários
    END;

    SELECT start_time, status INTO v_last_run, v_last_status
    FROM cron.job_run_details
    WHERE jobid = v_job.jobid
    ORDER BY start_time DESC LIMIT 1;

    -- Job nunca rodou ou passou do SLA
    IF v_last_run IS NULL OR v_last_run < now() - make_interval(mins => v_sla_minutes) THEN
      v_alert_type := 'cron_watchdog.stalled.' || v_job.jobname;
      SELECT EXISTS(
        SELECT 1 FROM public.system_alerts
        WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'
      ) INTO v_dedup_exists;
      IF NOT v_dedup_exists THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (v_alert_type, 'HIGH',
          format('Cron job %s stalled (last run: %s, SLA: %s min)', v_job.jobname, COALESCE(v_last_run::text,'never'), v_sla_minutes),
          jsonb_build_object('job', v_job.jobname, 'last_run', v_last_run, 'sla_minutes', v_sla_minutes));
      END IF;
    END IF;

    -- 5 falhas consecutivas
    SELECT COUNT(*) INTO v_recent_failures
    FROM (SELECT status FROM cron.job_run_details WHERE jobid = v_job.jobid ORDER BY start_time DESC LIMIT 5) s
    WHERE status = 'failed';
    IF v_recent_failures = 5 THEN
      v_alert_type := 'cron_watchdog.failing.' || v_job.jobname;
      SELECT EXISTS(
        SELECT 1 FROM public.system_alerts
        WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'
      ) INTO v_dedup_exists;
      IF NOT v_dedup_exists THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (v_alert_type, 'HIGH',
          format('Cron job %s failed 5 times in a row', v_job.jobname),
          jsonb_build_object('job', v_job.jobname));
      END IF;
    END IF;
  END LOOP;
END;
$function$
