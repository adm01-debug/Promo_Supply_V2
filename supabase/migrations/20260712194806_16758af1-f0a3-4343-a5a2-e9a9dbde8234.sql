
CREATE OR REPLACE FUNCTION public.scan_unindexed_foreign_keys()
RETURNS TABLE (
  child_table  text,
  fk_name      text,
  fk_columns   text,
  parent_table text,
  child_rows   bigint,
  severity     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dedup_days int := 7;
  v_rec        record;
BEGIN
  FOR v_rec IN
    WITH fks AS (
      SELECT
        cn.nspname                     AS child_schema,
        cc.relname                     AS child_tbl,
        con.conname                    AS fk,
        con.conkey                     AS fk_cols,
        pn.nspname || '.' || pc.relname AS parent_full,
        cc.oid                         AS child_oid,
        cc.reltuples::bigint           AS child_rows
      FROM pg_constraint con
      JOIN pg_class      cc ON cc.oid = con.conrelid
      JOIN pg_namespace  cn ON cn.oid = cc.relnamespace
      JOIN pg_class      pc ON pc.oid = con.confrelid
      JOIN pg_namespace  pn ON pn.oid = pc.relnamespace
      WHERE con.contype = 'f'
        AND cn.nspname = 'public'
    ),
    -- Um FK é "coberto" se existe índice cujo prefixo de indkey é igual ao fk_cols.
    covered AS (
      SELECT f.child_schema, f.child_tbl, f.fk
      FROM fks f
      WHERE EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = f.child_oid
          AND i.indisvalid
          AND (i.indkey::int2[])[0:array_length(f.fk_cols, 1) - 1] = f.fk_cols
      )
    )
    SELECT
      f.child_schema,
      f.child_tbl,
      f.fk,
      f.fk_cols,
      f.parent_full,
      f.child_rows,
      (
        SELECT string_agg(a.attname, ',' ORDER BY x.ord)
        FROM unnest(f.fk_cols) WITH ORDINALITY AS x(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = f.child_oid AND a.attnum = x.attnum
      ) AS fk_cols_text
    FROM fks f
    WHERE NOT EXISTS (
      SELECT 1 FROM covered c
      WHERE c.child_schema = f.child_schema
        AND c.child_tbl    = f.child_tbl
        AND c.fk           = f.fk
    )
  LOOP
    child_table  := v_rec.child_schema || '.' || v_rec.child_tbl;
    fk_name      := v_rec.fk;
    fk_columns   := v_rec.fk_cols_text;
    parent_table := v_rec.parent_full;
    child_rows   := v_rec.child_rows;
    severity     := CASE WHEN v_rec.child_rows > 100000 THEN 'HIGH' ELSE 'MEDIUM' END;
    RETURN NEXT;

    CONTINUE WHEN severity <> 'HIGH';

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'unindexed_fk'
        AND (metadata->>'fk_name') = v_rec.fk
        AND (metadata->>'child_table') = child_table
        AND created_at > now() - (v_dedup_days || ' days')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'unindexed_fk',
        severity,
        format('[%s] FK sem índice em %s(%s) → %s',
               severity, child_table, fk_columns, parent_table),
        format('A foreign key %s em %s(%s) referencia %s mas não tem índice de suporte no lado child (~%s linhas). DELETE/UPDATE no pai faz Seq Scan e lock prolongado.',
               fk_name, child_table, fk_columns, parent_table, child_rows),
        jsonb_build_object(
          'fk_name',      fk_name,
          'child_table',  child_table,
          'parent_table', parent_table,
          'fk_columns',   fk_columns,
          'child_rows',   child_rows,
          'fix_sql',
            format('CREATE INDEX CONCURRENTLY IF NOT EXISTS %I ON %I.%I (%s);',
                   'idx_' || v_rec.child_tbl || '_fk_' || replace(fk_columns, ',', '_'),
                   v_rec.child_schema, v_rec.child_tbl, fk_columns),
          'diagnostic_sql',
            format('EXPLAIN (ANALYZE, BUFFERS) DELETE FROM %s WHERE id = ''<uuid>'' RETURNING id;',
                   parent_table)
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_unindexed_foreign_keys() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_unindexed_foreign_keys() TO service_role;

COMMENT ON FUNCTION public.scan_unindexed_foreign_keys() IS
  'Onda 22: Detecta FKs sem índice cobrindo as colunas no lado child (causa Seq Scan em DELETE/UPDATE no pai).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-unindexed-fks-weekly') THEN
      PERFORM cron.unschedule('scan-unindexed-fks-weekly');
    END IF;
    PERFORM cron.schedule(
      'scan-unindexed-fks-weekly',
      '30 5 * * 1',
      $cron$ SELECT public.scan_unindexed_foreign_keys(); $cron$
    );
  END IF;
END $$;
