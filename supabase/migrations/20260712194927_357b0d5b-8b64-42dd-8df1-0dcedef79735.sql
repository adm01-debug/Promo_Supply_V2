
CREATE OR REPLACE FUNCTION public.scan_sequence_exhaustion()
RETURNS TABLE (
  sequence_name text,
  owned_by      text,
  data_type     text,
  last_value    bigint,
  max_value     bigint,
  pct_used      numeric,
  severity      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dedup_hours int := 24;
  v_rec         record;
  v_last        bigint;
  v_max         bigint;
  v_pct         numeric;
  v_sev         text;
BEGIN
  FOR v_rec IN
    SELECT
      n.nspname                                   AS seq_schema,
      c.relname                                   AS seq_name,
      COALESCE(tn.nspname || '.' || tc.relname, '(none)') AS owner_tbl,
      COALESCE(a.attname, '(none)')               AS owner_col,
      COALESCE(t.typname, 'int8')                 AS col_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_depend d
      ON d.objid = c.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'a'
    LEFT JOIN pg_class     tc ON tc.oid = d.refobjid
    LEFT JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    LEFT JOIN pg_attribute a
      ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    LEFT JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relkind = 'S'
      AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  LOOP
    BEGIN
      EXECUTE format('SELECT last_value FROM %I.%I', v_rec.seq_schema, v_rec.seq_name)
        INTO v_last;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    v_max := CASE v_rec.col_type
               WHEN 'int2' THEN 32767
               WHEN 'int4' THEN 2147483647
               ELSE 9223372036854775807
             END;

    v_pct := ROUND((v_last::numeric / v_max::numeric) * 100, 2);

    v_sev := CASE
               WHEN v_pct >= 95 THEN 'CRITICAL'
               WHEN v_pct >= 85 THEN 'HIGH'
               WHEN v_pct >= 70 THEN 'MEDIUM'
               WHEN v_pct >= 50 THEN 'INFO'
               ELSE NULL
             END;

    IF v_sev IS NULL THEN CONTINUE; END IF;

    sequence_name := v_rec.seq_schema || '.' || v_rec.seq_name;
    owned_by      := v_rec.owner_tbl || '.' || v_rec.owner_col;
    data_type     := v_rec.col_type;
    last_value    := v_last;
    max_value     := v_max;
    pct_used      := v_pct;
    severity      := v_sev;
    RETURN NEXT;

    CONTINUE WHEN v_sev NOT IN ('HIGH','CRITICAL');

    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'sequence_exhaustion'
        AND (metadata->>'sequence_name') = sequence_name
        AND created_at > now() - (v_dedup_hours || ' hours')::interval
    ) THEN
      INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'sequence_exhaustion',
        v_sev,
        format('[%s] Sequence %s em %s%% do limite %s',
               v_sev, sequence_name, v_pct, v_max),
        format('Sequence %s (owned by %s, tipo %s) já consumiu %s de %s (%s%%). Estouro deixará INSERTs em erro permanente.',
               sequence_name, owned_by, data_type, v_last, v_max, v_pct),
        jsonb_build_object(
          'sequence_name', sequence_name,
          'owned_by',      owned_by,
          'data_type',     data_type,
          'last_value',    v_last,
          'max_value',     v_max,
          'pct_used',      v_pct,
          'fix_sql',
            CASE
              WHEN v_rec.col_type = 'int4' AND v_rec.owner_tbl <> '(none)' THEN
                format(
                  '-- Migrar coluna e sequence para bigint (rewrite; agende janela):%s'
                  'ALTER TABLE %s ALTER COLUMN %I TYPE bigint;%s'
                  'ALTER SEQUENCE %s AS bigint;',
                  E'\n', v_rec.owner_tbl, v_rec.owner_col, E'\n', sequence_name
                )
              ELSE
                format('ALTER SEQUENCE %s AS bigint;', sequence_name)
            END,
          'diagnostic_sql',
            format('SELECT last_value, log_cnt, is_called FROM %s;', sequence_name)
        )
      );
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_sequence_exhaustion() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_sequence_exhaustion() TO service_role;

COMMENT ON FUNCTION public.scan_sequence_exhaustion() IS
  'Onda 23: Monitora consumo de sequences vs limite do tipo (int2/int4/int8) e alerta antes do overflow.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-sequence-exhaustion-daily') THEN
      PERFORM cron.unschedule('scan-sequence-exhaustion-daily');
    END IF;
    PERFORM cron.schedule(
      'scan-sequence-exhaustion-daily',
      '15 6 * * *',
      $cron$ SELECT public.scan_sequence_exhaustion(); $cron$
    );
  END IF;
END $$;
