-- Onda 16: Scanner de Autovacuum Starvation
-- Detecta tabelas com alto % de dead tuples que não recebem vacuum há mais de 24h

CREATE OR REPLACE FUNCTION public.scan_autovacuum_starvation(
  warn_dead_pct NUMERIC DEFAULT 20.0,
  crit_dead_pct NUMERIC DEFAULT 40.0,
  min_rows INTEGER DEFAULT 1000,
  stale_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  schemaname TEXT,
  tablename TEXT,
  dead_pct NUMERIC,
  n_dead_tup BIGINT,
  n_live_tup BIGINT,
  last_vacuum_hours NUMERIC,
  severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.scan_autovacuum_starvation(NUMERIC, NUMERIC, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_autovacuum_starvation(NUMERIC, NUMERIC, INTEGER, INTEGER) TO service_role;

-- Agendamento diário
SELECT cron.schedule(
  'scan-autovacuum-starvation-daily',
  '45 5 * * *',
  $$SELECT public.scan_autovacuum_starvation();$$
);
