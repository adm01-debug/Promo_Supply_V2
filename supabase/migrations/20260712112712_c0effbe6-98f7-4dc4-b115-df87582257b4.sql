-- Detecção de índices não utilizados (bloat + write amplification)
CREATE OR REPLACE FUNCTION public.scan_unused_indexes(_min_size_mb integer DEFAULT 10)
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
  v_size_bytes bigint;
BEGIN
  FOR r IN
    SELECT s.schemaname, s.relname AS tablename, s.indexrelname AS indexname,
           s.idx_scan, pg_relation_size(s.indexrelid) AS size_bytes,
           pg_size_pretty(pg_relation_size(s.indexrelid)) AS size_pretty
      FROM pg_stat_user_indexes s
      JOIN pg_index i ON i.indexrelid = s.indexrelid
     WHERE s.schemaname = 'public'
       AND s.idx_scan = 0
       AND NOT i.indisunique
       AND NOT i.indisprimary
       AND pg_relation_size(s.indexrelid) > (_min_size_mb * 1024 * 1024)
  LOOP
    v_alert_type := 'unused_index.' || r.indexname;
    SELECT EXISTS(
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_alert_type
         AND created_at > now() - interval '7 days'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_alert_type,
        'MEDIUM',
        format('Índice não utilizado: %s.%s em %s (%s, 0 scans)',
               r.schemaname, r.indexname, r.tablename, r.size_pretty),
        jsonb_build_object(
          'schema', r.schemaname, 'table', r.tablename, 'index', r.indexname,
          'size_bytes', r.size_bytes, 'size_pretty', r.size_pretty,
          'idx_scan', r.idx_scan,
          'suggested_action', format('DROP INDEX IF EXISTS %I.%I;', r.schemaname, r.indexname)
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_unused_indexes(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_unused_indexes(integer) TO service_role;