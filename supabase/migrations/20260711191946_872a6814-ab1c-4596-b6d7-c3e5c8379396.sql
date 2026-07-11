
-- Remove o trigger anti-padrão: cleanup executado a cada INSERT em query_telemetry
-- gera IO/WAL amplificado e locks. Substitui por cron diário.
DROP TRIGGER IF EXISTS trig_cleanup_telemetry ON public.query_telemetry;

-- Substitui a função por versão idempotente e nomeada de forma consistente com
-- as demais rotinas de retenção. Preserva compatibilidade renomeando a antiga.
CREATE OR REPLACE FUNCTION public.cleanup_old_query_telemetry()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_deleted integer;
BEGIN
  WITH d AS (
    DELETE FROM public.query_telemetry
     WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_query_telemetry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_query_telemetry() TO service_role;

-- Índice BRIN em created_at para tornar o DELETE por faixa temporal barato.
CREATE INDEX IF NOT EXISTS brin_query_telemetry_created_at
  ON public.query_telemetry USING BRIN (created_at) WITH (pages_per_range = 32);

-- Autovacuum agressivo para tabela append-only de alto churn.
ALTER TABLE public.query_telemetry SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold    = 1000,
  autovacuum_analyze_scale_factor= 0.05,
  autovacuum_vacuum_cost_delay   = 10
);

ANALYZE public.query_telemetry;

-- Agenda cron diário 03:55 UTC (janela livre entre os demais cleanups já agendados).
SELECT cron.schedule(
  'cleanup-query-telemetry',
  '55 3 * * *',
  $$SELECT public.cleanup_old_query_telemetry();$$
);

-- Atualiza o watchdog para monitorar o novo job (append à lista existente).
CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','cron','extensions'
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
$$;
