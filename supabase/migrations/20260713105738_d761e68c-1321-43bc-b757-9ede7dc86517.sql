
CREATE OR REPLACE FUNCTION public.scan_slow_query_hotspots()
RETURNS TABLE(queryid bigint, mean_ms numeric, calls bigint, severity text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  rec RECORD;
  v_sev text;
  v_dedupe_key text;
BEGIN
  FOR rec IN
    SELECT
      s.queryid,
      s.calls,
      s.mean_exec_time AS mean_ms,
      s.stddev_exec_time AS stddev_ms,
      s.total_exec_time AS total_ms,
      s.rows AS rows_avg,
      left(regexp_replace(s.query, '\s+', ' ', 'g'), 300) AS query_snippet
    FROM extensions.pg_stat_statements s
    JOIN pg_roles r ON r.oid = s.userid
    WHERE s.calls >= 50
      AND s.mean_exec_time >= 500
      AND s.query !~* '^(vacuum|analyze|reindex|cluster|copy|set )'
      AND s.query !~* 'scan_slow_query_hotspots'
      AND r.rolname NOT IN ('supabase_admin','postgres')
    ORDER BY s.mean_exec_time DESC
    LIMIT 20
  LOOP
    v_sev := CASE
      WHEN rec.mean_ms >= 10000 THEN 'CRITICAL'
      WHEN rec.mean_ms >= 2000  THEN 'HIGH'
      ELSE 'MEDIUM'
    END;

    v_dedupe_key := 'slow_query:' || rec.queryid::text;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE (metadata->>'dedupe_key') = v_dedupe_key
        AND status = 'open'
        AND created_at > now() - interval '6 hours'
    ) THEN
      INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata, status)
      VALUES (
        'slow_query_hotspot',
        v_sev,
        format('Query queryid=%s média %sms em %s execuções',
               rec.queryid, round(rec.mean_ms), rec.calls),
        format('Snippet: %s | stddev=%sms total=%ss rows_avg=%s',
               rec.query_snippet, round(rec.stddev_ms), round(rec.total_ms/1000), rec.rows_avg),
        jsonb_build_object(
          'dedupe_key', v_dedupe_key,
          'queryid', rec.queryid,
          'mean_ms', rec.mean_ms,
          'stddev_ms', rec.stddev_ms,
          'calls', rec.calls,
          'total_ms', rec.total_ms,
          'diagnostic_sql',
            'SELECT query FROM extensions.pg_stat_statements WHERE queryid = ' || rec.queryid || ';',
          'fix_hint_sql',
            'EXPLAIN (ANALYZE, BUFFERS) <cole a query do diagnostic_sql aqui>;',
          'hint', 'Analise plano com EXPLAIN. Provavel Seq Scan em coluna sem indice, JOIN sem indice ou sort estourando work_mem.'
        ),
        'open'
      );
    END IF;

    queryid := rec.queryid;
    mean_ms := rec.mean_ms;
    calls := rec.calls;
    severity := v_sev;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_slow_query_hotspots() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_slow_query_hotspots() TO service_role;

-- Cron a cada 1 hora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-slow-query-hotspots-1h') THEN
    PERFORM cron.unschedule('scan-slow-query-hotspots-1h');
  END IF;
  PERFORM cron.schedule(
    'scan-slow-query-hotspots-1h',
    '7 * * * *',
    $cron$ SELECT public.scan_slow_query_hotspots(); $cron$
  );
END $$;
