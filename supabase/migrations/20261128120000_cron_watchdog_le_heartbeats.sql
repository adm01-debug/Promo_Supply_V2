-- ---------------------------------------------------------------------------
-- 172 (EDG-06 parte 1) + 171(c) (EDG-05, complemento SQL): dois pontos cegos do cron_watchdog.
--
-- 173 (EDG-06 parte 2): o pg_net enfileira e devolve na hora, entao
-- cron.job_run_details.status fica 'succeeded' mesmo quando a edge devolve 500
-- -- e quando o segredo do Vault falta o job tambem fica 'succeeded' sem
-- chamar nada. O unico registro durallo do lado da edge e'
-- public.cron_heartbeats (escrito por 9 edges via upsert_cron_heartbeat), e
-- nenhuma funcao SQL, tela ou alerta lia a tabela.
--
-- 171(c) (EDG-05): depois da 182/188 o dispatcher devolve `failed` para a fila
-- e carimba `exhausted` ao esgotar as tentativas. Nos dois casos o alerta
-- travava na entrega e ninguem era avisado -- `dispatch_status` nao era lido
-- por nenhuma consulta de infraestrutura.
--
-- Correcao, toda dentro do cron_watchdog existente (sem job novo, como o plano
-- recomenda -- ja' existe watchdog com dedupe e canal de entrega):
--   a) varre cron_heartbeats cruzando com cron.job ativo:
--      - last_status = 'error'          -> 'cron_heartbeat.error.<job>' (HIGH)
--      - job disparado depois do ultimo heartbeat, com 1h de folga
--                                       -> 'cron_heartbeat.stale.<job>' (HIGH)
--      - fecha sozinho quando o heartbeat volta ao normal.
--      - run_count > 0 exclui os seeds 'unknown' que nunca rodaram, entao nao
--        nasce alerta fantasma de job que nao instrumenta heartbeat.
--   b) conta alertas abertos presos em 'failed'/'exhausted' ha mais de 2h e
--      abre UM alerta de segundo nivel 'alert_dispatch_dead_letter' (dedupe por
--      resolved_at IS NULL). O proprio alerta fica fora da contagem para nao se
--      realimentar.
--
-- O que NAO mudou: o parser de periodo, a ancora cron_watchdog_seen/first_seen,
-- o ramo `stalled` e o ramo `failing` de cron.job_run_details.
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
  v_hb RECORD;
  v_dispatch_travados INT;
  v_dead_letter_type CONSTANT TEXT := 'alert_dispatch_dead_letter';
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

  -- -------------------------------------------------------------------------
  -- 172: cron_heartbeats -- o lado da edge que cron.job_run_details nao ve.
  -- O pg_net devolve na hora, entao o job fica 'succeeded' mesmo com a edge em
  -- 500 ou sem ser chamada. O unico registro duravel e' esta tabela (escrita
  -- por 9 edges via upsert_cron_heartbeat) e nada a lia.
  -- run_count > 0 exclui os seeds 'unknown' que nunca rodaram (nao alerta
  -- fantasma) e o cruzamento com cron.job ativo garante que so' alerta job
  -- que existe de verdade.
  -- -------------------------------------------------------------------------
  FOR v_hb IN
    SELECT h.job_name, h.last_run_at, h.last_status, h.last_error, h.run_count,
           lr.last_run
      FROM public.cron_heartbeats h
      LEFT JOIN LATERAL (
        SELECT max(d.start_time) AS last_run
          FROM cron.job j
          JOIN cron.job_run_details d ON d.jobid = j.jobid
         WHERE j.active
           AND (j.jobname = h.job_name OR j.command ILIKE '%' || h.job_name || '%')
      ) lr ON TRUE
     WHERE h.run_count > 0
     ORDER BY h.job_name
  LOOP
    v_alert_type := 'cron_heartbeat.error.' || v_hb.job_name;

    IF v_hb.last_status = 'error' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
         WHERE alert_type = v_alert_type AND resolved_at IS NULL
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (
          v_alert_type,
          'HIGH',
          format('Edge de cron %s falhou no ultimo run (%s): %s',
                 v_hb.job_name,
                 v_hb.last_run_at,
                 COALESCE(v_hb.last_error, 'sem mensagem')),
          jsonb_build_object(
            'job', v_hb.job_name,
            'source', 'cron_heartbeats',
            'last_status', v_hb.last_status,
            'last_run_at', v_hb.last_run_at,
            'last_error', v_hb.last_error,
            'run_count', v_hb.run_count
          )
        );
      END IF;
    ELSE
      UPDATE public.system_alerts
         SET resolved_at = now()
       WHERE alert_type = v_alert_type AND resolved_at IS NULL;
    END IF;

    -- O job foi disparado pelo pg_cron depois do ultimo heartbeat (folga de
    -- 1h): a edge nao foi executada ou morreu antes de registrar.
    v_alert_type := 'cron_heartbeat.stale.' || v_hb.job_name;

    IF v_hb.last_run IS NOT NULL
       AND v_hb.last_run > v_hb.last_run_at + interval '1 hour' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
         WHERE alert_type = v_alert_type AND resolved_at IS NULL
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
        VALUES (
          v_alert_type,
          'HIGH',
          format('Job %s foi disparado em %s mas o heartbeat do edge parou em %s: a edge nao executou ou falhou antes de registrar',
                 v_hb.job_name, v_hb.last_run, v_hb.last_run_at),
          jsonb_build_object(
            'job', v_hb.job_name,
            'source', 'cron_heartbeats',
            'last_status', v_hb.last_status,
            'last_heartbeat', v_hb.last_run_at,
            'last_job_run', v_hb.last_run,
            'run_count', v_hb.run_count
          )
        );
      ELSE
        UPDATE public.system_alerts
           SET metadata = jsonb_build_object(
                 'job', v_hb.job_name,
                 'source', 'cron_heartbeats',
                 'last_status', v_hb.last_status,
                 'last_heartbeat', v_hb.last_run_at,
                 'last_job_run', v_hb.last_run,
                 'run_count', v_hb.run_count
               )
         WHERE alert_type = v_alert_type AND resolved_at IS NULL;
      END IF;
    ELSE
      UPDATE public.system_alerts
         SET resolved_at = now()
       WHERE alert_type = v_alert_type AND resolved_at IS NULL;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 171(c): alerta que travou na entrega sem avisar ninguem.
  -- Depois da 182/188 o dispatcher devolve `failed` para a fila e carimba
  -- `exhausted` ao esgotar as tentativas -- nos dois casos o alerta morria em
  -- silencio no banco. A folga de 2h evita alertar em cima de uma falha
  -- transitoria que o proximo ciclo resolve. O proprio alerta de segundo nivel
  -- fica fora da contagem para nao se realimentar.
  -- -------------------------------------------------------------------------
  SELECT count(*)::int
    INTO v_dispatch_travados
    FROM public.system_alerts
   WHERE resolved_at IS NULL
     AND alert_type <> v_dead_letter_type
     AND dispatch_status IN ('failed', 'exhausted')
     AND created_at < now() - interval '2 hours';

  IF v_dispatch_travados > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_dead_letter_type AND resolved_at IS NULL
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_dead_letter_type,
        'HIGH',
        format('%s alertas abertos nao foram entregues a nenhum canal (dispatch_status failed/exhausted ha mais de 2h)',
               v_dispatch_travados),
        jsonb_build_object(
          'pending_alerts', v_dispatch_travados,
          'checked_at', now(),
          'source', 'cron_watchdog'
        )
      );
    ELSE
      UPDATE public.system_alerts
         SET metadata = jsonb_build_object(
               'pending_alerts', v_dispatch_travados,
               'checked_at', now(),
               'source', 'cron_watchdog'
             )
       WHERE alert_type = v_dead_letter_type AND resolved_at IS NULL;
    END IF;
  ELSE
    UPDATE public.system_alerts
       SET resolved_at = now()
     WHERE alert_type = v_dead_letter_type AND resolved_at IS NULL;
  END IF;
END;
$$;
