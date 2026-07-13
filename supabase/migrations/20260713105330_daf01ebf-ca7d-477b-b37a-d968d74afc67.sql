
CREATE OR REPLACE FUNCTION public.scan_blocking_locks()
RETURNS TABLE(blocker_pid int, blocked_count int, wait_seconds numeric, severity text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rec RECORD;
  v_sev text;
  v_dedupe_key text;
BEGIN
  FOR rec IN
    WITH blocked AS (
      SELECT
        a.pid AS blocked_pid,
        unnest(pg_blocking_pids(a.pid)) AS blocker_pid,
        EXTRACT(EPOCH FROM (now() - a.xact_start)) AS wait_s,
        a.query AS blocked_query
      FROM pg_stat_activity a
      WHERE a.wait_event_type = 'Lock'
        AND a.pid <> pg_backend_pid()
        AND a.state = 'active'
    )
    SELECT
      b.blocker_pid,
      COUNT(*)::int AS blocked_cnt,
      MAX(b.wait_s)::numeric AS max_wait,
      COALESCE(bl.query, '<idle>') AS blocker_query,
      COALESCE(bl.usename, 'unknown') AS blocker_user,
      COALESCE(bl.application_name, '') AS blocker_app,
      COALESCE(EXTRACT(EPOCH FROM (now() - bl.xact_start))::numeric, 0) AS blocker_xact_age
    FROM blocked b
    LEFT JOIN pg_stat_activity bl ON bl.pid = b.blocker_pid
    WHERE bl.backend_type IS DISTINCT FROM 'autovacuum worker'
    GROUP BY b.blocker_pid, bl.query, bl.usename, bl.application_name, bl.xact_start
    HAVING MAX(b.wait_s) >= 30
  LOOP
    v_sev := CASE
      WHEN rec.max_wait >= 300 THEN 'CRITICAL'
      WHEN rec.max_wait >= 120 THEN 'HIGH'
      ELSE 'MEDIUM'
    END;

    v_dedupe_key := 'blocking_lock:' || rec.blocker_pid::text;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE (metadata->>'dedupe_key') = v_dedupe_key
        AND status = 'open'
        AND created_at > now() - interval '15 minutes'
    ) THEN
      INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata, status)
      VALUES (
        'blocking_lock',
        v_sev,
        format('Sessão %s bloqueia %s conexão(ões) há %ss', rec.blocker_pid, rec.blocked_cnt, round(rec.max_wait)),
        format('Blocker: user=%s app=%s xact_age=%ss query=%s',
               rec.blocker_user, rec.blocker_app, round(rec.blocker_xact_age),
               left(rec.blocker_query, 500)),
        jsonb_build_object(
          'dedupe_key', v_dedupe_key,
          'blocker_pid', rec.blocker_pid,
          'blocked_count', rec.blocked_cnt,
          'wait_seconds', rec.max_wait,
          'diagnostic_sql',
            'SELECT pid, state, wait_event_type, wait_event, xact_start, query FROM pg_stat_activity WHERE pid = ' || rec.blocker_pid || ';',
          'fix_sql_cancel', 'SELECT pg_cancel_backend(' || rec.blocker_pid || ');',
          'fix_sql_terminate', 'SELECT pg_terminate_backend(' || rec.blocker_pid || ');',
          'hint', 'Cancele antes de terminar. Investigue transações longas/idle-in-transaction do app.'
        ),
        'open'
      );
    END IF;

    blocker_pid := rec.blocker_pid;
    blocked_count := rec.blocked_cnt;
    wait_seconds := rec.max_wait;
    severity := v_sev;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_blocking_locks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_blocking_locks() TO service_role;

-- Cron a cada 1 minuto
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-blocking-locks-1m') THEN
    PERFORM cron.unschedule('scan-blocking-locks-1m');
  END IF;
  PERFORM cron.schedule(
    'scan-blocking-locks-1m',
    '* * * * *',
    $cron$ SELECT public.scan_blocking_locks(); $cron$
  );
END $$;
