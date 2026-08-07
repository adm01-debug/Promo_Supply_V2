
-- Tabela de snapshots
CREATE TABLE IF NOT EXISTS public.wal_rate_snapshots (
  id           bigserial PRIMARY KEY,
  captured_at  timestamptz NOT NULL DEFAULT now(),
  wal_bytes    numeric NOT NULL,
  wal_records  bigint  NOT NULL,
  wal_fpi      bigint  NOT NULL,
  stats_reset  timestamptz
);

GRANT SELECT ON public.wal_rate_snapshots TO authenticated;
GRANT ALL ON public.wal_rate_snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wal_rate_snapshots_id_seq TO service_role;

ALTER TABLE public.wal_rate_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wal_snapshots_admin_read"
  ON public.wal_rate_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wal_rate_snapshots_captured_at
  ON public.wal_rate_snapshots (captured_at DESC);

-- Scanner
CREATE OR REPLACE FUNCTION public.scan_wal_generation_rate(
  warn_mb_per_min  numeric DEFAULT 50,
  crit_mb_per_min  numeric DEFAULT 200,
  spike_multiplier numeric DEFAULT 3.0
)
RETURNS TABLE(
  severity           text,
  mb_per_min         numeric,
  baseline_mb_per_min numeric,
  delta_seconds      numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cur_bytes    numeric;
  v_cur_records  bigint;
  v_cur_fpi      bigint;
  v_cur_reset    timestamptz;
  v_prev         record;
  v_delta_bytes  numeric;
  v_delta_secs   numeric;
  v_rate_mbmin   numeric;
  v_baseline     numeric;
  v_severity     text := 'OK';
  v_reason       text := '';
BEGIN
  -- Leitura atual
  SELECT wal_bytes, wal_records, wal_fpi, stats_reset
    INTO v_cur_bytes, v_cur_records, v_cur_fpi, v_cur_reset
  FROM pg_stat_wal;

  -- Persiste snapshot
  INSERT INTO public.wal_rate_snapshots(wal_bytes, wal_records, wal_fpi, stats_reset)
  VALUES (v_cur_bytes, v_cur_records, v_cur_fpi, v_cur_reset);

  -- Snapshot anterior (o penúltimo agora)
  SELECT * INTO v_prev
  FROM public.wal_rate_snapshots
  WHERE captured_at < now() - interval '30 seconds'
  ORDER BY captured_at DESC
  LIMIT 1;

  IF v_prev IS NULL THEN
    -- Sem histórico ainda; retorna sem alerta
    RETURN QUERY SELECT 'OK'::text, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Se stats_reset mudou, deltas negativos → ignora esta rodada
  IF v_prev.stats_reset IS DISTINCT FROM v_cur_reset THEN
    RETURN QUERY SELECT 'OK'::text, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  v_delta_bytes := v_cur_bytes - v_prev.wal_bytes;
  v_delta_secs  := GREATEST(EXTRACT(EPOCH FROM (now() - v_prev.captured_at))::numeric, 1);
  v_rate_mbmin  := round((v_delta_bytes / 1048576.0) / (v_delta_secs / 60.0), 3);

  -- Baseline: média das últimas 12 amostras (exclui a atual e a comparação imediata)
  SELECT round(avg(rate), 3) INTO v_baseline
  FROM (
    SELECT
      (wal_bytes - lag(wal_bytes) OVER (ORDER BY captured_at))
        / NULLIF(EXTRACT(EPOCH FROM (captured_at - lag(captured_at) OVER (ORDER BY captured_at))), 0)
        / 1048576.0 * 60.0 AS rate
    FROM public.wal_rate_snapshots
    WHERE captured_at > now() - interval '2 hours'
      AND captured_at < v_prev.captured_at
    ORDER BY captured_at DESC
    LIMIT 12
  ) t
  WHERE rate IS NOT NULL AND rate >= 0;

  -- Classificação
  IF v_rate_mbmin >= crit_mb_per_min THEN
    v_severity := 'CRITICAL';
    v_reason := format('Taxa absoluta %s MB/min >= %s (crit).', v_rate_mbmin, crit_mb_per_min);
  ELSIF v_rate_mbmin >= warn_mb_per_min THEN
    v_severity := 'HIGH';
    v_reason := format('Taxa absoluta %s MB/min >= %s (warn).', v_rate_mbmin, warn_mb_per_min);
  ELSIF v_baseline IS NOT NULL AND v_baseline > 1
        AND v_rate_mbmin >= v_baseline * spike_multiplier THEN
    v_severity := 'HIGH';
    v_reason := format('Pico anômalo: %s MB/min é %sx o baseline (%s).',
                       v_rate_mbmin, round(v_rate_mbmin / v_baseline, 2), v_baseline);
  END IF;

  IF v_severity <> 'OK' THEN
    INSERT INTO public.system_alerts(
      alert_type, severity, title, message, metadata, created_at
    ) VALUES (
      'db_wal_generation_rate',
      v_severity,
      format('Geração de WAL em %s MB/min', v_rate_mbmin),
      v_reason || ' Verificar bulk writes, VACUUM FULL, migrações em massa ou reindexações.',
      jsonb_build_object(
        'mb_per_min', v_rate_mbmin,
        'baseline_mb_per_min', v_baseline,
        'spike_multiplier', spike_multiplier,
        'delta_bytes', v_delta_bytes,
        'delta_seconds', v_delta_secs,
        'wal_records_delta', v_cur_records - v_prev.wal_records,
        'wal_fpi_delta', v_cur_fpi - v_prev.wal_fpi,
        'diagnostic_sql',
          'SELECT pid, usename, application_name, state, xact_start, left(query,200) '
          || 'FROM pg_stat_activity WHERE state=''active'' ORDER BY xact_start LIMIT 20;',
        'wave', 11
      ),
      now()
    );
  END IF;

  -- Limpeza: mantém 24h
  DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '24 hours';

  RETURN QUERY SELECT v_severity, v_rate_mbmin, coalesce(v_baseline, 0), v_delta_secs;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_wal_generation_rate(numeric, numeric, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_wal_generation_rate(numeric, numeric, numeric)
  TO service_role;
