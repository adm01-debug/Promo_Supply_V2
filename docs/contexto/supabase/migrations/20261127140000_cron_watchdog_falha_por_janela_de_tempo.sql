-- ---------------------------------------------------------------------------
-- cron_watchdog(): o alerta de "cron falhando" era inalcancavel para os 8 jobs
-- semanais ativos em producao.
--
-- Defeito medido: o ramo de falha contava `status='failed'` nas 5 ULTIMAS
-- execucoes (`ORDER BY start_time DESC LIMIT 5`) e exigia as 5. Mas o proprio
-- pg_cron tem o job 110 (`limpa-historico-cron-semanal`, '17 4 * * 0') apagando
-- cron.job_run_details com mais de 7 dias -- ultima rodada registrada no
-- snapshot: `DELETE 11717`. Um job semanal tem no maximo 1 linha nessa janela
-- (10 weekly-vacuum-analyze, 11 reset-pg-stat-statements, 14
-- cleanup-checkpoint-snapshots, 32 spot-api-sync-customization, 110, 111
-- scan-particoes-semanal, 119 weekly-procurement-report, 120
-- weekly-summary-report-job), entao `count(*)` nunca chegava a 5 e o alerta
-- nunca podia existir -- nem com o job falhando toda semana para sempre.
--
-- Correcao: janela por TEMPO em vez de contagem. A janela e' 3 periodos,
-- limitada pela retencao de 7 dias (v_janela_seg := least(periodo*3, 604800)),
-- e o alerta sai quando TODAS as execucoes observadas na janela falharam:
--   - alta frequencia (1 min a 1 h): 3 execucoes na janela, exige 2 falhas --
--     uma falha isolada nao alerta;
--   - semanal/mensal: a janela observavel so cabe 1 execucao, entao a unica
--     execucao visivel ja e' sinal suficiente (v_min_falhas = 1).
-- Linhas com status 'running' ficam fora da contagem para nao diluir o total.
-- O dedupe por alerta aberto (`resolved_at IS NULL`) e o fechamento quando a
-- janela volta a ter sucesso foram mantidos como estavam.
--
-- O que NAO mudou, de proposito: o parser de periodo (ja corrigido na #270), a
-- ancora cron_watchdog_seen/first_seen, o ramo `stalled` e o job 110. O ramo
-- `stalled` NAO passou a olhar so `status='succeeded'`: com a janela por tempo
-- ele ja' alerta o job que parou de rodar, e um filtro por status faria a mesma
-- falha recorrente abrir dois alertas (stalled + failing) -- duplicidade que e'
-- justamente o defeito do JOB-06.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','cron','extensions'
AS $$
DECLARE
  v_job RECORD;
  v_periodo_seg INT;
  v_sla_seg INT;
  v_idade_seg INT;
  v_base TIMESTAMPTZ;
  v_falhas_janela INT;
  v_execucoes_janela INT;
  v_janela_seg INT;
  v_min_falhas INT;
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

    -- Janela por TEMPO, nao por contagem: o job 110 apaga cron.job_run_details
    -- com mais de 7 dias, entao um job semanal (periodo 604800s) nunca tem 5
    -- linhas visiveis e o teste antigo (5 falhas nas ultimas 5 execucoes) era
    -- inalcancavel para os 8 jobs semanais. A janela e' 3 periodos, limitada
    -- pela retencao de 7 dias, para sempre haver dado observavel.
    v_janela_seg := least(v_periodo_seg * 3, 604800);

    SELECT (count(*) FILTER (WHERE d.status = 'failed'))::int,
           (count(*) FILTER (WHERE d.status <> 'running'))::int
      INTO v_falhas_janela, v_execucoes_janela
      FROM cron.job_run_details d
     WHERE d.jobid = v_job.jobid
       AND d.start_time > now() - make_interval(secs => v_janela_seg);

    -- Se a janela observavel nao comporta 2 execucoes (semanal/mensal), a unica
    -- execucao visivel ja e' sinal suficiente; nos demais casos exige 2 falhas,
    -- para nao alertar por uma falha isolada de job de alta frequencia.
    v_min_falhas := CASE WHEN v_periodo_seg * 2 > v_janela_seg THEN 1 ELSE 2 END;

    IF v_execucoes_janela > 0
       AND v_falhas_janela = v_execucoes_janela
       AND v_falhas_janela >= v_min_falhas THEN
      v_alert_type := 'cron_watchdog.failing.' || v_job.jobname;
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
         WHERE alert_type = v_alert_type AND resolved_at IS NULL
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (
          v_alert_type,
          'HIGH',
          format('Cron job %s falhou em todas as %s execucoes dos ultimos %s min (schedule: %s)',
                 v_job.jobname,
                 v_falhas_janela,
                 v_janela_seg / 60,
                 v_job.schedule),
          jsonb_build_object(
            'job', v_job.jobname,
            'schedule', v_job.schedule,
            'failures_in_window', v_falhas_janela,
            'runs_in_window', v_execucoes_janela,
            'window_seconds', v_janela_seg,
            'period_seconds', v_periodo_seg
          )
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
$$
