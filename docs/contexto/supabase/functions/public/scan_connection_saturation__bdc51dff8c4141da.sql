CREATE OR REPLACE FUNCTION public.scan_connection_saturation(warn_pct numeric DEFAULT 70, crit_pct numeric DEFAULT 90)
 RETURNS TABLE(severity text, total_connections integer, max_connections integer, usage_pct numeric, by_state jsonb, top_apps jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_total int;
  v_max int;
  v_pct numeric;
  v_aborted int;
  v_by_state jsonb;
  v_top_apps jsonb;
  v_top_users jsonb;
  v_severity text;
  v_diag_sql text;
BEGIN
  SELECT current_setting('max_connections')::int INTO v_max;

  SELECT count(*) INTO v_total FROM pg_stat_activity WHERE pid <> pg_backend_pid();

  SELECT count(*) INTO v_aborted
  FROM pg_stat_activity
  WHERE state = 'idle in transaction (aborted)' AND pid <> pg_backend_pid();

  v_pct := CASE WHEN v_max > 0 THEN round((v_total::numeric / v_max) * 100, 2) ELSE 0 END;

  SELECT jsonb_object_agg(coalesce(state, 'unknown'), cnt)
  INTO v_by_state
  FROM (
    SELECT state, count(*) AS cnt
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
    GROUP BY state
  ) s;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_top_apps
  FROM (
    SELECT coalesce(application_name, '(unknown)') AS app, count(*) AS cnt
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
    GROUP BY application_name
    ORDER BY count(*) DESC
    LIMIT 5
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_top_users
  FROM (
    SELECT coalesce(usename, '(none)') AS usr, count(*) AS cnt
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
    GROUP BY usename
    ORDER BY count(*) DESC
    LIMIT 5
  ) t;

  v_severity := CASE
    WHEN v_pct >= crit_pct OR v_aborted > 5 THEN 'CRITICAL'
    WHEN v_pct >= warn_pct THEN 'HIGH'
    ELSE 'OK'
  END;

  v_diag_sql := 'SELECT pid, usename, application_name, state, wait_event_type, wait_event, '
             || 'now()-xact_start AS xact_age, left(query,200) AS query '
             || 'FROM pg_stat_activity WHERE pid <> pg_backend_pid() '
             || 'ORDER BY xact_start NULLS LAST LIMIT 50;';

  IF v_severity <> 'OK' THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, message, metadata, created_at
    ) VALUES (
      'db_connection_saturation',
      v_severity,
      format('Conexões DB em %s%% (%s/%s)', v_pct, v_total, v_max),
      format('Uso do pool: %s%%. Idle-in-txn (aborted): %s. Revisar top apps e considerar pg_terminate_backend em conexões travadas.', v_pct, v_aborted),
      jsonb_build_object(
        'total_connections', v_total,
        'max_connections', v_max,
        'usage_pct', v_pct,
        'aborted_in_txn', v_aborted,
        'by_state', v_by_state,
        'top_apps', v_top_apps,
        'top_users', v_top_users,
        'diagnostic_sql', v_diag_sql,
        'wave', 10
      ),
      now()
    );
  END IF;

  RETURN QUERY SELECT v_severity, v_total, v_max, v_pct, v_by_state, v_top_apps;
END;
$function$
