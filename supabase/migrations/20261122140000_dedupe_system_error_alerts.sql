-- ---------------------------------------------------------------------------
-- Telemetria de erro virava 1 alerta por evento, para sempre.
--
-- Causa (medida em prod 2026-11-22): `check_telemetry_alerts()` e TRIGGER
-- AFTER INSERT em `telemetry_logs` e insere um `SYSTEM_ERROR` a cada
-- `logger.error`, sem dedupe e sem resolucao. Estado no momento da correcao:
-- 450 alertas SYSTEM_ERROR abertos, dos quais 421 sao a MESMA mensagem
-- ("[spot-api] spot-api falhou", de 2026-11-13 a hoje). O painel de alertas
-- fica dominado por ruido e um erro realmente novo passa despercebido.
--
-- Correcao: um unico alerta aberto por (mensagem, tenant). Ocorrencias
-- seguintes atualizam metadata.occurrences / metadata.last_seen no alerta
-- existente em vez de criar outro. Quando a mensagem para de acontecer por
-- mais de 24h, o alerta e auto-resolvido pelo cron `cron_watchdog-15min`
-- (que chama `resolve_stale_system_error_alerts()`).
--
-- Semantica preservada: todo `logger.error` continua gerando alerta -- muda
-- apenas a cardinalidade (1 por mensagem aberta, nao 1 por evento). Nenhuma
-- mensagem deixa de ser alertada.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_telemetry_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  IF NEW.level = 'error'::public.log_level THEN
    SELECT id INTO v_alert_id
      FROM public.system_alerts
     WHERE alert_type = 'SYSTEM_ERROR'
       AND resolved_at IS NULL
       AND message = NEW.message
       AND tenant_id IS NOT DISTINCT FROM NEW.tenant_id
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_alert_id IS NULL THEN
      INSERT INTO public.system_alerts (tenant_id, alert_type, severity, message, metadata)
      VALUES (
        NEW.tenant_id,
        'SYSTEM_ERROR',
        'HIGH',
        NEW.message,
        COALESCE(NEW.context, '{}'::jsonb)
          || jsonb_build_object('occurrences', 1, 'last_seen', now())
      );
    ELSE
      UPDATE public.system_alerts
         SET metadata = COALESCE(metadata, '{}'::jsonb)
               || jsonb_build_object(
                    'occurrences', COALESCE((metadata->>'occurrences')::int, 1) + 1,
                    'last_seen', now()
                  ),
             dispatch_status = CASE
               WHEN dispatch_status = 'delivered' THEN 'delivered'
               ELSE dispatch_status
             END
       WHERE id = v_alert_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Resolve alertas de erro que pararam de acontecer por mais de 24h.
CREATE OR REPLACE FUNCTION public.resolve_stale_system_error_alerts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resolved INT;
BEGIN
  WITH stale AS (
    UPDATE public.system_alerts
       SET resolved_at = now()
     WHERE alert_type = 'SYSTEM_ERROR'
       AND resolved_at IS NULL
       AND COALESCE((metadata->>'last_seen')::timestamptz, created_at) < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*) INTO v_resolved FROM stale;
  RETURN v_resolved;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_stale_system_error_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_stale_system_error_alerts() TO service_role;

-- Colapsa o backlog existente: mantem o alerta mais recente de cada mensagem
-- e resolve os duplicados anteriores, somando as ocorrencias no sobrevivente.
WITH ranked AS (
  SELECT id, message, tenant_id, created_at,
         row_number() OVER (
           PARTITION BY message, tenant_id
           ORDER BY created_at DESC
         ) AS rn,
         count(*) OVER (PARTITION BY message, tenant_id) AS total
    FROM public.system_alerts
   WHERE alert_type = 'SYSTEM_ERROR'
     AND resolved_at IS NULL
),
keeper AS (
  UPDATE public.system_alerts a
     SET metadata = COALESCE(a.metadata, '{}'::jsonb)
           || jsonb_build_object('occurrences', r.total, 'collapsed_from', r.total),
         message = a.message
    FROM ranked r
   WHERE a.id = r.id AND r.rn = 1 AND r.total > 1
  RETURNING a.id
)
UPDATE public.system_alerts a
   SET resolved_at = now()
  FROM ranked r
 WHERE a.id = r.id AND r.rn > 1;

-- Liga a auto-resolucao ao vigia de cron ja agendado.
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
  PERFORM public.resolve_stale_system_error_alerts();

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