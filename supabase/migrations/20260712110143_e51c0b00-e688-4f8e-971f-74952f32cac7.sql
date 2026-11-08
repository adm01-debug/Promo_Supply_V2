
CREATE OR REPLACE FUNCTION public.scan_dangerous_statements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  r RECORD;
  v_hash text;
  v_alert_type text;
  v_exists boolean;
  v_count integer := 0;
  v_norm text;
BEGIN
  FOR r IN
    SELECT queryid, query, calls, rows
      FROM extensions.pg_stat_statements
     WHERE calls > 0
       AND (
         query ~* '^\s*update\s+(public\.)?[a-z_][a-z0-9_]*\s+set\s'
         OR query ~* '^\s*delete\s+from\s+(public\.)?[a-z_][a-z0-9_]*\s*(;|returning|$)'
       )
  LOOP
    -- Normaliza pra checar ausência de WHERE de forma robusta
    v_norm := regexp_replace(lower(r.query), '\s+', ' ', 'g');
    IF v_norm ~ ' where ' THEN
      CONTINUE; -- tem where, safe
    END IF;

    v_hash := md5(r.query);
    v_alert_type := 'dangerous_sql.' || v_hash;

    SELECT EXISTS(
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_alert_type
         AND created_at > now() - interval '24 hours'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_alert_type,
        'HIGH',
        format('UPDATE/DELETE sem WHERE detectado em pg_stat_statements (queryid=%s, calls=%s, rows=%s)',
               r.queryid, r.calls, r.rows),
        jsonb_build_object(
          'queryid', r.queryid,
          'query', left(r.query, 500),
          'calls', r.calls,
          'rows', r.rows
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_dangerous_statements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_dangerous_statements() TO service_role;

-- Agenda horária
SELECT cron.unschedule('scan-dangerous-statements')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-dangerous-statements');

SELECT cron.schedule(
  'scan-dangerous-statements',
  '17 * * * *',
  $cron$ SELECT public.scan_dangerous_statements(); $cron$
);
