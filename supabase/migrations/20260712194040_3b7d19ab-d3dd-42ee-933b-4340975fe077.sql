-- Onda 17: Scanner de TOAST Bloat
-- Detecta fragmentação/inflação em segmentos TOAST (colunas grandes)

CREATE OR REPLACE FUNCTION public.scan_toast_bloat(
  min_toast_mb NUMERIC DEFAULT 500,
  warn_ratio NUMERIC DEFAULT 3.0,
  crit_toast_mb NUMERIC DEFAULT 2048,
  crit_ratio NUMERIC DEFAULT 10.0
)
RETURNS TABLE(
  tablename TEXT,
  heap_mb NUMERIC,
  toast_mb NUMERIC,
  toast_ratio NUMERIC,
  severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_heap_mb NUMERIC;
  v_toast_mb NUMERIC;
  v_ratio NUMERIC;
  v_severity TEXT;
  v_large_cols TEXT;
BEGIN
  FOR r IN
    SELECT
      c.oid AS relid,
      c.relname::TEXT AS tbl,
      c.reltoastrelid,
      pg_relation_size(c.oid) AS heap_bytes,
      CASE WHEN c.reltoastrelid <> 0
        THEN pg_total_relation_size(c.reltoastrelid)
        ELSE 0
      END AS toast_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.reltoastrelid <> 0
  LOOP
    v_toast_mb := r.toast_bytes / 1024.0 / 1024.0;
    v_heap_mb := r.heap_bytes / 1024.0 / 1024.0;

    IF v_toast_mb < min_toast_mb THEN CONTINUE; END IF;

    v_ratio := CASE WHEN v_heap_mb > 0 THEN v_toast_mb / v_heap_mb ELSE 999.0 END;

    IF v_ratio < warn_ratio THEN CONTINUE; END IF;

    -- Severidade
    IF v_toast_mb >= crit_toast_mb OR v_ratio >= crit_ratio THEN
      v_severity := 'CRITICAL';
    ELSE
      v_severity := 'HIGH';
    END IF;

    -- Identificar colunas candidatas (TEXT/JSONB/BYTEA)
    SELECT string_agg(a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod), ', ')
    INTO v_large_cols
    FROM pg_attribute a
    WHERE a.attrelid = r.relid
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attstorage IN ('e','x') -- external/extended (candidatos a TOAST)
      AND pg_catalog.format_type(a.atttypid, a.atttypmod) IN ('text','jsonb','json','bytea')
    LIMIT 10;

    -- Dedupe: 7 dias por tabela
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'toast_bloat'
        AND metadata->>'tablename' = r.tbl
        AND created_at > now() - INTERVAL '7 days'
        AND resolved_at IS NULL
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, source, message, metadata)
      VALUES (
        'toast_bloat',
        v_severity,
        'scan_toast_bloat',
        format('Tabela public.%s com TOAST=%s MB (razão %sx sobre heap=%s MB)',
          r.tbl, round(v_toast_mb, 1), round(v_ratio, 2), round(v_heap_mb, 1)),
        jsonb_build_object(
          'tablename', r.tbl,
          'heap_mb', round(v_heap_mb, 2),
          'toast_mb', round(v_toast_mb, 2),
          'toast_ratio', round(v_ratio, 2),
          'large_columns', v_large_cols,
          'fix_sql_vacuum_full', format('VACUUM (FULL, ANALYZE) public.%I;', r.tbl),
          'fix_sql_pg_repack', format('pg_repack -t public.%I -k  # requer extensão pg_repack e janela de manutenção', r.tbl),
          'suggested_action', 'Considere normalizar colunas JSONB/TEXT muito grandes para tabela separada 1:1 ou aplicar compressão LZ4 (ALTER TABLE ... ALTER COLUMN ... SET COMPRESSION lz4)',
          'wave', 17,
          'runbook', 'DOCS/CODEBASE_ATLAS/09_OBSERVABILIDADE.md#onda-17'
        )
      );
    END IF;

    tablename := r.tbl;
    heap_mb := round(v_heap_mb, 2);
    toast_mb := round(v_toast_mb, 2);
    toast_ratio := round(v_ratio, 2);
    severity := v_severity;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_toast_bloat(NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_toast_bloat(NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO service_role;

-- Agendamento semanal (domingo 06:00 UTC)
SELECT cron.schedule(
  'scan-toast-bloat-weekly',
  '0 6 * * 0',
  $$SELECT public.scan_toast_bloat();$$
);
