-- Onda 15: Scanner de Deadlocks e Conflitos de Lock
-- Objetivo: detectar aumento anormal de deadlocks e conflitos via pg_stat_database

CREATE TABLE IF NOT EXISTS public.deadlock_snapshots (
  id BIGSERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  datname TEXT NOT NULL,
  deadlocks BIGINT NOT NULL,
  conflicts BIGINT NOT NULL,
  temp_files BIGINT NOT NULL,
  stats_reset TIMESTAMPTZ
);

GRANT SELECT ON public.deadlock_snapshots TO authenticated;
GRANT ALL ON public.deadlock_snapshots TO service_role;

ALTER TABLE public.deadlock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deadlock snapshots"
ON public.deadlock_snapshots FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_deadlock_snapshots_captured_at_brin
  ON public.deadlock_snapshots USING brin (captured_at);

-- Retention: 7 dias
CREATE OR REPLACE FUNCTION public.cleanup_deadlock_snapshots()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.deadlock_snapshots
  WHERE captured_at < now() - INTERVAL '7 days';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_deadlock_snapshots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_deadlock_snapshots() TO service_role;

-- Scanner principal
CREATE OR REPLACE FUNCTION public.scan_deadlocks_and_conflicts(
  warn_deadlocks_per_hour INTEGER DEFAULT 5,
  crit_deadlocks_per_hour INTEGER DEFAULT 20,
  warn_conflicts_per_hour INTEGER DEFAULT 10
)
RETURNS TABLE(
  severity TEXT,
  metric TEXT,
  value NUMERIC,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current RECORD;
  v_previous RECORD;
  v_delta_deadlocks NUMERIC;
  v_delta_conflicts NUMERIC;
  v_elapsed_hours NUMERIC;
  v_deadlocks_per_hour NUMERIC;
  v_conflicts_per_hour NUMERIC;
  v_severity TEXT;
  v_diagnostic_sql TEXT;
BEGIN
  -- Snapshot atual
  SELECT
    datname,
    deadlocks,
    conflicts,
    temp_files,
    stats_reset
  INTO v_current
  FROM pg_stat_database
  WHERE datname = current_database();

  -- Persistir snapshot
  INSERT INTO public.deadlock_snapshots (datname, deadlocks, conflicts, temp_files, stats_reset)
  VALUES (v_current.datname, v_current.deadlocks, v_current.conflicts, v_current.temp_files, v_current.stats_reset);

  -- Buscar snapshot anterior mais recente (mínimo 5 min atrás)
  SELECT deadlocks, conflicts, captured_at, stats_reset
  INTO v_previous
  FROM public.deadlock_snapshots
  WHERE datname = v_current.datname
    AND captured_at < now() - INTERVAL '5 minutes'
    AND (stats_reset IS NULL OR stats_reset = v_current.stats_reset)
  ORDER BY captured_at DESC
  LIMIT 1;

  IF v_previous IS NULL THEN
    RETURN; -- Sem baseline
  END IF;

  v_elapsed_hours := EXTRACT(EPOCH FROM (now() - v_previous.captured_at)) / 3600.0;
  IF v_elapsed_hours <= 0 THEN RETURN; END IF;

  v_delta_deadlocks := v_current.deadlocks - v_previous.deadlocks;
  v_delta_conflicts := v_current.conflicts - v_previous.conflicts;

  v_deadlocks_per_hour := v_delta_deadlocks / v_elapsed_hours;
  v_conflicts_per_hour := v_delta_conflicts / v_elapsed_hours;

  v_diagnostic_sql := 'SELECT pid, usename, application_name, wait_event_type, wait_event, state, query, xact_start '
                   || 'FROM pg_stat_activity WHERE wait_event_type IN (''Lock'',''LWLock'') ORDER BY xact_start;';

  -- Alerta deadlocks
  IF v_deadlocks_per_hour >= crit_deadlocks_per_hour THEN
    v_severity := 'CRITICAL';
  ELSIF v_deadlocks_per_hour >= warn_deadlocks_per_hour THEN
    v_severity := 'HIGH';
  ELSE
    v_severity := NULL;
  END IF;

  IF v_severity IS NOT NULL THEN
    INSERT INTO public.system_alerts (alert_type, severity, source, message, metadata)
    SELECT
      'deadlock_spike',
      v_severity,
      'scan_deadlocks_and_conflicts',
      format('%s deadlocks/hora detectados no banco %s (delta=%s em %s min)',
        round(v_deadlocks_per_hour, 2), v_current.datname, v_delta_deadlocks, round(v_elapsed_hours*60, 1)),
      jsonb_build_object(
        'deadlocks_per_hour', v_deadlocks_per_hour,
        'delta_deadlocks', v_delta_deadlocks,
        'elapsed_minutes', round(v_elapsed_hours*60, 2),
        'total_deadlocks', v_current.deadlocks,
        'diagnostic_sql', v_diagnostic_sql,
        'runbook', 'DOCS/CODEBASE_ATLAS/09_OBSERVABILIDADE.md#onda-15'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'deadlock_spike'
        AND created_at > now() - INTERVAL '1 hour'
        AND resolved_at IS NULL
    );

    RETURN QUERY SELECT v_severity, 'deadlocks_per_hour'::TEXT, v_deadlocks_per_hour,
      jsonb_build_object('delta', v_delta_deadlocks, 'window_min', round(v_elapsed_hours*60, 2));
  END IF;

  -- Alerta conflicts (relevante para réplicas de leitura)
  IF v_conflicts_per_hour >= warn_conflicts_per_hour THEN
    INSERT INTO public.system_alerts (alert_type, severity, source, message, metadata)
    SELECT
      'replication_conflict_spike',
      'HIGH',
      'scan_deadlocks_and_conflicts',
      format('%s conflitos de recovery/hora no banco %s',
        round(v_conflicts_per_hour, 2), v_current.datname),
      jsonb_build_object(
        'conflicts_per_hour', v_conflicts_per_hour,
        'delta_conflicts', v_delta_conflicts,
        'elapsed_minutes', round(v_elapsed_hours*60, 2),
        'runbook', 'DOCS/CODEBASE_ATLAS/09_OBSERVABILIDADE.md#onda-15'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'replication_conflict_spike'
        AND created_at > now() - INTERVAL '1 hour'
        AND resolved_at IS NULL
    );

    RETURN QUERY SELECT 'HIGH'::TEXT, 'conflicts_per_hour'::TEXT, v_conflicts_per_hour,
      jsonb_build_object('delta', v_delta_conflicts);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_deadlocks_and_conflicts(INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_deadlocks_and_conflicts(INTEGER, INTEGER, INTEGER) TO service_role;

-- Agendamento a cada 15 minutos
SELECT cron.schedule(
  'scan-deadlocks-conflicts-15min',
  '*/15 * * * *',
  $$SELECT public.scan_deadlocks_and_conflicts();$$
);

-- Agendamento de cleanup diário
SELECT cron.schedule(
  'cleanup-deadlock-snapshots-daily',
  '15 4 * * *',
  $$SELECT public.cleanup_deadlock_snapshots();$$
);
