-- ============================================================
-- Habilitar extensões necessárias (idempotente)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Helper: URL base do projeto e chamada segura a edge function
-- ============================================================
CREATE OR REPLACE FUNCTION public._invoke_edge_function(_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_req_id BIGINT;
  v_url TEXT := 'https://trwgmplubeqxrxpncdgf.supabase.co/functions/v1/' || _name;
  v_anon TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyd2dtcGx1YmVxeHJ4cG5jZGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzY5MTgsImV4cCI6MjA5NDA1MjkxOH0.duCmV9VwETKxO6dI35u5cm9tDN1760EP3OoOjM3Iatg';
BEGIN
  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'x-request-id', gen_random_uuid()::text,
      'x-cron-invocation', 'true'
    ),
    body := jsonb_build_object('cron', true, 'invoked_at', now()),
    timeout_milliseconds := 30000
  ) INTO v_req_id;
  RETURN v_req_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._invoke_edge_function(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._invoke_edge_function(TEXT) TO service_role;

-- ============================================================
-- Unschedule jobs anteriores (idempotência ao re-rodar migration)
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT jobname FROM cron.job
    WHERE jobname IN ('alert-dispatcher-1min', 'outbox-worker-1min',
                      'cleanup-security-logs-daily', 'cleanup-audit-logs-daily',
                      'cleanup-telemetry-hourly')
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;
END $$;

-- ============================================================
-- Agendamentos
-- ============================================================
-- OBS-01: dispatcher a cada 1 min
SELECT cron.schedule(
  'alert-dispatcher-1min',
  '* * * * *',
  $$SELECT public._invoke_edge_function('alert-dispatcher');$$
);

-- INT-06: outbox worker a cada 1 min
SELECT cron.schedule(
  'outbox-worker-1min',
  '* * * * *',
  $$SELECT public._invoke_edge_function('process-outbox');$$
);

-- M-03: cleanups diários às 03:00 UTC (baixa carga)
SELECT cron.schedule(
  'cleanup-security-logs-daily',
  '0 3 * * *',
  $$SELECT public.cleanup_old_security_logs();$$
);

SELECT cron.schedule(
  'cleanup-audit-logs-daily',
  '15 3 * * *',
  $$SELECT public.cleanup_old_audit_logs();$$
);

-- Telemetry cleanup a cada hora (alto churn)
SELECT cron.schedule(
  'cleanup-telemetry-hourly',
  '30 * * * *',
  $$DELETE FROM public.query_telemetry WHERE created_at < NOW() - INTERVAL '30 days';$$
);