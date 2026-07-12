
DROP FUNCTION IF EXISTS public.scan_scan_runs_sla();

CREATE OR REPLACE FUNCTION public.scan_scan_runs_sla()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row      record;
  v_sev      text;
  v_alert    text;
  v_msg      text;
  v_opened   integer := 0;
  v_resolved integer := 0;
  v_exists   boolean;
  v_started  timestamptz := clock_timestamp();
BEGIN
  FOR v_row IN
    SELECT scan_name, health, last_run_at, age_minutes, sla_minutes, last_status
    FROM public.admin_scan_runs_sla_status()
    WHERE health IN ('late','critical')
  LOOP
    v_sev   := CASE WHEN v_row.health = 'critical' THEN 'CRITICAL' ELSE 'HIGH' END;
    v_alert := 'scan_sla_' || v_row.health;

    SELECT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = v_alert
        AND resolved_at IS NULL
        AND metadata->>'scan_name' = v_row.scan_name
    ) INTO v_exists;

    IF v_exists THEN CONTINUE; END IF;

    v_msg := format(
      'Scanner "%s" %s do SLA: última execução %s (idade %s min, SLA %s min, status %s).',
      v_row.scan_name,
      CASE WHEN v_row.health = 'critical' THEN 'CRITICAMENTE atrasado' ELSE 'atrasado' END,
      COALESCE(to_char(v_row.last_run_at,'YYYY-MM-DD HH24:MI'),'nunca'),
      COALESCE(v_row.age_minutes::text,'∞'),
      COALESCE(v_row.sla_minutes::text,'—'),
      COALESCE(v_row.last_status,'—')
    );

    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES (
      v_alert, v_sev, v_msg,
      jsonb_build_object(
        'scan_name',   v_row.scan_name,
        'health',      v_row.health,
        'age_minutes', v_row.age_minutes,
        'sla_minutes', v_row.sla_minutes,
        'last_status', v_row.last_status,
        'last_run_at', v_row.last_run_at,
        'auto_managed', true
      )
    );
    v_opened := v_opened + 1;
  END LOOP;

  WITH current_state AS (
    SELECT scan_name, health FROM public.admin_scan_runs_sla_status()
  ),
  to_resolve AS (
    SELECT a.id, a.alert_type, cs.health AS current_health
    FROM public.system_alerts a
    LEFT JOIN current_state cs
      ON cs.scan_name = a.metadata->>'scan_name'
    WHERE a.resolved_at IS NULL
      AND a.alert_type IN ('scan_sla_late','scan_sla_critical')
      AND a.metadata ? 'scan_name'
      AND (
        cs.health = 'ok'
        OR cs.health IS NULL
        OR (a.alert_type = 'scan_sla_critical' AND cs.health = 'late')
      )
  ),
  updated AS (
    UPDATE public.system_alerts a
       SET resolved_at   = now(),
           dispatch_status = COALESCE(a.dispatch_status,'auto_resolved'),
           metadata      = COALESCE(a.metadata,'{}'::jsonb) ||
                           jsonb_build_object(
                             'auto_resolved_at', now(),
                             'auto_resolved_reason',
                                CASE
                                  WHEN tr.current_health IS NULL THEN 'scanner_removed_from_catalog'
                                  WHEN tr.current_health = 'ok'  THEN 'scanner_back_to_ok'
                                  ELSE 'severity_downgraded_to_' || tr.current_health
                                END
                           )
      FROM to_resolve tr
     WHERE a.id = tr.id
    RETURNING 1
  )
  SELECT count(*)::int INTO v_resolved FROM updated;

  INSERT INTO public.health_scan_runs (scan_name, status, duration_ms, details, findings)
  VALUES (
    'scan_scan_runs_sla',
    'ok',
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
    jsonb_build_object('opened_alerts', v_opened, 'resolved_alerts', v_resolved),
    v_opened
  );

  RETURN jsonb_build_object('opened', v_opened, 'resolved', v_resolved);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_scan_runs_sla() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_scan_runs_sla() TO service_role;

COMMENT ON FUNCTION public.scan_scan_runs_sla() IS
  'Onda 74 (R-14): abre alertas de SLA (late/critical) e auto-resolve quando scanner volta ao OK ou regride de severidade.';

-- Reagendar cron (a função foi dropada, então cron precisa apontar para a nova)
DO $$
BEGIN
  PERFORM cron.unschedule('scan-scan-runs-sla');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'scan-scan-runs-sla',
  '*/10 * * * *',
  $cron$ SELECT public.scan_scan_runs_sla(); $cron$
);
