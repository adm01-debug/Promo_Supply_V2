
-- Onda 7: Scanner de tabelas candidatas a partitioning
-- Detecta tabelas grandes (>10GB) não particionadas em pg_partitioned_table,
-- especialmente time-series (com coluna created_at/occurred_at/timestamp),
-- e emite alerta com sugestão de PARTITION BY RANGE (created_at).

CREATE OR REPLACE FUNCTION public.scan_partition_candidates(min_size_gb numeric DEFAULT 10)
RETURNS TABLE(
  table_name text,
  size_gb numeric,
  row_estimate bigint,
  time_column text,
  suggested_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
  v_time_col text;
  v_size_bytes bigint;
  v_size_gb numeric;
  v_rows bigint;
  v_suggestion text;
  v_dedup_key text;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, n.nspname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'  -- ordinary table (not already partitioned 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_partitioned_table pt WHERE pt.partrelid = c.oid
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid  -- skip partition children
      )
  LOOP
    v_size_bytes := pg_total_relation_size(r.oid);
    v_size_gb := ROUND((v_size_bytes / (1024.0 * 1024 * 1024))::numeric, 2);

    IF v_size_gb < min_size_gb THEN
      CONTINUE;
    END IF;

    SELECT reltuples::bigint INTO v_rows FROM pg_class WHERE oid = r.oid;

    -- Detect first plausible time column
    SELECT a.attname INTO v_time_col
    FROM pg_attribute a
    WHERE a.attrelid = r.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname = ANY(ARRAY['created_at','occurred_at','event_time','timestamp','ts','logged_at','recorded_at'])
    ORDER BY array_position(
      ARRAY['created_at','occurred_at','event_time','timestamp','ts','logged_at','recorded_at']::text[],
      a.attname
    )
    LIMIT 1;

    IF v_time_col IS NULL THEN
      v_suggestion := format(
        '-- Table %I.%I (%s GB, ~%s rows) has no time column; consider PARTITION BY HASH(tenant_id) or manual review.',
        r.nspname, r.relname, v_size_gb, v_rows
      );
    ELSE
      v_suggestion := format(
        E'-- Migrate %I.%I (%s GB, ~%s rows) to partitioned table:\n-- 1. CREATE TABLE %I.%I_p (LIKE %I.%I INCLUDING ALL) PARTITION BY RANGE (%I);\n-- 2. Create monthly partitions via pg_partman or manually.\n-- 3. Migrate data in batches + swap names in a maintenance window.',
        r.nspname, r.relname, v_size_gb, v_rows,
        r.nspname, r.relname, r.nspname, r.relname, v_time_col
      );
    END IF;

    -- Dedup 30 days per table
    v_dedup_key := format('partition_candidate:%s.%s', r.nspname, r.relname);
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE metadata->>'dedup_key' = v_dedup_key
        AND created_at > now() - interval '30 days'
    ) THEN
      INSERT INTO public.system_alerts (severity, source, title, description, metadata)
      VALUES (
        CASE WHEN v_size_gb > 50 THEN 'HIGH' ELSE 'MEDIUM' END,
        'scan_partition_candidates',
        format('Tabela grande candidata a partitioning: %I.%I (%s GB)', r.nspname, r.relname, v_size_gb),
        format('Tabela %I.%I atingiu %s GB (~%s linhas). Partitioning reduz I/O, acelera VACUUM e permite retenção por DROP PARTITION.', r.nspname, r.relname, v_size_gb, v_rows),
        jsonb_build_object(
          'dedup_key', v_dedup_key,
          'table', format('%I.%I', r.nspname, r.relname),
          'size_gb', v_size_gb,
          'row_estimate', v_rows,
          'time_column', v_time_col,
          'suggested_action', v_suggestion
        )
      );
    END IF;

    table_name := format('%I.%I', r.nspname, r.relname);
    size_gb := v_size_gb;
    row_estimate := v_rows;
    time_column := v_time_col;
    suggested_action := v_suggestion;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_partition_candidates(numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_partition_candidates(numeric) TO service_role;

-- Weekly cron: Wednesday 06:00 UTC
SELECT cron.schedule(
  'scan-partition-candidates-weekly',
  '0 6 * * 3',
  $cron$ SELECT public.scan_partition_candidates(10); $cron$
);
