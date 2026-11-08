
CREATE OR REPLACE FUNCTION public.scan_schema_hygiene()
RETURNS TABLE (
  table_name      text,
  issue           text,
  severity        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec  record;
  v_dedup_days int := 30;
BEGIN
  FOR v_rec IN
    SELECT
      n.nspname || '.' || c.relname AS tbl,
      c.oid                         AS tbl_oid,
      c.relname                     AS tbl_short
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relispartition = false
      -- possui coluna updated_at
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid
          AND a.attname = 'updated_at'
          AND a.attnum > 0
          AND NOT a.attisdropped
      )
      -- NÃO possui trigger BEFORE UPDATE que chama update_updated_at_column
      AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger tg
        JOIN pg_proc   p  ON p.oid = tg.tgfoid
        WHERE tg.tgrelid = c.oid
          AND NOT tg.tgisinternal
          AND (tg.tgtype & 2) <> 0  -- BEFORE
          AND (tg.tgtype & 16) <> 0 -- UPDATE
          AND p.proname = 'update_updated_at_column'
      )
  LOOP
    table_name := v_rec.tbl;
    issue      := 'Coluna updated_at sem trigger BEFORE UPDATE update_updated_at_column()';
    severity   := 'MEDIUM';
    RETURN NEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'schema_hygiene_updated_at'
        AND (metadata->>'table_name') = v_rec.tbl
        AND created_at > now() - (v_dedup_days || ' days')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'schema_hygiene_updated_at',
        'MEDIUM',
        format('[MEDIUM] %s sem trigger de updated_at', v_rec.tbl),
        format('A tabela %s tem coluna updated_at mas nenhum trigger a mantém — o valor só muda se o app enviar explicitamente. Quebra auditoria e cache invalidation.', v_rec.tbl),
        jsonb_build_object(
          'table_name', v_rec.tbl,
          'fix_sql',
            format(
              'CREATE TRIGGER trg_%s_set_updated_at BEFORE UPDATE ON %s '
              'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
              v_rec.tbl_short, v_rec.tbl
            ),
          'diagnostic_sql',
            format('SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = ''%s''::regclass AND NOT tgisinternal;', v_rec.tbl)
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_schema_hygiene() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_schema_hygiene() TO service_role;

COMMENT ON FUNCTION public.scan_schema_hygiene() IS
  'Onda 26: Detecta tabelas public com coluna updated_at mas sem trigger BEFORE UPDATE update_updated_at_column().';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-schema-hygiene-weekly') THEN
      PERFORM cron.unschedule('scan-schema-hygiene-weekly');
    END IF;
    PERFORM cron.schedule(
      'scan-schema-hygiene-weekly',
      '0 7 * * 0',
      $cron$ SELECT public.scan_schema_hygiene(); $cron$
    );
  END IF;
END $$;
