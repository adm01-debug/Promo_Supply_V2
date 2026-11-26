
CREATE OR REPLACE FUNCTION public.scan_unused_indexes()
RETURNS TABLE (
  index_name text,
  table_name text,
  idx_scan   bigint,
  index_size text,
  severity   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dedup_days     int := 7;
  v_min_stat_age   interval := interval '7 days';
  v_stats_reset_at timestamptz;
  v_rec            record;
BEGIN
  -- Idade da coleta de estatísticas: se stats_reset é recente, os dados não
  -- são confiáveis o suficiente para recomendar DROP.
  SELECT stats_reset INTO v_stats_reset_at
  FROM pg_stat_database
  WHERE datname = current_database();

  IF v_stats_reset_at IS NULL
     OR (now() - v_stats_reset_at) < v_min_stat_age THEN
    RAISE NOTICE 'Stats resetadas há menos de 7 dias (%). Scanner abortado para evitar falsos positivos.', v_stats_reset_at;
    RETURN;
  END IF;

  FOR v_rec IN
    SELECT
      s.schemaname                                       AS schema_name,
      s.indexrelname                                     AS idx_name,
      s.relname                                          AS tbl_name,
      s.idx_scan                                         AS n_scans,
      pg_relation_size(s.indexrelid)                     AS idx_bytes,
      pg_size_pretty(pg_relation_size(s.indexrelid))     AS idx_size,
      i.indisunique,
      i.indisprimary,
      i.indisvalid
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON i.indexrelid = s.indexrelid
    WHERE s.schemaname = 'public'
      AND i.indisvalid
      AND NOT i.indisprimary
      AND NOT i.indisunique                       -- preserva PK/UNIQUE
      AND pg_relation_size(s.indexrelid) > 10485760  -- >10MB
      AND s.idx_scan < 10
  LOOP
    index_name := v_rec.idx_name;
    table_name := v_rec.tbl_name;
    idx_scan   := v_rec.n_scans;
    index_size := v_rec.idx_size;
    severity   := CASE
      WHEN v_rec.n_scans = 0 AND v_rec.idx_bytes > 104857600 THEN 'HIGH'
      ELSE 'MEDIUM'
    END;
    RETURN NEXT;

    CONTINUE WHEN severity <> 'HIGH';

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'unused_index'
        AND (metadata->>'index_name') = v_rec.idx_name
        AND created_at > now() - (v_dedup_days || ' days')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'unused_index',
        severity,
        format('[%s] Índice não utilizado %s.%s (%s, %s scans)',
               severity, v_rec.schema_name, v_rec.idx_name,
               v_rec.idx_size, v_rec.n_scans),
        format('O índice %s.%s (tabela %s) tem %s scans desde %s e ocupa %s. Considere DROP para liberar espaço e acelerar writes.',
               v_rec.schema_name, v_rec.idx_name, v_rec.tbl_name,
               v_rec.n_scans, v_stats_reset_at::date, v_rec.idx_size),
        jsonb_build_object(
          'index_name',       v_rec.idx_name,
          'table_name',       v_rec.tbl_name,
          'schema',           v_rec.schema_name,
          'idx_scan',         v_rec.n_scans,
          'size_bytes',       v_rec.idx_bytes,
          'stats_reset_at',   v_stats_reset_at,
          'fix_sql',          format('DROP INDEX CONCURRENTLY IF EXISTS %I.%I;',
                                     v_rec.schema_name, v_rec.idx_name),
          'diagnostic_sql',
            format('SELECT indexdef FROM pg_indexes WHERE schemaname=''%s'' AND indexname=''%s'';',
                   v_rec.schema_name, v_rec.idx_name),
          'safety_note',
            'Confirme em ambiente de staging antes do DROP; índices podem servir a jobs mensais/anuais que ainda não rodaram na janela de estatísticas.'
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_unused_indexes() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_unused_indexes() TO service_role;

COMMENT ON FUNCTION public.scan_unused_indexes() IS
  'Onda 21: Scanner de índices não utilizados (idx_scan < 10 e >10MB), com guarda de idade das estatísticas.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-unused-indexes-weekly') THEN
      PERFORM cron.unschedule('scan-unused-indexes-weekly');
    END IF;
    PERFORM cron.schedule(
      'scan-unused-indexes-weekly',
      '15 5 * * 1',
      $cron$ SELECT public.scan_unused_indexes(); $cron$
    );
  END IF;
END $$;
