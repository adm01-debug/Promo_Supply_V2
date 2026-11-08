
CREATE OR REPLACE FUNCTION public.scan_scan_runs_sla()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row     record;
  v_sev     text;
  v_alert   text;
  v_msg     text;
  v_opened  integer := 0;
  v_exists  boolean;
  v_started timestamptz := clock_timestamp();
BEGIN
  FOR v_row IN
    SELECT scan_name, health, last_run_at, age_minutes, sla_minutes, last_status
    FROM public.admin_scan_runs_sla_status()
    WHERE health IN ('late','critical')
  LOOP
    v_sev   := CASE WHEN v_row.health = 'critical' THEN 'CRITICAL' ELSE 'HIGH' END;
    v_alert := 'scan_sla_' || v_row.health;

    -- Deduplicação: já existe alerta aberto do mesmo tipo p/ este scanner?
    SELECT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = v_alert
        AND resolved_at IS NULL
        AND metadata->>'scan_name' = v_row.scan_name
    ) INTO v_exists;

    IF v_exists THEN
      CONTINUE;
    END IF;

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
      v_alert,
      v_sev,
      v_msg,
      jsonb_build_object(
        'scan_name',   v_row.scan_name,
        'health',      v_row.health,
        'age_minutes', v_row.age_minutes,
        'sla_minutes', v_row.sla_minutes,
        'last_status', v_row.last_status,
        'last_run_at', v_row.last_run_at
      )
    );
    v_opened := v_opened + 1;
  END LOOP;

  -- Trilha em health_scan_runs
  INSERT INTO public.health_scan_runs (scan_name, status, duration_ms, details, findings)
  VALUES (
    'scan_scan_runs_sla',
    'ok',
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
    jsonb_build_object('opened_alerts', v_opened),
    v_opened
  );

  RETURN v_opened;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_scan_runs_sla() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_scan_runs_sla() TO service_role;

COMMENT ON FUNCTION public.scan_scan_runs_sla() IS
  'Onda 73 (R-13): abre alertas em system_alerts para scanners fora do SLA (late/critical) com deduplicação por scan_name.';

-- pg_cron: rodar a cada 10 minutos
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
