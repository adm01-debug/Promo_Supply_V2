-- ---------------------------------------------------------------------------
-- cron_watchdog(): vigiava o vazio.
--
-- Causa (medida em prod 2026-11-22): a versao de 20260711191946 filtra
--   WHERE jobname IN ('cleanup-audit-logs','cleanup-security-logs',
--     'cleanup-webhook-events','cleanup-integration-outbox','process-outbox',
--     'alert-dispatcher','cron-watchdog','cleanup-system-alerts',
--     'cleanup-telemetry-logs','cleanup-login-attempts','cleanup-rate-limit-logs',
--     'cleanup-geo-access-logs','cleanup-query-telemetry')
-- Dos 13 nomes, 11 nao existem em cron.job (os reais sao
-- 'alert-dispatcher-1min', 'outbox-worker-1min', 'cleanup-integration-outbox-daily'...).
-- Restavam 2 jobs vigiados de 26 ativos. Pior: a funcao NUNCA foi agendada --
-- nenhum job em cron.job executa public.cron_watchdog(), entao mesmo esses 2
-- nunca eram checados. Resultado: 3 jobs (weekly-procurement-report,
-- weekly-summary-report-job, cotacao-followup-check) estao agendados desde
-- 20261121153000 e nunca rodaram, sem nenhum alerta.
--
-- Correcao: (1) vigiar TODO job ativo, sem lista de nomes que envelhece;
-- (2) derivar o SLA do proprio `schedule` (deterministico) em vez de constante
-- por nome -- SLA=3x o periodo do cron, minimo 10 min, cobrindo jitter do
-- agendador; (3) auto-resolver o alerta quando o job volta ao normal, para nao
-- acumular HIGH eterno como os 450 SYSTEM_ERROR da telemetria.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','cron','extensions'
AS $$
DECLARE
  v_job RECORD;
  v_sla_seg INT;
  v_idade_seg INT;
  v_recent_failures INT;
  v_alert_type TEXT;
BEGIN
  FOR v_job IN
    SELECT j.jobid, j.jobname, j.schedule,
           lr.last_run
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT max(d.start_time) AS last_run
          FROM cron.job_run_details d
         WHERE d.jobid = j.jobid
      ) lr ON TRUE
     WHERE j.active
  LOOP
    -- SLA derivado do schedule: minutos/horas/dias/semanas por campo cron.
    v_sla_seg := CASE
      WHEN v_job.schedule ~ '^\S+\s+\S+\s+\*\s+\*\s+\*\s*$' THEN
        CASE
          WHEN split_part(v_job.schedule, ' ', 2) = '*' THEN
            CASE
              WHEN split_part(v_job.schedule, ' ', 1) = '*' THEN 60
              WHEN split_part(v_job.schedule, ' ', 1) ~ '^\*/[0-9]+$'
                THEN substring(split_part(v_job.schedule, ' ', 1) FROM 3)::int * 60
              ELSE 3600
            END
          WHEN split_part(v_job.schedule, ' ', 2) ~ '^\*/[0-9]+$'
            THEN substring(split_part(v_job.schedule, ' ', 2) FROM 3)::int * 3600
          ELSE 86400
        END
      WHEN split_part(v_job.schedule, ' ', 3) ~ '^\*/[0-9]+$'
        THEN substring(split_part(v_job.schedule, ' ', 3) FROM 3)::int * 86400
      WHEN split_part(v_job.schedule, ' ', 3) <> '*' THEN 604800
      WHEN split_part(v_job.schedule, ' ', 5) ~ '^\*/[0-9]+$'
        THEN substring(split_part(v_job.schedule, ' ', 5) FROM 3)::int * 86400
      ELSE 2592000
    END;
    v_sla_seg := greatest(v_sla_seg * 3, 600);

    v_idade_seg := CASE
      WHEN v_job.last_run IS NULL THEN NULL
      ELSE extract(epoch FROM now() - v_job.last_run)::int
    END;

    v_alert_type := 'cron_watchdog.stalled.' || v_job.jobname;

    IF v_job.last_run IS NULL OR v_idade_seg > v_sla_seg THEN
      -- Dedupe: apenas 1 alerta aberto por job (resolved_at IS NULL).
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
         WHERE alert_type = v_alert_type AND resolved_at IS NULL
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (
          v_alert_type,
          'HIGH',
          format('Cron job %s parado (ultima execucao: %s, SLA: %s min, schedule: %s)',
                 v_job.jobname,
                 COALESCE(v_job.last_run::text, 'nunca'),
                 v_sla_seg / 60,
                 v_job.schedule),
          jsonb_build_object(
            'job', v_job.jobname,
            'schedule', v_job.schedule,
            'last_run', v_job.last_run,
            'sla_minutes', v_sla_seg / 60,
            'age_seconds', v_idade_seg
          )
        );
      ELSE
        UPDATE public.system_alerts
           SET metadata = jsonb_build_object(
                 'job', v_job.jobname,
                 'schedule', v_job.schedule,
                 'last_run', v_job.last_run,
                 'sla_minutes', v_sla_seg / 60,
                 'age_seconds', v_idade_seg
               )
         WHERE alert_type = v_alert_type AND resolved_at IS NULL;
      END IF;
    ELSE
      -- Job voltou ao normal: fecha o alerta aberto em vez de deixar HIGH eterno.
      UPDATE public.system_alerts
         SET resolved_at = now()
       WHERE alert_type = v_alert_type AND resolved_at IS NULL;
    END IF;

    SELECT count(*) INTO v_recent_failures
      FROM (
        SELECT status FROM cron.job_run_details
         WHERE jobid = v_job.jobid
         ORDER BY start_time DESC LIMIT 5
      ) s
     WHERE status = 'failed';

    IF v_recent_failures = 5 THEN
      v_alert_type := 'cron_watchdog.failing.' || v_job.jobname;
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
         WHERE alert_type = v_alert_type AND resolved_at IS NULL
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (
          v_alert_type,
          'HIGH',
          format('Cron job %s falhou 5 vezes seguidas', v_job.jobname),
          jsonb_build_object('job', v_job.jobname, 'schedule', v_job.schedule)
        );
      END IF;
    ELSE
      UPDATE public.system_alerts
         SET resolved_at = now()
       WHERE alert_type = 'cron_watchdog.failing.' || v_job.jobname
         AND resolved_at IS NULL;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.cron_watchdog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_watchdog() TO service_role;

-- Agenda o vigia (antes: funcao existia e nunca era chamada).
SELECT cron.schedule('cron-watchdog-15min', '*/15 * * * *', $$SELECT public.cron_watchdog();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-watchdog-15min');

-- Resolve os alarmes orfaos dos nomes de job que nao existem mais.
UPDATE public.system_alerts
   SET resolved_at = now()
 WHERE alert_type LIKE 'cron_watchdog.%'
   AND resolved_at IS NULL;
