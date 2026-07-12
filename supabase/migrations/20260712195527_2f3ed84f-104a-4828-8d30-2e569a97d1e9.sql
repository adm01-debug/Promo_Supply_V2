
-- Tabela de auditoria dos runs
CREATE TABLE IF NOT EXISTS public.health_scan_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  total_scanners int NOT NULL DEFAULT 0,
  ok_count       int NOT NULL DEFAULT 0,
  failed_count   int NOT NULL DEFAULT 0,
  duration_ms    int,
  results        jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT SELECT ON public.health_scan_runs TO authenticated;
GRANT ALL    ON public.health_scan_runs TO service_role;

ALTER TABLE public.health_scan_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read health_scan_runs" ON public.health_scan_runs;
CREATE POLICY "Admins can read health_scan_runs"
  ON public.health_scan_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_health_scan_runs_started_at
  ON public.health_scan_runs (started_at DESC);

-- Orquestrador
CREATE OR REPLACE FUNCTION public.run_all_health_scans()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_run_id       uuid := gen_random_uuid();
  v_started      timestamptz := clock_timestamp();
  v_scanner      text;
  v_scan_start   timestamptz;
  v_scan_ms      int;
  v_results      jsonb := '[]'::jsonb;
  v_ok           int := 0;
  v_failed       int := 0;
  v_err          text;
  v_scanners     text[] := ARRAY[
    'scan_deadlocks_and_conflicts',
    'scan_autovacuum_starvation',
    'scan_toast_bloat',
    'scan_xid_wraparound',
    'scan_replication_slots',
    'scan_invalid_and_duplicate_indexes',
    'scan_unused_indexes',
    'scan_unindexed_foreign_keys',
    'scan_sequence_exhaustion',
    'scan_long_running_transactions',
    'scan_lock_waits',
    'scan_schema_hygiene',
    'scan_stale_alerts'
  ];
BEGIN
  INSERT INTO public.health_scan_runs (id, started_at, total_scanners)
    VALUES (v_run_id, v_started, array_length(v_scanners, 1));

  FOREACH v_scanner IN ARRAY v_scanners LOOP
    v_scan_start := clock_timestamp();
    BEGIN
      -- Executa; ignoramos o resultset (o efeito colateral é gravar alertas)
      EXECUTE format('SELECT count(*) FROM public.%I()', v_scanner);
      v_scan_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_scan_start)) * 1000)::int;
      v_ok := v_ok + 1;
      v_results := v_results || jsonb_build_object(
        'scanner', v_scanner, 'ok', true, 'duration_ms', v_scan_ms
      );
    EXCEPTION WHEN OTHERS THEN
      v_scan_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_scan_start)) * 1000)::int;
      v_failed := v_failed + 1;
      v_err := SQLERRM;
      v_results := v_results || jsonb_build_object(
        'scanner', v_scanner, 'ok', false, 'duration_ms', v_scan_ms, 'error', v_err
      );
    END;
  END LOOP;

  UPDATE public.health_scan_runs
     SET finished_at = clock_timestamp(),
         duration_ms = (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
         ok_count    = v_ok,
         failed_count = v_failed,
         results     = v_results
   WHERE id = v_run_id;

  IF v_failed > 0 THEN
    INSERT INTO public.system_alerts (alert_type, severity, title, description, message, metadata)
    VALUES (
      'health_scan_failure',
      'CRITICAL',
      format('[CRITICAL] %s scanner(s) falharam no run %s', v_failed, v_run_id),
      format('%s de %s scanners falharam. Ver health_scan_runs.', v_failed, array_length(v_scanners,1)),
      format('%s/%s scanners falharam', v_failed, array_length(v_scanners,1)),
      jsonb_build_object('run_id', v_run_id, 'results', v_results)
    );
  END IF;

  RETURN v_run_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_all_health_scans() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.run_all_health_scans() TO service_role;

COMMENT ON FUNCTION public.run_all_health_scans() IS
  'Onda 28: Orquestra todos os scanners de saúde com error isolation e timing; grava audit trail em health_scan_runs.';

-- Cron horário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-all-health-scans-hourly') THEN
      PERFORM cron.unschedule('run-all-health-scans-hourly');
    END IF;
    PERFORM cron.schedule(
      'run-all-health-scans-hourly',
      '17 * * * *',
      $cron$ SELECT public.run_all_health_scans(); $cron$
    );
  END IF;
END $$;

-- Retenção 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_health_scan_runs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  DELETE FROM public.health_scan_runs WHERE started_at < now() - interval '30 days';
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_health_scan_runs() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cleanup_health_scan_runs() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-health-scan-runs-daily') THEN
      PERFORM cron.unschedule('cleanup-health-scan-runs-daily');
    END IF;
    PERFORM cron.schedule(
      'cleanup-health-scan-runs-daily',
      '5 8 * * *',
      $cron$ SELECT public.cleanup_health_scan_runs(); $cron$
    );
  END IF;
END $$;
