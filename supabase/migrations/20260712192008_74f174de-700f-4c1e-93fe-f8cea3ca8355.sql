
CREATE OR REPLACE FUNCTION public.scan_tables_without_pk(
  min_rows_critical bigint DEFAULT 1000000,
  allowlist text[] DEFAULT ARRAY['schema_migrations','ar_internal_metadata']::text[]
)
RETURNS TABLE(
  table_name text,
  finding text,
  severity text,
  estimated_rows bigint,
  replica_identity text,
  in_publication boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dedup_window interval := interval '24 hours';
BEGIN
  RETURN QUERY
  WITH cand AS (
    SELECT
      c.oid,
      c.relname::text AS tbl,
      c.relreplident,
      c.reltuples::bigint AS est_rows,
      c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')                    -- ordinary + partitioned root
      AND c.relpersistence = 'p'                    -- permanent only
      AND NOT COALESCE(c.relispartition, false)     -- skip child partitions
      AND c.relname <> ALL (allowlist)
  ),
  enriched AS (
    SELECT
      cand.tbl,
      cand.relreplident,
      cand.est_rows,
      EXISTS(
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = cand.oid AND i.indisprimary
      ) AS has_pk,
      EXISTS(
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = cand.oid AND i.indisreplident AND i.indisvalid
      ) AS has_valid_replident_idx,
      EXISTS(
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = cand.oid AND i.indisreplident AND NOT i.indisvalid
      ) AS has_invalid_replident_idx,
      EXISTS(
        SELECT 1 FROM pg_publication_tables pt
        WHERE pt.schemaname = 'public' AND pt.tablename = cand.tbl
      ) AS in_pub
    FROM cand
  ),
  findings AS (
    -- 1) No primary key
    SELECT tbl, 'no_primary_key'::text AS finding, est_rows, relreplident, in_pub
    FROM enriched WHERE NOT has_pk
    UNION ALL
    -- 2) REPLICA IDENTITY NOTHING (always critical for logical replication)
    SELECT tbl, 'replica_identity_nothing'::text, est_rows, relreplident, in_pub
    FROM enriched WHERE relreplident = 'n'
    UNION ALL
    -- 3) DEFAULT identity without PK backing it
    SELECT tbl, 'replica_identity_default_no_pk'::text, est_rows, relreplident, in_pub
    FROM enriched WHERE relreplident = 'd' AND NOT has_pk
    UNION ALL
    -- 4) USING INDEX pointing to an invalid/dropped index
    SELECT tbl, 'replica_identity_using_dropped_index'::text, est_rows, relreplident, in_pub
    FROM enriched WHERE relreplident = 'i' AND has_invalid_replident_idx AND NOT has_valid_replident_idx
  )
  SELECT
    f.tbl,
    f.finding,
    CASE
      WHEN f.finding = 'replica_identity_nothing' THEN 'CRITICAL'
      WHEN f.in_pub THEN 'CRITICAL'
      WHEN f.est_rows >= min_rows_critical THEN 'CRITICAL'
      ELSE 'HIGH'
    END AS severity,
    f.est_rows,
    CASE f.relreplident
      WHEN 'd' THEN 'DEFAULT'
      WHEN 'n' THEN 'NOTHING'
      WHEN 'f' THEN 'FULL'
      WHEN 'i' THEN 'INDEX'
      ELSE f.relreplident::text
    END,
    f.in_pub
  FROM findings f;

  -- Persist alerts with 24h dedupe per (alert_type + entity_id)
  INSERT INTO public.system_alerts (alert_type, severity, message, metadata, entity_id)
  SELECT
    'db_missing_pk_or_replica_identity',
    r.severity,
    format('Tabela public.%s: %s (%s rows, identity=%s, in_publication=%s)',
           r.table_name, r.finding, r.estimated_rows, r.replica_identity, r.in_publication),
    jsonb_build_object(
      'table_name', r.table_name,
      'finding', r.finding,
      'estimated_rows', r.estimated_rows,
      'replica_identity', r.replica_identity,
      'in_publication', r.in_publication,
      'fix_sql', CASE r.finding
        WHEN 'no_primary_key' THEN
          format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(); ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id);',
                 r.table_name, r.table_name, r.table_name || '_pkey')
        WHEN 'replica_identity_default_no_pk' THEN
          format('ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id);  -- ou REPLICA IDENTITY FULL como fallback',
                 r.table_name, r.table_name || '_pkey')
        WHEN 'replica_identity_nothing' THEN
          format('ALTER TABLE public.%I REPLICA IDENTITY USING INDEX %I;  -- fallback: REPLICA IDENTITY FULL',
                 r.table_name, r.table_name || '_pkey')
        WHEN 'replica_identity_using_dropped_index' THEN
          format('REINDEX TABLE public.%I; -- ou ALTER TABLE public.%I REPLICA IDENTITY USING INDEX <valid_idx>',
                 r.table_name, r.table_name)
      END,
      'wave', 13
    ),
    r.table_name
  FROM public.scan_tables_without_pk(min_rows_critical, allowlist) r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.system_alerts sa
    WHERE sa.alert_type = 'db_missing_pk_or_replica_identity'
      AND sa.entity_id = r.table_name
      AND sa.created_at > now() - v_dedup_window
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_tables_without_pk(bigint, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_tables_without_pk(bigint, text[]) TO service_role;

-- Schedule daily at 05:15 UTC (low volatility; new tables are rare)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('scan-tables-without-pk-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-tables-without-pk-daily');

    PERFORM cron.schedule(
      'scan-tables-without-pk-daily',
      '15 5 * * *',
      $cmd$ SELECT public.scan_tables_without_pk(); $cmd$
    );
  END IF;
END $$;
