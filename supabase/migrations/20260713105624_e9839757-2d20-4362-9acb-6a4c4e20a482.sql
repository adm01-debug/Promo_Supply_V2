
CREATE OR REPLACE FUNCTION public.scan_idle_in_transaction()
RETURNS TABLE(pid int, idle_seconds numeric, aborted boolean, severity text)
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
    SELECT
      a.pid,
      a.usename,
      a.application_name,
      a.state,
      (a.state = 'idle in transaction (aborted)') AS is_aborted,
      EXTRACT(EPOCH FROM (now() - a.state_change))::numeric AS idle_s,
      EXTRACT(EPOCH FROM (now() - a.xact_start))::numeric AS xact_age_s,
      a.query
    FROM pg_stat_activity a
    WHERE a.state IN ('idle in transaction', 'idle in transaction (aborted)')
      AND a.pid <> pg_backend_pid()
      AND a.backend_type = 'client backend'
      AND a.state_change < now() - interval '2 minutes'
  LOOP
    v_sev := CASE
      WHEN rec.is_aborted AND rec.idle_s >= 300 THEN 'CRITICAL'
      WHEN rec.idle_s >= 1800 THEN 'CRITICAL'
      WHEN rec.idle_s >= 600  THEN 'HIGH'
      ELSE 'MEDIUM'
    END;

    v_dedupe_key := 'idle_in_txn:' || rec.pid::text;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE (metadata->>'dedupe_key') = v_dedupe_key
        AND status = 'open'
        AND created_at > now() - interval '30 minutes'
    ) THEN
      INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata, status)
      VALUES (
        'idle_in_transaction',
        v_sev,
        format('Sessão %s idle-in-transaction%s há %ss',
               rec.pid,
               CASE WHEN rec.is_aborted THEN ' (aborted)' ELSE '' END,
               round(rec.idle_s)),
        format('User=%s app=%s xact_age=%ss last_query=%s',
               COALESCE(rec.usename,'?'),
               COALESCE(rec.application_name,''),
               round(rec.xact_age_s),
               left(COALESCE(rec.query,''), 500)),
        jsonb_build_object(
          'dedupe_key', v_dedupe_key,
          'pid', rec.pid,
          'idle_seconds', rec.idle_s,
          'xact_age_seconds', rec.xact_age_s,
          'aborted', rec.is_aborted,
          'diagnostic_sql',
            'SELECT pid, state, xact_start, state_change, backend_xmin, query FROM pg_stat_activity WHERE pid = ' || rec.pid || ';',
          'fix_sql_cancel', 'SELECT pg_cancel_backend(' || rec.pid || ');',
          'fix_sql_terminate', 'SELECT pg_terminate_backend(' || rec.pid || ');',
          'hint', 'Bug clássico: BEGIN sem COMMIT/ROLLBACK. Segura xmin (bloqueia vacuum) e locks. Verifique pooler e finalização de transações no client.'
        ),
        'open'
      );
    END IF;

    pid := rec.pid;
    idle_seconds := rec.idle_s;
    aborted := rec.is_aborted;
    severity := v_sev;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_idle_in_transaction() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_idle_in_transaction() TO service_role;

-- Cron a cada 2 minutos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-idle-in-txn-2m') THEN
    PERFORM cron.unschedule('scan-idle-in-txn-2m');
  END IF;
  PERFORM cron.schedule(
    'scan-idle-in-txn-2m',
    '*/2 * * * *',
    $cron$ SELECT public.scan_idle_in_transaction(); $cron$
  );
END $$;
