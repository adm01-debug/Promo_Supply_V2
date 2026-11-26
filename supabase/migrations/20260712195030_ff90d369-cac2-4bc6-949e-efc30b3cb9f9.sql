
CREATE OR REPLACE FUNCTION public.scan_long_running_transactions()
RETURNS TABLE (
  pid              int,
  usename          text,
  application_name text,
  state            text,
  duration_seconds int,
  wait_event       text,
  query_snippet    text,
  severity         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec  record;
  v_dur  int;
  v_sev  text;
  v_dedup_minutes int := 15;
BEGIN
  FOR v_rec IN
    SELECT
      a.pid,
      a.usename,
      COALESCE(a.application_name, '') AS application_name,
      a.state,
      EXTRACT(EPOCH FROM (now() - a.xact_start))::int AS dur_sec,
      COALESCE(a.wait_event_type || ':' || a.wait_event, 'none') AS wait_ev,
      LEFT(COALESCE(a.query, ''), 500) AS q,
      a.backend_type
    FROM pg_stat_activity a
    WHERE a.xact_start IS NOT NULL
      AND a.pid <> pg_backend_pid()
      AND a.backend_type = 'client backend'
      AND a.state IN ('active','idle in transaction','idle in transaction (aborted)')
      AND (now() - a.xact_start) > interval '5 minutes'
  LOOP
    v_dur := v_rec.dur_sec;

    IF v_rec.state = 'active' THEN
      v_sev := CASE WHEN v_dur > 1800 THEN 'CRITICAL'
                    WHEN v_dur > 300  THEN 'HIGH'
                    ELSE NULL END;
    ELSE
      -- idle in transaction: mais agressivo
      v_sev := CASE WHEN v_dur > 900 THEN 'CRITICAL'
                    WHEN v_dur > 300 THEN 'HIGH'
                    ELSE NULL END;
    END IF;

    IF v_sev IS NULL THEN CONTINUE; END IF;

    pid              := v_rec.pid;
    usename          := v_rec.usename;
    application_name := v_rec.application_name;
    state            := v_rec.state;
    duration_seconds := v_dur;
    wait_event       := v_rec.wait_ev;
    query_snippet    := v_rec.q;
    severity         := v_sev;
    RETURN NEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'long_running_txn'
        AND (metadata->>'pid')::int = v_rec.pid
        AND created_at > now() - (v_dedup_minutes || ' minutes')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'long_running_txn',
        v_sev,
        format('[%s] %s PID %s há %ss (%s)',
               v_sev, v_rec.state, v_rec.pid, v_dur, v_rec.application_name),
        format('Sessão %s (%s) em estado %s há %s segundos. wait=%s. Segura locks/xmin e pode bloquear VACUUM/replicação.',
               v_rec.pid, v_rec.usename, v_rec.state, v_dur, v_rec.wait_ev),
        jsonb_build_object(
          'pid',              v_rec.pid,
          'usename',          v_rec.usename,
          'application_name', v_rec.application_name,
          'state',            v_rec.state,
          'duration_seconds', v_dur,
          'wait_event',       v_rec.wait_ev,
          'query_snippet',    v_rec.q,
          'fix_sql',
            format('SELECT pg_terminate_backend(%s); -- confirme culpa antes; pg_cancel_backend é mais suave', v_rec.pid),
          'diagnostic_sql',
            'SELECT pid, usename, application_name, state, wait_event_type, wait_event, xact_start, query '
            'FROM pg_stat_activity WHERE state <> ''idle'' ORDER BY xact_start ASC NULLS LAST;'
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_long_running_transactions() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_long_running_transactions() TO service_role;

COMMENT ON FUNCTION public.scan_long_running_transactions() IS
  'Onda 24: Detecta transações longas e idle-in-transaction (>5min) que seguram locks/xmin e bloqueiam VACUUM.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-long-running-txn-5min') THEN
      PERFORM cron.unschedule('scan-long-running-txn-5min');
    END IF;
    PERFORM cron.schedule(
      'scan-long-running-txn-5min',
      '*/5 * * * *',
      $cron$ SELECT public.scan_long_running_transactions(); $cron$
    );
  END IF;
END $$;
