-- Detecção de tabelas com bloat alto (dead tuples > 20%) sem autovacuum recente
CREATE OR REPLACE FUNCTION public.scan_table_bloat(_min_dead_ratio numeric DEFAULT 0.20, _min_dead_tuples bigint DEFAULT 10000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  r RECORD;
  v_alert_type text;
  v_exists boolean;
  v_count integer := 0;
  v_ratio numeric;
  v_last_vac timestamptz;
BEGIN
  FOR r IN
    SELECT s.schemaname, s.relname AS tablename,
           s.n_live_tup, s.n_dead_tup,
           GREATEST(s.last_vacuum, s.last_autovacuum) AS last_vac_any,
           pg_size_pretty(pg_relation_size(s.relid)) AS size_pretty,
           pg_relation_size(s.relid) AS size_bytes
      FROM pg_stat_user_tables s
     WHERE s.schemaname = 'public'
       AND s.n_dead_tup >= _min_dead_tuples
       AND s.n_live_tup > 0
  LOOP
    v_ratio := r.n_dead_tup::numeric / GREATEST(r.n_live_tup, 1);
    v_last_vac := r.last_vac_any;

    IF v_ratio < _min_dead_ratio THEN CONTINUE; END IF;
    -- Ignora se vacuum rodou nas últimas 6h (bloat transitório)
    IF v_last_vac IS NOT NULL AND v_last_vac > now() - interval '6 hours' THEN CONTINUE; END IF;

    v_alert_type := 'table_bloat.' || r.tablename;
    SELECT EXISTS(
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_alert_type
         AND created_at > now() - interval '24 hours'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_alert_type,
        CASE WHEN v_ratio > 0.5 THEN 'HIGH' ELSE 'MEDIUM' END,
        format('Bloat detectado em %s.%s: %s dead / %s live (%.1f%%), tamanho %s, último vacuum: %s',
               r.schemaname, r.tablename, r.n_dead_tup, r.n_live_tup,
               v_ratio * 100, r.size_pretty, COALESCE(v_last_vac::text, 'nunca')),
        jsonb_build_object(
          'schema', r.schemaname, 'table', r.tablename,
          'dead_tuples', r.n_dead_tup, 'live_tuples', r.n_live_tup,
          'dead_ratio', v_ratio, 'size_bytes', r.size_bytes,
          'last_vacuum', v_last_vac,
          'suggested_action', format('VACUUM (ANALYZE, VERBOSE) %I.%I;', r.schemaname, r.tablename)
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_table_bloat(numeric, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_table_bloat(numeric, bigint) TO service_role;