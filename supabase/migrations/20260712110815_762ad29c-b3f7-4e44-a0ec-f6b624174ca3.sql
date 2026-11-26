
-- Watchdog: detecta queries longas (>5min) e locks prolongados (>5min)
CREATE OR REPLACE FUNCTION public.pg_activity_watchdog()
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
BEGIN
  -- 1) Queries ativas há mais de 5 minutos (excluindo backends internos/cron)
  FOR r IN
    SELECT pid, usename, state, wait_event_type, wait_event,
           now() - query_start AS runtime,
           left(query, 500) AS query
      FROM pg_stat_activity
     WHERE state = 'active'
       AND query_start IS NOT NULL
       AND now() - query_start > interval '5 minutes'
       AND backend_type = 'client backend'
       AND query NOT ILIKE '%pg_activity_watchdog%'
       AND query NOT ILIKE '%pg_stat_activity%'
  LOOP
    v_alert_type := 'pg_activity.long_running.' || r.pid;
    SELECT EXISTS(
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_alert_type
         AND created_at > now() - interval '30 minutes'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_alert_type,
        'HIGH',
        format('Query ativa há %s (pid=%s, user=%s, wait=%s/%s)',
               r.runtime, r.pid, r.usename,
               COALESCE(r.wait_event_type,'-'), COALESCE(r.wait_event,'-')),
        jsonb_build_object(
          'pid', r.pid, 'user', r.usename, 'state', r.state,
          'wait_event_type', r.wait_event_type, 'wait_event', r.wait_event,
          'runtime_seconds', EXTRACT(EPOCH FROM r.runtime),
          'query', r.query
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 2) Sessões bloqueadas há mais de 5 minutos aguardando lock
  FOR r IN
    SELECT a.pid, a.usename, a.wait_event_type, a.wait_event,
           now() - a.state_change AS blocked_for,
           pg_blocking_pids(a.pid) AS blockers,
           left(a.query, 500) AS query
      FROM pg_stat_activity a
     WHERE a.wait_event_type = 'Lock'
       AND a.state_change IS NOT NULL
       AND now() - a.state_change > interval '5 minutes'
       AND a.backend_type = 'client backend'
  LOOP
    v_alert_type := 'pg_activity.lock_blocked.' || r.pid;
    SELECT EXISTS(
      SELECT 1 FROM public.system_alerts
       WHERE alert_type = v_alert_type
         AND created_at > now() - interval '30 minutes'
    ) INTO v_exists;

    IF NOT v_exists THEN
      INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
      VALUES (
        v_alert_type,
        'HIGH',
        format('Sessão bloqueada há %s (pid=%s, bloqueada por %s)',
               r.blocked_for, r.pid, r.blockers),
        jsonb_build_object(
          'pid', r.pid, 'user', r.usename,
          'wait_event', r.wait_event,
          'blocked_seconds', EXTRACT(EPOCH FROM r.blocked_for),
          'blocking_pids', r.blockers,
          'query', r.query
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pg_activity_watchdog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pg_activity_watchdog() TO service_role;

-- Agenda a cada 2 minutos
DO $$
BEGIN
  PERFORM cron.unschedule('pg-activity-watchdog');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'pg-activity-watchdog',
  '*/2 * * * *',
  $$ SELECT public.pg_activity_watchdog(); $$
);
