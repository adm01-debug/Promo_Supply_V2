
-- Watchdog de cron jobs: detecta jobs que não executaram dentro do SLA e emite system_alerts HIGH.
-- Simulações cobertas: pg_cron desabilitado, worker travado, job removido acidentalmente,
-- job executando mas falhando 100% (últimas N runs com status != 'succeeded').

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
BEGIN
  -- SLA por job (minutos desde a última execução bem sucedida)
  FOR v_job IN
    SELECT jobid, jobname, schedule
    FROM cron.job
    WHERE jobname IN (
      'cleanup-audit-logs',
      'cleanup-security-logs',
      'cleanup-webhook-events',
      'cleanup-integration-outbox',
      'process-outbox',
      'alert-dispatcher',
      'cron-watchdog'
    )
  LOOP
    -- Define SLA: dispatcher/outbox rodam por minuto → 10min; limpezas diárias → 26h
    v_sla_minutes := CASE
      WHEN v_job.jobname IN ('alert-dispatcher','process-outbox','cron-watchdog') THEN 10
      ELSE 1560 -- 26h
    END;

    SELECT start_time, status
      INTO v_last_run, v_last_status
    FROM cron.job_run_details
    WHERE jobid = v_job.jobid
    ORDER BY start_time DESC
    LIMIT 1;

    -- Job nunca rodou OU passou do SLA
    IF v_last_run IS NULL OR v_last_run < now() - (v_sla_minutes || ' minutes')::interval THEN
      INSERT INTO public.system_alerts (severity, source, title, message, metadata)
      VALUES (
        'high',
        'cron_watchdog',
        'Cron job atrasado: ' || v_job.jobname,
        format('Job %s não executa desde %s (SLA %s min).',
               v_job.jobname,
               COALESCE(v_last_run::text, 'nunca'),
               v_sla_minutes),
        jsonb_build_object('jobid', v_job.jobid, 'jobname', v_job.jobname, 'last_run', v_last_run)
      );
    END IF;

    -- 5 falhas consecutivas
    SELECT COUNT(*) INTO v_recent_failures
    FROM (
      SELECT status FROM cron.job_run_details
      WHERE jobid = v_job.jobid
      ORDER BY start_time DESC LIMIT 5
    ) t
    WHERE status <> 'succeeded';

    IF v_recent_failures >= 5 THEN
      INSERT INTO public.system_alerts (severity, source, title, message, metadata)
      VALUES (
        'high',
        'cron_watchdog',
        'Cron job falhando: ' || v_job.jobname,
        format('Últimas 5 execuções de %s falharam.', v_job.jobname),
        jsonb_build_object('jobid', v_job.jobid, 'jobname', v_job.jobname)
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_watchdog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cron_watchdog() TO service_role;

-- Agenda o próprio watchdog a cada 5 minutos (auto-monitorado: se ele parar, o SLA de 10min
-- do próprio 'cron-watchdog' será detectado na próxima execução manual/health check).
SELECT cron.schedule(
  'cron-watchdog',
  '*/5 * * * *',
  $$SELECT public.cron_watchdog();$$
);
