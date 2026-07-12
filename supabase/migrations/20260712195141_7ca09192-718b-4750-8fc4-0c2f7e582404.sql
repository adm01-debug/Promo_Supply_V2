
CREATE OR REPLACE FUNCTION public.scan_lock_waits()
RETURNS TABLE (
  blocked_pid       int,
  blocker_pid       int,
  wait_seconds      int,
  blocked_query     text,
  blocker_query     text,
  lock_type         text,
  severity          text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec  record;
  v_sev  text;
  v_dedup_minutes int := 10;
BEGIN
  FOR v_rec IN
    WITH blocked AS (
      SELECT
        a.pid                                                     AS blocked_pid,
        pg_blocking_pids(a.pid)                                   AS blockers,
        EXTRACT(EPOCH FROM (now() - COALESCE(a.state_change, a.query_start)))::int AS wait_sec,
        LEFT(COALESCE(a.query, ''), 300)                          AS q,
        a.wait_event_type || ':' || COALESCE(a.wait_event, '')    AS wev
      FROM pg_stat_activity a
      WHERE a.wait_event_type = 'Lock'
        AND a.backend_type = 'client backend'
        AND a.pid <> pg_backend_pid()
    )
    SELECT
      b.blocked_pid,
      unnest(b.blockers)             AS blocker_pid,
      b.wait_sec,
      b.q                            AS blocked_q,
      b.wev
    FROM blocked b
    WHERE array_length(b.blockers, 1) > 0
      AND b.wait_sec > 30
  LOOP
    v_sev := CASE
               WHEN v_rec.wait_sec > 120 THEN 'CRITICAL'
               WHEN v_rec.wait_sec > 30  THEN 'HIGH'
               ELSE NULL
             END;
    IF v_sev IS NULL THEN CONTINUE; END IF;

    blocked_pid   := v_rec.blocked_pid;
    blocker_pid   := v_rec.blocker_pid;
    wait_seconds  := v_rec.wait_sec;
    blocked_query := v_rec.blocked_q;
    blocker_query := (
      SELECT LEFT(COALESCE(query, ''), 300)
      FROM pg_stat_activity WHERE pid = v_rec.blocker_pid
    );
    lock_type     := v_rec.wev;
    severity      := v_sev;
    RETURN NEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'lock_wait'
        AND (metadata->>'blocker_pid')::int = v_rec.blocker_pid
        AND (metadata->>'blocked_pid')::int = v_rec.blocked_pid
        AND created_at > now() - (v_dedup_minutes || ' minutes')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'lock_wait',
        v_sev,
        format('[%s] PID %s esperando lock de PID %s há %ss',
               v_sev, v_rec.blocked_pid, v_rec.blocker_pid, v_rec.wait_sec),
        format('Sessão bloqueada há %ss (wait=%s). Investigue a query bloqueadora e considere cancelar.',
               v_rec.wait_sec, v_rec.wev),
        jsonb_build_object(
          'blocked_pid',   v_rec.blocked_pid,
          'blocker_pid',   v_rec.blocker_pid,
          'wait_seconds',  v_rec.wait_sec,
          'lock_type',     v_rec.wev,
          'blocked_query', v_rec.blocked_q,
          'blocker_query', blocker_query,
          'fix_sql',
            format('SELECT pg_cancel_backend(%s); -- se não liberar em 10s: SELECT pg_terminate_backend(%s);',
                   v_rec.blocker_pid, v_rec.blocker_pid),
          'diagnostic_sql',
            'SELECT bl.pid AS blocked, bl.query AS blocked_q, '
            'bg.pid AS blocker, bg.query AS blocker_q, '
            'bl.wait_event_type, bl.wait_event '
            'FROM pg_stat_activity bl JOIN pg_stat_activity bg '
            '  ON bg.pid = ANY(pg_blocking_pids(bl.pid)) '
            'WHERE bl.wait_event_type = ''Lock'';'
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_lock_waits() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_lock_waits() TO service_role;

COMMENT ON FUNCTION public.scan_lock_waits() IS
  'Onda 25: Detecta cadeias de lock (pg_blocking_pids) com espera > 30s e sugere cancelamento do bloqueador.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-lock-waits-2min') THEN
      PERFORM cron.unschedule('scan-lock-waits-2min');
    END IF;
    PERFORM cron.schedule(
      'scan-lock-waits-2min',
      '*/2 * * * *',
      $cron$ SELECT public.scan_lock_waits(); $cron$
    );
  END IF;
END $$;
