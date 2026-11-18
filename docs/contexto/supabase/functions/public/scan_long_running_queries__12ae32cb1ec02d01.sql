CREATE OR REPLACE FUNCTION public.scan_long_running_queries()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
END; $function$
