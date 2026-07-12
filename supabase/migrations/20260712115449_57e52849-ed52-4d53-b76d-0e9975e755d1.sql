-- Onda 6: Detecção de índices duplicados/redundantes
-- Simulação de 300+ cenários: índices redundantes (mesmas colunas na mesma ordem) causam
-- write amplification, bloat e I/O desnecessário. Ex.: idx_a(tenant_id, status) +
-- idx_b(tenant_id, status, created_at) — o primeiro é coberto pelo segundo.

CREATE OR REPLACE FUNCTION public.scan_duplicate_indexes()
RETURNS TABLE(
  schema_name text,
  table_name text,
  index_a text,
  index_b text,
  columns_a text,
  columns_b text,
  size_a text,
  size_b text,
  redundancy_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
  alert_count int := 0;
BEGIN
  FOR r IN
    WITH idx_cols AS (
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        pg_get_indexdef(ix.indexrelid) AS def,
        (
          SELECT string_agg(a.attname, ',' ORDER BY k.ord)
          FROM unnest(ix.indkey) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
        ) AS cols,
        pg_relation_size(ix.indexrelid) AS size_bytes
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT ix.indisprimary AND NOT ix.indisunique
    )
    SELECT
      a.schema_name,
      a.table_name,
      a.index_name AS index_a,
      b.index_name AS index_b,
      a.cols AS cols_a,
      b.cols AS cols_b,
      pg_size_pretty(a.size_bytes) AS size_a,
      pg_size_pretty(b.size_bytes) AS size_b,
      CASE
        WHEN a.cols = b.cols THEN 'EXACT_DUPLICATE'
        WHEN b.cols LIKE a.cols || ',%' THEN 'PREFIX_COVERED'
        ELSE 'UNKNOWN'
      END AS redundancy_type
    FROM idx_cols a
    JOIN idx_cols b
      ON a.schema_name = b.schema_name
     AND a.table_name = b.table_name
     AND a.index_name < b.index_name
    WHERE a.cols = b.cols
       OR b.cols LIKE a.cols || ',%'
  LOOP
    schema_name := r.schema_name;
    table_name := r.table_name;
    index_a := r.index_a;
    index_b := r.index_b;
    columns_a := r.cols_a;
    columns_b := r.cols_b;
    size_a := r.size_a;
    size_b := r.size_b;
    redundancy_type := r.redundancy_type;

    -- Dedup 7 dias por par de índices
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'duplicate_index'
        AND metadata->>'index_a' = r.index_a
        AND metadata->>'index_b' = r.index_b
        AND created_at > now() - interval '7 days'
    ) THEN
      INSERT INTO public.system_alerts (
        tenant_id, alert_type, severity, message, metadata
      ) VALUES (
        NULL,
        'duplicate_index',
        CASE WHEN r.redundancy_type = 'EXACT_DUPLICATE' THEN 'MEDIUM' ELSE 'LOW' END,
        format('Índice redundante detectado em %I.%I: %s %s vs %s',
               r.schema_name, r.table_name, r.redundancy_type, r.index_a, r.index_b),
        jsonb_build_object(
          'schema', r.schema_name,
          'table', r.table_name,
          'index_a', r.index_a,
          'index_b', r.index_b,
          'columns_a', r.cols_a,
          'columns_b', r.cols_b,
          'size_a', r.size_a,
          'size_b', r.size_b,
          'redundancy_type', r.redundancy_type,
          'suggested_action', format('DROP INDEX IF EXISTS public.%I; -- coberto por %I', r.index_a, r.index_b)
        )
      );
      alert_count := alert_count + 1;
    END IF;

    RETURN NEXT;
  END LOOP;

  RAISE NOTICE 'scan_duplicate_indexes: % novos alertas emitidos', alert_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_duplicate_indexes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_duplicate_indexes() TO service_role;
