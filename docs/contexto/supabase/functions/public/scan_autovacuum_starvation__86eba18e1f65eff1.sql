CREATE OR REPLACE FUNCTION public.scan_autovacuum_starvation(warn_dead_pct numeric DEFAULT 20.0, crit_dead_pct numeric DEFAULT 40.0, min_rows integer DEFAULT 1000, stale_hours integer DEFAULT 24)
 RETURNS TABLE(schemaname text, tablename text, dead_pct numeric, n_dead_tup bigint, n_live_tup bigint, last_vacuum_hours numeric, severity text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_severity TEXT;
  v_dead_pct NUMERIC;
  v_last_vac_hours NUMERIC;
  v_fix_sql TEXT;
BEGIN
  FOR r IN
    SELECT
      s.schemaname::TEXT AS sch,
      s.relname::TEXT AS tbl,
      s.n_live_tup,
      s.n_dead_tup,
      GREATEST(COALESCE(s.last_autovacuum, s.last_vacuum), s.last_vacuum, s.last_autovacuum) AS last_vac,
      c.reltuples
    FROM pg_stat_user_tables s
    JOIN pg_class c ON c.oid = s.relid
    WHERE s.schemaname = 'public'
      AND s.n_live_tup + s.n_dead_tup >= min_rows
  LOOP
    IF (r.n_live_tup + r.n_dead_tup) = 0 THEN CONTINUE; END IF;

    v_dead_pct := (r.n_dead_tup::NUMERIC / GREATEST(r.n_live_tup + r.n_dead_tup, 1)) * 100.0;
    v_last_vac_hours := CASE
      WHEN r.last_vac IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - r.last_vac)) / 3600.0
    END;

    -- Skip se dead_pct baixo E vacuum recente
    IF v_dead_pct < warn_dead_pct THEN CONTINUE; END IF;
    IF v_last_vac_hours IS NOT NULL AND v_last_vac_hours < stale_hours THEN CONTINUE; END IF;

    -- Severidade
    IF v_dead_pct >= crit_dead_pct OR (r.last_vac IS NULL AND r.n_live_tup > 100000) THEN
      v_severity := 'CRITICAL';
    ELSE
      v_severity := 'HIGH';
    END IF;

    v_fix_sql := format('VACUUM (ANALYZE, VERBOSE) public.%I;', r.tbl);

    -- Dedupe: 24h por tabela
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'autovacuum_starvation'
        AND metadata->>'tablename' = r.tbl
        AND created_at > now() - INTERVAL '24 hours'
        AND resolved_at IS NULL
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, source, message, metadata)
      VALUES (
        'autovacuum_starvation',
        v_severity,
        'scan_autovacuum_starvation',
        format('Tabela public.%s com %s%% dead tuples (%s) e último vacuum há %s',
          r.tbl,
          round(v_dead_pct, 1),
          r.n_dead_tup,
          COALESCE(round(v_last_vac_hours, 1)::TEXT || 'h', 'NUNCA')),
        jsonb_build_object(
          'tablename', r.tbl,
          'schemaname', r.sch,
          'dead_pct', round(v_dead_pct, 2),
          'n_dead_tup', r.n_dead_tup,
          'n_live_tup', r.n_live_tup,
          'last_vacuum_hours', v_last_vac_hours,
          'fix_sql', v_fix_sql,
          'suggested_setting', format(
            'ALTER TABLE public.%I SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02);',
            r.tbl),
          'wave', 16,
          'runbook', 'DOCS/CODEBASE_ATLAS/09_OBSERVABILIDADE.md#onda-16'
        )
      );
    END IF;

    schemaname := r.sch;
    tablename := r.tbl;
    dead_pct := round(v_dead_pct, 2);
    n_dead_tup := r.n_dead_tup;
    n_live_tup := r.n_live_tup;
    last_vacuum_hours := v_last_vac_hours;
    severity := v_severity;
    RETURN NEXT;
  END LOOP;
END;
$function$
