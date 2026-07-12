
CREATE OR REPLACE FUNCTION public.scan_long_running_transactions(
  _idle_threshold_min integer DEFAULT 10,
  _active_threshold_min integer DEFAULT 30
)
RETURNS TABLE (
  pid integer,
  usename text,
  state text,
  duration_seconds numeric,
  severity text,
  query_preview text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rec record;
  v_severity text;
  v_duration_sec numeric;
  v_dedup_key text;
  v_recent_alert boolean;
BEGIN
  FOR rec IN
    SELECT
      a.pid,
      a.usename,
      a.state,
      a.query,
      a.xact_start,
      a.state_change,
      a.application_name,
      EXTRACT(EPOCH FROM (now() - COALESCE(a.xact_start, a.state_change))) AS dur_sec
    FROM pg_stat_activity a
    WHERE a.pid <> pg_backend_pid()
      AND a.backend_type = 'client backend'
      AND a.state IS NOT NULL
      AND a.state <> 'idle'
      AND (
        (a.state = 'idle in transaction'
          AND a.state_change < now() - make_interval(mins => _idle_threshold_min))
        OR
        (a.state = 'active'
          AND a.xact_start < now() - make_interval(mins => _active_threshold_min))
      )
  LOOP
    v_duration_sec := rec.dur_sec;

    IF rec.state = 'idle in transaction' AND v_duration_sec > 1800 THEN
      v_severity := 'CRITICAL';
    ELSIF rec.state = 'idle in transaction' THEN
      v_severity := 'HIGH';
    ELSIF v_duration_sec > 3600 THEN
      v_severity := 'HIGH';
    ELSE
      v_severity := 'MEDIUM';
    END IF;

    v_dedup_key := 'long_txn_' || rec.pid::text;

    SELECT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'long_running_transaction'
        AND metadata->>'dedup_key' = v_dedup_key
        AND created_at > now() - interval '1 hour'
    ) INTO v_recent_alert;

    IF NOT v_recent_alert THEN
      INSERT INTO public.system_alerts (
        tenant_id, alert_type, severity, message, metadata
      ) VALUES (
        NULL,
        'long_running_transaction',
        v_severity,
        format(
          'Transação %s há %s minutos (PID %s, usuário %s)',
          rec.state,
          round(v_duration_sec / 60.0, 1),
          rec.pid,
          COALESCE(rec.usename, 'unknown')
        ),
        jsonb_build_object(
          'dedup_key', v_dedup_key,
          'pid', rec.pid,
          'usename', rec.usename,
          'state', rec.state,
          'application_name', rec.application_name,
          'duration_seconds', v_duration_sec,
          'xact_start', rec.xact_start,
          'query_preview', left(coalesce(rec.query, ''), 500),
          'suggested_action', format('SELECT pg_terminate_backend(%s); -- valide antes de encerrar', rec.pid)
        )
      );
    END IF;

    pid := rec.pid;
    usename := rec.usename;
    state := rec.state;
    duration_seconds := v_duration_sec;
    severity := v_severity;
    query_preview := left(coalesce(rec.query, ''), 200);
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_long_running_transactions(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_long_running_transactions(integer, integer) TO service_role;

SELECT cron.schedule(
  'scan-long-running-transactions-10min',
  '*/10 * * * *',
  $$ SELECT public.scan_long_running_transactions(10, 30); $$
);
