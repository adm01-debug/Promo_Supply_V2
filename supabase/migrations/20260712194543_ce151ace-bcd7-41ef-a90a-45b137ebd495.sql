
CREATE OR REPLACE FUNCTION public.scan_invalid_and_duplicate_indexes()
RETURNS TABLE (
  finding_type text,
  index_name   text,
  table_name   text,
  index_size   text,
  severity     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dedup_hours int := 24;
  v_rec         record;
BEGIN
  -- 1) Índices INVÁLIDOS ou NÃO-PRONTOS (schema public)
  FOR v_rec IN
    SELECT
      n.nspname                                    AS schema_name,
      c.relname                                    AS idx_name,
      t.relname                                    AS tbl_name,
      pg_relation_size(c.oid)                      AS idx_bytes,
      pg_size_pretty(pg_relation_size(c.oid))      AS idx_size,
      i.indisvalid,
      i.indisready
    FROM pg_index i
    JOIN pg_class  c ON c.oid = i.indexrelid
    JOIN pg_class  t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (i.indisvalid = false OR i.indisready = false)
  LOOP
    finding_type := 'invalid_index';
    index_name   := v_rec.idx_name;
    table_name   := v_rec.tbl_name;
    index_size   := v_rec.idx_size;
    severity     := CASE WHEN v_rec.idx_bytes > 104857600 THEN 'HIGH' ELSE 'MEDIUM' END;
    RETURN NEXT;

    IF severity = 'HIGH' AND NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'invalid_index'
        AND (metadata->>'index_name') = v_rec.idx_name
        AND created_at > now() - (v_dedup_hours || ' hours')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'invalid_index',
        severity,
        format('[%s] Índice inválido %s.%s (%s)', severity,
               v_rec.schema_name, v_rec.idx_name, v_rec.idx_size),
        format('O índice %s.%s está com indisvalid=%s e indisready=%s. Provavelmente um CREATE INDEX CONCURRENTLY falhou. Ele consome espaço e não é usado pelo planner. Recomenda-se DROP INDEX CONCURRENTLY e recriar.',
               v_rec.schema_name, v_rec.idx_name, v_rec.indisvalid, v_rec.indisready),
        jsonb_build_object(
          'index_name',    v_rec.idx_name,
          'table_name',    v_rec.tbl_name,
          'schema',        v_rec.schema_name,
          'size_bytes',    v_rec.idx_bytes,
          'indisvalid',    v_rec.indisvalid,
          'indisready',    v_rec.indisready,
          'fix_sql',       format('DROP INDEX CONCURRENTLY IF EXISTS %I.%I;',
                                  v_rec.schema_name, v_rec.idx_name),
          'diagnostic_sql',
            format('SELECT indexdef FROM pg_indexes WHERE schemaname=''%s'' AND indexname=''%s'';',
                   v_rec.schema_name, v_rec.idx_name)
        )
      );
    END IF;
  END LOOP;

  -- 2) Índices DUPLICADOS (mesma tabela + mesmas colunas)
  FOR v_rec IN
    WITH idx AS (
      SELECT
        n.nspname                               AS schema_name,
        t.relname                               AS tbl_name,
        c.relname                               AS idx_name,
        i.indkey::text                          AS key_sig,
        pg_relation_size(c.oid)                 AS idx_bytes,
        pg_size_pretty(pg_relation_size(c.oid)) AS idx_size,
        i.indisunique,
        i.indisprimary
      FROM pg_index i
      JOIN pg_class  c ON c.oid = i.indexrelid
      JOIN pg_class  t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND i.indisvalid
    ),
    dups AS (
      SELECT schema_name, tbl_name, key_sig,
             array_agg(idx_name ORDER BY indisprimary DESC, indisunique DESC, idx_bytes) AS idx_list,
             count(*) AS n
      FROM idx
      GROUP BY schema_name, tbl_name, key_sig
      HAVING count(*) > 1
    )
    SELECT d.schema_name, d.tbl_name, d.idx_list, d.n,
           i.idx_size, i.idx_bytes
    FROM dups d
    JOIN idx i ON i.idx_name = d.idx_list[2]  -- 2º índice = candidato a remoção
  LOOP
    finding_type := 'duplicate_index';
    index_name   := v_rec.idx_list[2];
    table_name   := v_rec.tbl_name;
    index_size   := v_rec.idx_size;
    severity     := CASE WHEN v_rec.idx_bytes > 52428800 THEN 'HIGH' ELSE 'MEDIUM' END;
    RETURN NEXT;

    IF severity = 'HIGH' AND NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'duplicate_index'
        AND (metadata->>'duplicate_index') = v_rec.idx_list[2]
        AND created_at > now() - (v_dedup_hours || ' hours')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'duplicate_index',
        severity,
        format('[%s] Índices duplicados em %s.%s: %s ~ %s',
               severity, v_rec.schema_name, v_rec.tbl_name,
               v_rec.idx_list[1], v_rec.idx_list[2]),
        format('A tabela %s.%s tem %s índices com a mesma chave. O índice %s (%s) é redundante e pode ser removido para acelerar writes.',
               v_rec.schema_name, v_rec.tbl_name, v_rec.n,
               v_rec.idx_list[2], v_rec.idx_size),
        jsonb_build_object(
          'table_name',        v_rec.tbl_name,
          'schema',            v_rec.schema_name,
          'keep_index',        v_rec.idx_list[1],
          'duplicate_index',   v_rec.idx_list[2],
          'all_duplicates',    to_jsonb(v_rec.idx_list),
          'size_bytes',        v_rec.idx_bytes,
          'fix_sql',
            format('DROP INDEX CONCURRENTLY IF EXISTS %I.%I;',
                   v_rec.schema_name, v_rec.idx_list[2]),
          'diagnostic_sql',
            format('SELECT indexname, indexdef FROM pg_indexes WHERE schemaname=''%s'' AND tablename=''%s'';',
                   v_rec.schema_name, v_rec.tbl_name)
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_invalid_and_duplicate_indexes() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_invalid_and_duplicate_indexes() TO service_role;

COMMENT ON FUNCTION public.scan_invalid_and_duplicate_indexes() IS
  'Onda 20: Scanner de índices inválidos (CREATE INDEX CONCURRENTLY falho) e duplicados (mesma indkey).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-invalid-dup-indexes-daily') THEN
      PERFORM cron.unschedule('scan-invalid-dup-indexes-daily');
    END IF;
    PERFORM cron.schedule(
      'scan-invalid-dup-indexes-daily',
      '45 4 * * *',
      $cron$ SELECT public.scan_invalid_and_duplicate_indexes(); $cron$
    );
  END IF;
END $$;
