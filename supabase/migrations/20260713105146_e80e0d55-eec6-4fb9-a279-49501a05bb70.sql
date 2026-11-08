
-- Onda 80a: corrigir FK sem índice existente
CREATE INDEX IF NOT EXISTS idx_secret_rotation_schedule_owner_user_id
  ON public.secret_rotation_schedule (owner_user_id);

-- Onda 80b: scanner recorrente
CREATE OR REPLACE FUNCTION public.scan_unindexed_fks()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  r record; v_sev text; v_size_mb numeric; v_count int := 0;
  v_alert_type text := 'db_unindexed_fk';
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass::text AS tbl,
           c.conname,
           (SELECT string_agg(attname, ',' ORDER BY array_position(c.conkey, attnum))
              FROM pg_attribute
              WHERE attrelid = c.conrelid AND attnum = ANY(c.conkey)) AS cols,
           pg_relation_size(c.conrelid) AS bytes
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (i.indkey::int2[])[0:array_length(c.conkey,1)-1] = c.conkey::int2[]
      )
  LOOP
    v_size_mb := ROUND(r.bytes::numeric / (1024*1024), 2);
    v_sev := CASE WHEN v_size_mb >= 100 THEN 'HIGH'
                  WHEN v_size_mb >= 10 THEN 'MEDIUM'
                  ELSE 'INFO' END;

    IF EXISTS (SELECT 1 FROM public.system_alerts
                WHERE alert_type = v_alert_type
                  AND resolved_at IS NULL
                  AND metadata->>'table' = r.tbl
                  AND metadata->>'constraint' = r.conname
                  AND created_at > now() - interval '24 hours') THEN
      CONTINUE;
    END IF;

    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES (v_alert_type, v_sev,
      format('FK sem índice: %s(%s)', r.tbl, r.cols),
      jsonb_build_object(
        'table', r.tbl, 'constraint', r.conname, 'columns', r.cols,
        'size_mb', v_size_mb,
        'fix_sql', format(
          'CREATE INDEX CONCURRENTLY idx_%s_%s ON %s (%s);',
          replace(r.tbl,'public.',''), replace(r.cols,',','_'), r.tbl, r.cols),
        'hint','FKs sem índice causam sequential scans em cascatas de DELETE/UPDATE e locks longos.'
      ));
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('status','ok','alerts_created', v_count);
END; $$;

REVOKE EXECUTE ON FUNCTION public.scan_unindexed_fks() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_unindexed_fks() TO service_role;

SELECT cron.schedule('scan-unindexed-fks-weekly', '30 5 * * 1',
  $$ SELECT public.scan_unindexed_fks(); $$);
