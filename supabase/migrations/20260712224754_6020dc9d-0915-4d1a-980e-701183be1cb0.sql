
CREATE OR REPLACE FUNCTION public.scan_scan_runs_sla()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_opened   integer := 0;
  v_resolved integer := 0;
  v_started  timestamptz := clock_timestamp();
  v_got_lock boolean;
BEGIN
  SELECT pg_try_advisory_xact_lock(hashtext('scan_scan_runs_sla')) INTO v_got_lock;
  IF NOT v_got_lock THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason',  'concurrent_run_detected',
      'opened',  0,
      'resolved',0
    );
  END IF;

  WITH src AS (
    SELECT scan_name, health, last_run_at, age_minutes, sla_minutes, last_status
    FROM public.admin_scan_runs_sla_status()
    WHERE health IN ('late','critical')
  ),
  ins AS (
    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    SELECT
      'scan_sla_' || s.health,
      CASE WHEN s.health = 'critical' THEN 'CRITICAL' ELSE 'HIGH' END,
      format(
        'Scanner "%s" %s do SLA: última execução %s (idade %s min, SLA %s min, status %s).',
        s.scan_name,
        CASE WHEN s.health = 'critical' THEN 'CRITICAMENTE atrasado' ELSE 'atrasado' END,
        COALESCE(to_char(s.last_run_at,'YYYY-MM-DD HH24:MI'),'nunca'),
        COALESCE(s.age_minutes::text,'∞'),
        COALESCE(s.sla_minutes::text,'—'),
        COALESCE(s.last_status,'—')
      ),
      jsonb_build_object(
        'scan_name',   s.scan_name,
        'health',      s.health,
        'age_minutes', s.age_minutes,
        'sla_minutes', s.sla_minutes,
        'last_status', s.last_status,
        'last_run_at', s.last_run_at,
        'auto_managed', true
      )
    FROM src s
    ON CONFLICT (alert_type, ((metadata->>'scan_name')))
      WHERE resolved_at IS NULL
        AND alert_type IN ('scan_sla_late','scan_sla_critical')
        AND metadata ? 'scan_name'
    DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO v_opened FROM ins;

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

  INSERT INTO public.health_scan_runs (
    scan_name, scanner_name, status, started_at, finished_at,
    duration_ms, total_scanners, ok_count, failed_count, findings_count, details, results
  )
  VALUES (
    'scan_scan_runs_sla', 'scan_scan_runs_sla', 'ok',
    v_started, clock_timestamp(),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::int,
    1, 1, 0,
    v_opened,
    jsonb_build_object('opened', v_opened, 'resolved_alerts', v_resolved),
    '[]'::jsonb
  );

  RETURN jsonb_build_object(
    'opened',   v_opened,
    'resolved', v_resolved,
    'skipped',  false
  );
END;
$function$;
