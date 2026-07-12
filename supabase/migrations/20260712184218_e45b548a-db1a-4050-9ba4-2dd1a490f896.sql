
CREATE TABLE IF NOT EXISTS public.checkpoint_snapshots (
  id                bigserial PRIMARY KEY,
  captured_at       timestamptz NOT NULL DEFAULT now(),
  num_timed         bigint NOT NULL,
  num_requested     bigint NOT NULL,
  write_time_ms     double precision NOT NULL,
  sync_time_ms      double precision NOT NULL,
  buffers_written   bigint NOT NULL,
  bgw_buffers_clean bigint NOT NULL,
  bgw_maxwritten    bigint NOT NULL,
  bgw_buffers_alloc bigint NOT NULL,
  ckpt_stats_reset  timestamptz,
  bgw_stats_reset   timestamptz
);

GRANT SELECT ON public.checkpoint_snapshots TO authenticated;
GRANT ALL ON public.checkpoint_snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.checkpoint_snapshots_id_seq TO service_role;

ALTER TABLE public.checkpoint_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ckpt_snapshots_admin_read"
  ON public.checkpoint_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_checkpoint_snapshots_captured_at
  ON public.checkpoint_snapshots (captured_at DESC);

-- Scanner
CREATE OR REPLACE FUNCTION public.scan_checkpoint_health(
  warn_requested_pct   numeric DEFAULT 25,   -- HIGH se > 25% dos checkpoints forem "requested"
  crit_requested_pct   numeric DEFAULT 50,   -- CRITICAL se > 50%
  warn_ckpt_per_min    numeric DEFAULT 0.4,  -- >0.4/min = mais de 1 a cada 2,5min
  crit_ckpt_per_min    numeric DEFAULT 1.0,
  warn_maxwritten_rate numeric DEFAULT 1.0   -- eventos maxwritten_clean por minuto
)
RETURNS TABLE(
  severity          text,
  requested_pct     numeric,
  ckpt_per_min      numeric,
  maxwritten_per_min numeric,
  avg_write_ms      numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_c            record;   -- current checkpointer
  v_b            record;   -- current bgwriter
  v_prev         record;   -- previous snapshot
  v_delta_secs   numeric;
  v_dt_timed     bigint;
  v_dt_req       bigint;
  v_dt_total     bigint;
  v_req_pct      numeric := 0;
  v_ckpt_pm      numeric := 0;
  v_dt_mw        bigint;
  v_mw_pm        numeric := 0;
  v_dt_wtime     double precision;
  v_avg_write    numeric := 0;
  v_severity     text := 'OK';
  v_reasons      text[] := ARRAY[]::text[];
  v_suggestions  text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_c FROM pg_stat_checkpointer;
  SELECT * INTO v_b FROM pg_stat_bgwriter;

  INSERT INTO public.checkpoint_snapshots(
    num_timed, num_requested, write_time_ms, sync_time_ms, buffers_written,
    bgw_buffers_clean, bgw_maxwritten, bgw_buffers_alloc,
    ckpt_stats_reset, bgw_stats_reset
  ) VALUES (
    v_c.num_timed, v_c.num_requested, v_c.write_time, v_c.sync_time, v_c.buffers_written,
    v_b.buffers_clean, v_b.maxwritten_clean, v_b.buffers_alloc,
    v_c.stats_reset, v_b.stats_reset
  );

  SELECT * INTO v_prev
  FROM public.checkpoint_snapshots
  WHERE captured_at < now() - interval '30 seconds'
  ORDER BY captured_at DESC
  LIMIT 1;

  IF v_prev IS NULL THEN
    RETURN QUERY SELECT 'OK'::text, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Se stats resetaram, pula esta rodada
  IF v_prev.ckpt_stats_reset IS DISTINCT FROM v_c.stats_reset
     OR v_prev.bgw_stats_reset IS DISTINCT FROM v_b.stats_reset THEN
    RETURN QUERY SELECT 'OK'::text, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  v_delta_secs := GREATEST(EXTRACT(EPOCH FROM (now() - v_prev.captured_at))::numeric, 1);
  v_dt_timed := v_c.num_timed     - v_prev.num_timed;
  v_dt_req   := v_c.num_requested - v_prev.num_requested;
  v_dt_total := v_dt_timed + v_dt_req;
  v_dt_mw    := v_b.maxwritten_clean - v_prev.bgw_maxwritten;
  v_dt_wtime := v_c.write_time - v_prev.write_time_ms;

  IF v_dt_total > 0 THEN
    v_req_pct   := round((v_dt_req::numeric / v_dt_total) * 100, 2);
    v_ckpt_pm   := round(v_dt_total / (v_delta_secs / 60.0), 3);
    v_avg_write := round((v_dt_wtime / v_dt_total)::numeric, 2);
  END IF;

  v_mw_pm := round(v_dt_mw / (v_delta_secs / 60.0), 3);

  -- Regras
  IF v_req_pct >= crit_requested_pct AND v_dt_total >= 2 THEN
    v_severity := 'CRITICAL';
    v_reasons := v_reasons || format('%s%% dos checkpoints foram "requested" (>= %s%%).', v_req_pct, crit_requested_pct);
    v_suggestions := v_suggestions || 'Aumentar max_wal_size (ex.: 2GB → 8GB) para reduzir checkpoints forçados por WAL.';
  ELSIF v_req_pct >= warn_requested_pct AND v_dt_total >= 2 THEN
    v_severity := GREATEST(v_severity, 'HIGH');
    v_reasons := v_reasons || format('%s%% dos checkpoints foram "requested" (>= %s%%).', v_req_pct, warn_requested_pct);
    v_suggestions := v_suggestions || 'Considerar aumentar max_wal_size.';
  END IF;

  IF v_ckpt_pm >= crit_ckpt_per_min THEN
    v_severity := 'CRITICAL';
    v_reasons := v_reasons || format('%s checkpoints/min (>= %s).', v_ckpt_pm, crit_ckpt_per_min);
    v_suggestions := v_suggestions || 'Elevar checkpoint_timeout (ex.: 5min → 15min) e/ou max_wal_size.';
  ELSIF v_ckpt_pm >= warn_ckpt_per_min THEN
    IF v_severity = 'OK' THEN v_severity := 'HIGH'; END IF;
    v_reasons := v_reasons || format('%s checkpoints/min (>= %s).', v_ckpt_pm, warn_ckpt_per_min);
    v_suggestions := v_suggestions || 'Considerar elevar checkpoint_timeout.';
  END IF;

  IF v_mw_pm >= warn_maxwritten_rate THEN
    IF v_severity = 'OK' THEN v_severity := 'HIGH'; END IF;
    v_reasons := v_reasons || format('bgwriter atingiu maxwritten_clean %s vezes/min.', v_mw_pm);
    v_suggestions := v_suggestions || 'Aumentar bgwriter_lru_maxpages e/ou reduzir bgwriter_delay.';
  END IF;

  IF v_severity <> 'OK' THEN
    INSERT INTO public.system_alerts(
      alert_type, severity, title, message, metadata, created_at
    ) VALUES (
      'db_checkpoint_health',
      v_severity,
      format('Checkpoint tuning: %s (req%%=%s, ckpt/min=%s)', v_severity, v_req_pct, v_ckpt_pm),
      array_to_string(v_reasons, ' | ') || ' Sugestões: ' || array_to_string(v_suggestions, ' | '),
      jsonb_build_object(
        'requested_pct', v_req_pct,
        'checkpoints_per_min', v_ckpt_pm,
        'maxwritten_per_min', v_mw_pm,
        'avg_write_time_ms', v_avg_write,
        'delta_seconds', v_delta_secs,
        'delta_num_timed', v_dt_timed,
        'delta_num_requested', v_dt_req,
        'delta_buffers_written', v_c.buffers_written - v_prev.buffers_written,
        'delta_buffers_clean', v_b.buffers_clean - v_prev.bgw_buffers_clean,
        'delta_buffers_alloc', v_b.buffers_alloc - v_prev.bgw_buffers_alloc,
        'suggestions', v_suggestions,
        'reasons', v_reasons,
        'wave', 12
      ),
      now()
    );
  END IF;

  DELETE FROM public.checkpoint_snapshots WHERE captured_at < now() - interval '24 hours';

  RETURN QUERY SELECT v_severity, v_req_pct, v_ckpt_pm, v_mw_pm, v_avg_write;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_checkpoint_health(numeric, numeric, numeric, numeric, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_checkpoint_health(numeric, numeric, numeric, numeric, numeric)
  TO service_role;
