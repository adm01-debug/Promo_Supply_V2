
-- Onda 79a: Saturação de conexões
CREATE OR REPLACE FUNCTION public.scan_connection_saturation()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_max int; v_used int; v_pct numeric; v_sev text;
  v_type text := 'db_connection_saturation';
BEGIN
  SELECT setting::int INTO v_max FROM pg_settings WHERE name='max_connections';
  SELECT count(*) INTO v_used FROM pg_stat_activity WHERE datname = current_database();
  v_pct := ROUND(v_used::numeric / NULLIF(v_max,0) * 100, 2);

  IF v_pct < 70 THEN RETURN jsonb_build_object('status','ok','pct',v_pct); END IF;
  v_sev := CASE WHEN v_pct >= 95 THEN 'CRITICAL' WHEN v_pct >= 85 THEN 'HIGH' ELSE 'MEDIUM' END;

  IF EXISTS (SELECT 1 FROM public.system_alerts
              WHERE alert_type = v_type AND resolved_at IS NULL
                AND created_at > now() - interval '30 minutes') THEN
    RETURN jsonb_build_object('status','deduped','pct',v_pct);
  END IF;

  INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
  VALUES (v_type, v_sev,
    format('Conexões em %s%% (%s/%s)', v_pct, v_used, v_max),
    jsonb_build_object('pct', v_pct, 'used', v_used, 'max', v_max,
      'diagnostic_sql','SELECT pid, usename, state, query_start, query FROM pg_stat_activity WHERE datname=current_database() ORDER BY query_start;',
      'hint','Verifique pool exhaustion, leaks em edge functions ou sessões idle-in-transaction.'));
  RETURN jsonb_build_object('status','alerted','severity',v_sev,'pct',v_pct);
END; $$;

REVOKE EXECUTE ON FUNCTION public.scan_connection_saturation() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_connection_saturation() TO service_role;

-- Onda 79b: Cache hit ratio
CREATE OR REPLACE FUNCTION public.scan_cache_hit_ratio()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hits bigint; v_reads bigint; v_pct numeric; v_sev text;
  v_type text := 'db_cache_hit_low';
BEGIN
  SELECT sum(heap_blks_hit), sum(heap_blks_read)
    INTO v_hits, v_reads FROM pg_statio_user_tables;
  IF (v_hits + v_reads) < 100000 THEN
    RETURN jsonb_build_object('status','insufficient_samples');
  END IF;
  v_pct := ROUND(v_hits::numeric / NULLIF(v_hits+v_reads,0) * 100, 3);

  IF v_pct >= 99 THEN RETURN jsonb_build_object('status','ok','pct',v_pct); END IF;
  v_sev := CASE WHEN v_pct < 90 THEN 'CRITICAL' WHEN v_pct < 95 THEN 'HIGH' ELSE 'MEDIUM' END;

  IF EXISTS (SELECT 1 FROM public.system_alerts
              WHERE alert_type = v_type AND resolved_at IS NULL
                AND created_at > now() - interval '30 minutes') THEN
    RETURN jsonb_build_object('status','deduped','pct',v_pct);
  END IF;

  INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
  VALUES (v_type, v_sev,
    format('Cache hit ratio em %s%%', v_pct),
    jsonb_build_object('pct', v_pct, 'hits', v_hits, 'reads', v_reads,
      'diagnostic_sql','SELECT relname, heap_blks_hit, heap_blks_read FROM pg_statio_user_tables ORDER BY heap_blks_read DESC LIMIT 20;',
      'hint','Considere aumentar shared_buffers ou revisar queries que fazem full scan.'));
  RETURN jsonb_build_object('status','alerted','severity',v_sev,'pct',v_pct);
END; $$;

REVOKE EXECUTE ON FUNCTION public.scan_cache_hit_ratio() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_cache_hit_ratio() TO service_role;

-- Onda 79c: Long-running queries
CREATE OR REPLACE FUNCTION public.scan_long_running_queries()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  r record; v_sev text; v_dur_min numeric;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT pid, usename, state, query_start,
           EXTRACT(EPOCH FROM (now() - query_start))/60 AS minutes,
           LEFT(query, 500) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'active'
      AND query_start < now() - interval '5 minutes'
      AND query NOT ILIKE '%autovacuum%'
      AND query NOT ILIKE '%scan_long_running_queries%'
  LOOP
    v_dur_min := ROUND(r.minutes::numeric, 1);
    v_sev := CASE WHEN v_dur_min >= 30 THEN 'CRITICAL'
                  WHEN v_dur_min >= 15 THEN 'HIGH'
                  ELSE 'MEDIUM' END;

    -- Dedupe por pid+alert_type nos últimos 30min
    IF EXISTS (SELECT 1 FROM public.system_alerts
                WHERE alert_type = 'db_long_running_query'
                  AND resolved_at IS NULL
                  AND (metadata->>'pid')::int = r.pid
                  AND created_at > now() - interval '30 minutes') THEN
      CONTINUE;
    END IF;

    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES ('db_long_running_query', v_sev,
      format('Query rodando há %s min (pid %s)', v_dur_min, r.pid),
      jsonb_build_object('pid', r.pid, 'usename', r.usename,
        'minutes', v_dur_min, 'query_start', r.query_start,
        'query', r.query,
        'fix_sql', format('SELECT pg_cancel_backend(%s); -- ou pg_terminate_backend(%s)', r.pid, r.pid),
        'hint','Investigar antes de cancelar: pode ser migration ou reindex legítimo.'));
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('status','ok','alerts_created', v_count);
END; $$;

REVOKE EXECUTE ON FUNCTION public.scan_long_running_queries() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_long_running_queries() TO service_role;

-- Cron schedules
SELECT cron.schedule('scan-connection-saturation-5m', '*/5 * * * *',
  $$ SELECT public.scan_connection_saturation(); $$);
SELECT cron.schedule('scan-cache-hit-ratio-30m', '*/30 * * * *',
  $$ SELECT public.scan_cache_hit_ratio(); $$);
SELECT cron.schedule('scan-long-running-queries-2m', '*/2 * * * *',
  $$ SELECT public.scan_long_running_queries(); $$);
