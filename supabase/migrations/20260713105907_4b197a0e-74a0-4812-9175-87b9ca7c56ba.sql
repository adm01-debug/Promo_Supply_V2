
-- Onda 85: Monitor de crescimento de tabelas + detecção de bloat
CREATE TABLE IF NOT EXISTS public.table_size_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  total_bytes BIGINT NOT NULL,
  table_bytes BIGINT NOT NULL,
  index_bytes BIGINT NOT NULL,
  toast_bytes BIGINT NOT NULL DEFAULT 0,
  row_estimate BIGINT NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.table_size_snapshots TO authenticated;
GRANT ALL ON public.table_size_snapshots TO service_role;

ALTER TABLE public.table_size_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_table_size_snapshots"
  ON public.table_size_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_table_size_snapshots_captured
  ON public.table_size_snapshots (schema_name, table_name, captured_at DESC);

CREATE INDEX IF NOT EXISTS brin_table_size_snapshots_captured
  ON public.table_size_snapshots USING BRIN (captured_at);

-- Scanner: snapshot + delta vs 24h + alertas
CREATE OR REPLACE FUNCTION public.scan_table_growth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lock_key BIGINT := hashtext('scan_table_growth')::bigint;
  v_rec RECORD;
  v_prev RECORD;
  v_delta_bytes BIGINT;
  v_delta_pct NUMERIC;
  v_severity TEXT;
  v_alerts_created INT := 0;
  v_snapshots INT := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_running');
  END IF;

  -- Snapshot atual: apenas schema public + tabelas > 8MB (evita ruído)
  FOR v_rec IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      pg_total_relation_size(c.oid) AS total_bytes,
      pg_relation_size(c.oid) AS table_bytes,
      pg_indexes_size(c.oid) AS index_bytes,
      COALESCE(pg_total_relation_size(c.reltoastrelid), 0) AS toast_bytes,
      c.reltuples::bigint AS row_estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
      AND pg_total_relation_size(c.oid) > 8 * 1024 * 1024
  LOOP
    INSERT INTO public.table_size_snapshots(
      schema_name, table_name, total_bytes, table_bytes, index_bytes, toast_bytes, row_estimate
    ) VALUES (
      v_rec.schema_name, v_rec.table_name, v_rec.total_bytes, v_rec.table_bytes,
      v_rec.index_bytes, v_rec.toast_bytes, v_rec.row_estimate
    );
    v_snapshots := v_snapshots + 1;

    -- Delta vs snapshot ~24h atrás (janela 20-28h)
    SELECT total_bytes INTO v_prev
    FROM public.table_size_snapshots
    WHERE schema_name = v_rec.schema_name
      AND table_name = v_rec.table_name
      AND captured_at BETWEEN now() - interval '28 hours' AND now() - interval '20 hours'
    ORDER BY captured_at DESC
    LIMIT 1;

    IF v_prev.total_bytes IS NULL OR v_prev.total_bytes = 0 THEN
      CONTINUE;
    END IF;

    v_delta_bytes := v_rec.total_bytes - v_prev.total_bytes;
    v_delta_pct := (v_delta_bytes::numeric / v_prev.total_bytes::numeric) * 100;

    -- Thresholds: crítico 10GB/dia OU +500%, alto 1GB/dia OU +100%, médio 200MB OU +30%
    IF v_delta_bytes >= 10 * 1024^3 OR v_delta_pct >= 500 THEN
      v_severity := 'critical';
    ELSIF v_delta_bytes >= 1024^3 OR v_delta_pct >= 100 THEN
      v_severity := 'high';
    ELSIF v_delta_bytes >= 200 * 1024^2 OR v_delta_pct >= 30 THEN
      v_severity := 'medium';
    ELSE
      CONTINUE;
    END IF;

    -- Dedupe 12h por tabela+severidade
    IF EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'table_growth_spike'
        AND severity = v_severity
        AND metadata->>'table' = v_rec.schema_name || '.' || v_rec.table_name
        AND created_at > now() - interval '12 hours'
        AND (resolved_at IS NULL OR resolved_at > now() - interval '12 hours')
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.system_alerts(
      alert_type, severity, title, message, metadata
    ) VALUES (
      'table_growth_spike',
      v_severity,
      format('Crescimento anômalo em %I.%I (+%s / %s%%)',
        v_rec.schema_name, v_rec.table_name,
        pg_size_pretty(v_delta_bytes), round(v_delta_pct, 1)),
      format('Tabela cresceu %s em 24h (de %s para %s). Verificar: bloat, missing indexes, retenção.',
        pg_size_pretty(v_delta_bytes),
        pg_size_pretty(v_prev.total_bytes),
        pg_size_pretty(v_rec.total_bytes)),
      jsonb_build_object(
        'table', v_rec.schema_name || '.' || v_rec.table_name,
        'delta_bytes', v_delta_bytes,
        'delta_pct', round(v_delta_pct, 2),
        'total_bytes', v_rec.total_bytes,
        'total_pretty', pg_size_pretty(v_rec.total_bytes),
        'prev_bytes', v_prev.total_bytes,
        'row_estimate', v_rec.row_estimate,
        'diagnostic_sql', format('SELECT * FROM pg_stat_user_tables WHERE relname = %L;', v_rec.table_name),
        'fix_hint', 'Se rows não cresceram proporcionalmente → VACUUM FULL. Se index_bytes dominante → REINDEX. Se toast dominante → revisar colunas TEXT/JSONB.'
      )
    );
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  -- Housekeeping: retém 30 dias de snapshots
  DELETE FROM public.table_size_snapshots WHERE captured_at < now() - interval '30 days';

  RETURN jsonb_build_object(
    'snapshots', v_snapshots,
    'alerts_created', v_alerts_created,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.scan_table_growth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_table_growth() TO service_role;

-- Agenda diária às 03:17 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan_table_growth_daily') THEN
    PERFORM cron.unschedule('scan_table_growth_daily');
  END IF;
  PERFORM cron.schedule(
    'scan_table_growth_daily',
    '17 3 * * *',
    $cron$ SELECT public.scan_table_growth(); $cron$
  );
END $$;
