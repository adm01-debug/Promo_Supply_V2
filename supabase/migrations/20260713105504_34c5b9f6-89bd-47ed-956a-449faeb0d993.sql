
CREATE OR REPLACE FUNCTION public.scan_temp_files_spill()
RETURNS TABLE(datname text, delta_files bigint, delta_bytes bigint, severity text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rec RECORD;
  v_sev text;
  v_dedupe_key text;
BEGIN
  -- 1) Captura snapshot atual
  INSERT INTO public.temp_file_snapshots(datname, temp_files, temp_bytes, stats_reset)
  SELECT d.datname, d.temp_files, d.temp_bytes, d.stats_reset
  FROM pg_stat_database d
  WHERE d.datname = current_database();

  -- 2) Compara com snapshot ~15min atrás (mesmo stats_reset)
  FOR rec IN
    WITH curr AS (
      SELECT * FROM public.temp_file_snapshots
      WHERE datname = current_database()
      ORDER BY captured_at DESC LIMIT 1
    ),
    prev AS (
      SELECT * FROM public.temp_file_snapshots
      WHERE datname = current_database()
        AND captured_at <= now() - interval '10 minutes'
      ORDER BY captured_at DESC LIMIT 1
    )
    SELECT
      curr.datname,
      (curr.temp_files - prev.temp_files) AS d_files,
      (curr.temp_bytes - prev.temp_bytes) AS d_bytes,
      curr.stats_reset = prev.stats_reset AS same_reset
    FROM curr, prev
  LOOP
    IF NOT rec.same_reset OR rec.d_bytes IS NULL OR rec.d_bytes <= 0 THEN
      CONTINUE;
    END IF;

    v_sev := CASE
      WHEN rec.d_bytes >= 10*1024*1024*1024 THEN 'CRITICAL'
      WHEN rec.d_bytes >= 1024*1024*1024    THEN 'HIGH'
      WHEN rec.d_bytes >= 100*1024*1024     THEN 'MEDIUM'
      ELSE NULL
    END;

    CONTINUE WHEN v_sev IS NULL;

    v_dedupe_key := 'temp_spill:' || rec.datname;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE (metadata->>'dedupe_key') = v_dedupe_key
        AND status = 'open'
        AND created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata, status)
      VALUES (
        'temp_file_spill',
        v_sev,
        format('Spill em disco: %s em %s arquivos', pg_size_pretty(rec.d_bytes), rec.d_files),
        format('Banco %s derramou %s (%s arquivos) nos últimos ~15 min. Provável falta de work_mem em sorts/hash joins.',
               rec.datname, pg_size_pretty(rec.d_bytes), rec.d_files),
        jsonb_build_object(
          'dedupe_key', v_dedupe_key,
          'delta_files', rec.d_files,
          'delta_bytes', rec.d_bytes,
          'diagnostic_sql',
            'SELECT query, calls, temp_blks_read, temp_blks_written FROM pg_stat_statements ORDER BY temp_blks_written DESC LIMIT 20;',
          'hint', 'Aumente work_mem por sessão (SET LOCAL work_mem) nas queries pesadas, ou crie índices para eliminar sorts/hashes grandes.'
        ),
        'open'
      );
    END IF;

    datname := rec.datname;
    delta_files := rec.d_files;
    delta_bytes := rec.d_bytes;
    severity := v_sev;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_temp_files_spill() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_temp_files_spill() TO service_role;

-- Cron a cada 15 minutos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-temp-spill-15m') THEN
    PERFORM cron.unschedule('scan-temp-spill-15m');
  END IF;
  PERFORM cron.schedule(
    'scan-temp-spill-15m',
    '*/15 * * * *',
    $cron$ SELECT public.scan_temp_files_spill(); $cron$
  );
END $$;
