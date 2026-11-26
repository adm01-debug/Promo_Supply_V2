
-- Snapshot histórico de temp files
CREATE TABLE IF NOT EXISTS public.temp_file_snapshots (
  id bigserial PRIMARY KEY,
  captured_at timestamptz NOT NULL DEFAULT now(),
  datname text NOT NULL,
  temp_files bigint NOT NULL,
  temp_bytes bigint NOT NULL,
  stats_reset timestamptz
);

GRANT ALL ON public.temp_file_snapshots TO service_role;
GRANT ALL ON SEQUENCE public.temp_file_snapshots_id_seq TO service_role;

ALTER TABLE public.temp_file_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_temp_file_snapshots"
  ON public.temp_file_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_temp_file_snapshots_captured_at
  ON public.temp_file_snapshots (captured_at DESC);

-- Scanner
CREATE OR REPLACE FUNCTION public.scan_temp_file_usage(
  warn_mb_per_min numeric DEFAULT 10,
  crit_mb_per_min numeric DEFAULT 100,
  warn_files_per_min numeric DEFAULT 5,
  crit_files_per_min numeric DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_now timestamptz := now();
  v_datname text := current_database();
  v_curr record;
  v_prev record;
  v_delta_seconds numeric;
  v_mb_per_min numeric;
  v_files_per_min numeric;
  v_severity text;
  v_dedupe interval := interval '24 hours';
BEGIN
  -- Retenção 24h
  DELETE FROM public.temp_file_snapshots WHERE captured_at < v_now - interval '24 hours';

  -- Snapshot atual
  SELECT temp_files, temp_bytes, stats_reset
    INTO v_curr
    FROM pg_stat_database
   WHERE datname = v_datname;

  IF v_curr IS NULL THEN RETURN; END IF;

  INSERT INTO public.temp_file_snapshots (captured_at, datname, temp_files, temp_bytes, stats_reset)
  VALUES (v_now, v_datname, v_curr.temp_files, v_curr.temp_bytes, v_curr.stats_reset);

  -- Baseline: snapshot anterior mais recente
  SELECT captured_at, temp_files, temp_bytes, stats_reset
    INTO v_prev
    FROM public.temp_file_snapshots
   WHERE datname = v_datname AND captured_at < v_now
   ORDER BY captured_at DESC
   LIMIT 1;

  IF v_prev IS NULL THEN RETURN; END IF;
  IF v_prev.stats_reset IS DISTINCT FROM v_curr.stats_reset THEN RETURN; END IF;

  v_delta_seconds := GREATEST(EXTRACT(EPOCH FROM (v_now - v_prev.captured_at)), 1);
  v_mb_per_min := ((v_curr.temp_bytes - v_prev.temp_bytes)::numeric / 1024 / 1024) / (v_delta_seconds / 60.0);
  v_files_per_min := ((v_curr.temp_files - v_prev.temp_files)::numeric) / (v_delta_seconds / 60.0);

  IF v_mb_per_min < 0 OR v_files_per_min < 0 THEN RETURN; END IF;

  v_severity := CASE
    WHEN v_mb_per_min >= crit_mb_per_min OR v_files_per_min >= crit_files_per_min THEN 'CRITICAL'
    WHEN v_mb_per_min >= warn_mb_per_min OR v_files_per_min >= warn_files_per_min THEN 'HIGH'
    ELSE NULL
  END;

  IF v_severity IS NULL THEN RETURN; END IF;

  -- Dedupe 24h
  IF EXISTS (
    SELECT 1 FROM public.system_alerts
    WHERE alert_type = 'db_temp_file_spill'
      AND entity_id = v_datname
      AND created_at > v_now - v_dedupe
  ) THEN RETURN; END IF;

  INSERT INTO public.system_alerts (alert_type, severity, message, metadata, entity_id)
  VALUES (
    'db_temp_file_spill',
    v_severity,
    format('Temp file spill em %s: %.2f MB/min, %.2f arquivos/min (work_mem possivelmente insuficiente)',
           v_datname, v_mb_per_min, v_files_per_min),
    jsonb_build_object(
      'datname', v_datname,
      'mb_per_min', round(v_mb_per_min, 2),
      'files_per_min', round(v_files_per_min, 2),
      'delta_seconds', v_delta_seconds,
      'temp_bytes_delta', v_curr.temp_bytes - v_prev.temp_bytes,
      'temp_files_delta', v_curr.temp_files - v_prev.temp_files,
      'diagnostic_sql',
        'SELECT query, calls, temp_blks_read, temp_blks_written FROM pg_stat_statements ORDER BY temp_blks_written DESC LIMIT 20;',
      'suggested_action',
        'Investigar top consumers em pg_stat_statements. Considerar aumentar work_mem (sessão/role) para queries pesadas ou adicionar índice para eliminar sort.',
      'wave', 14
    ),
    v_datname
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_temp_file_usage(numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_temp_file_usage(numeric, numeric, numeric, numeric) TO service_role;

-- Cron a cada 10min
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('scan-temp-file-usage-10min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-temp-file-usage-10min');

    PERFORM cron.schedule(
      'scan-temp-file-usage-10min',
      '*/10 * * * *',
      $cmd$ SELECT public.scan_temp_file_usage(); $cmd$
    );
  END IF;
END $$;
