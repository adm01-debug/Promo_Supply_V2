CREATE OR REPLACE FUNCTION public.cron_watchdog()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron', 'extensions'
AS $function$
DECLARE
  v_job RECORD;
  v_periodo_seg INT;
  v_sla_seg INT;
  v_idade_seg INT;
  v_base TIMESTAMPTZ;
  v_recent_failures INT;
  v_alert_type TEXT;
BEGIN
  PERFORM public.resolve_stale_system_error_alerts();

  -- Ancora os jobs novos; sem isso nao ha como saber desde quando observamos.
  INSERT INTO public.cron_watchdog_seen (jobid, jobname)
  SELECT j.jobid, j.jobname FROM cron.job j WHERE j.active
  ON CONFLICT (jobid) DO NOTHING;

  -- Esquece jobs que deixaram de existir/ativos.
  DELETE FROM public.cron_watchdog_seen s
   WHERE NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.jobid = s.jobid AND j.active);

  FOR v_job IN
    SELECT j.jobid, j.jobname, j.schedule, s.first_seen,
           lr.last_run
      FROM cron.job j
      JOIN public.cron_watchdog_seen s ON s.jobid = j.jobid
      LEFT JOIN LATERAL (
        SELECT max(d.start_time) AS last_run
          FROM cron.job_run_details d
         WHERE d.jobid = j.jobid
      ) lr ON TRUE
     WHERE j.active
  LOOP
    -- Periodo real pelo campo mais especifico do cron (dow > dom > mes).
    v_periodo_seg := CASE
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
      WHEN split_part(v_job.schedule, ' ', 5) <> '*' THEN 604800          -- semanal
      WHEN split_part(v_job.schedule, ' ', 6) <> '*' THEN 2592000         -- mensal por mes
      WHEN split_part(v_job.schedule, ' ', 3) ~ '^\*/[0-9]+$'
        THEN substring(split_part(v_job.schedule, ' ', 3) FROM 3)::int * 86400
      WHEN split_part(v_job.schedule, ' ', 3) <> '*' THEN 2678400         -- mensal por dia
      ELSE 2592000
    END;

    v_sla_seg := greatest(v_periodo_seg * 3, 600);

    IF v_job.last_run IS NULL THEN
      -- Sem historico: usa a ancora, com folga de 1 periodo + 1h, para nao
      -- acusar parada antes do primeiro slot esperado.
      v_base := v_job.first_seen;
      v_idade_seg := extract(epoch FROM now() - v_base)::int;
      v_sla_seg := greatest(v_periodo_seg + 3600, 600);
    ELSE
      v_idade_seg := extract(epoch FROM now() - v_job.last_run)::int;
    END IF;

    v_alert_type := 'cron_watchdog.stalled.' || v_job.jobname;

    IF v_idade_seg > v_sla_seg THEN
      -- Dedupe: apenas 1 alerta aberto por job (resolved_at IS NULL).
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
         WHERE alert_type = v_alert_type AND resolved_at IS NULL
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (
          v_alert_type,
          'HIGH',
          format('Cron job %s parado (ultima execucao: %s, observado ha: %sh, SLA: %s min, schedule: %s)',
                 v_job.jobname,
                 COALESCE(v_job.last_run::text, 'nunca'),
                 GREATEST(v_idade_seg, 0) / 3600,
                 v_sla_seg / 60,
                 v_job.schedule),
          jsonb_build_object(
            'job', v_job.jobname,
            'schedule', v_job.schedule,
            'last_run', v_job.last_run,
            'first_seen', v_job.first_seen,
            'period_seconds', v_periodo_seg,
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
                 'first_seen', v_job.first_seen,
                 'period_seconds', v_periodo_seg,
                 'sla_minutes', v_sla_seg / 60,
                 'age_seconds', v_idade_seg
               )
         WHERE alert_type = v_alert_type AND resolved_at IS NULL;
      END IF;
    ELSE
      -- Job novo ou voltou ao normal: fecha o alerta aberto.
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
$function$
