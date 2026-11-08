
CREATE OR REPLACE FUNCTION public.scan_xid_wraparound()
RETURNS TABLE (
  scope             text,
  object_name       text,
  xid_age           bigint,
  mxid_age          bigint,
  severity          text,
  pct_to_wraparound numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_wraparound_limit  bigint := 2100000000;
  v_alert_dedup_hours int    := 6;
  v_rec               record;
  v_severity          text;
  v_pct               numeric;
  v_max_age           bigint;
  v_fix_sql           text;
BEGIN
  FOR v_rec IN
    SELECT
      c.oid,
      n.nspname || '.' || c.relname AS full_name,
      age(c.relfrozenxid)::bigint    AS x_age,
      mxid_age(c.relminmxid)::bigint AS m_age,
      pg_relation_size(c.oid)        AS rel_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','m','t')
      AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
      AND c.relfrozenxid <> 0
  LOOP
    v_max_age := GREATEST(v_rec.x_age, v_rec.m_age);
    v_pct     := ROUND((v_max_age::numeric / v_wraparound_limit) * 100, 2);

    v_severity := CASE
      WHEN v_max_age > 1800000000 THEN 'EMERGENCY'
      WHEN v_max_age > 1500000000 THEN 'CRITICAL'
      WHEN v_max_age > 1000000000 THEN 'HIGH'
      WHEN v_max_age >  500000000 THEN 'MEDIUM'
      WHEN v_max_age >  200000000 THEN 'INFO'
      ELSE NULL
    END;

    CONTINUE WHEN v_severity IS NULL;

    scope := 'table'; object_name := v_rec.full_name;
    xid_age := v_rec.x_age; mxid_age := v_rec.m_age;
    severity := v_severity; pct_to_wraparound := v_pct;
    RETURN NEXT;

    IF v_severity IN ('HIGH','CRITICAL','EMERGENCY') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
        WHERE alert_type = 'xid_wraparound'
          AND (metadata->>'object_name') = v_rec.full_name
          AND created_at > now() - (v_alert_dedup_hours || ' hours')::interval
      ) THEN
        v_fix_sql := format('VACUUM (FREEZE, VERBOSE, ANALYZE) %s;', v_rec.full_name);

        INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
        VALUES (
          'xid_wraparound',
          v_severity,
          format('[%s] Wraparound XID em %s (%.2f%% do limite)', v_severity, v_rec.full_name, v_pct),
          format('Tabela %s com age(relfrozenxid)=%s e mxid_age=%s. Ao atingir ~2.1B o banco entra em modo somente-leitura. Rode VACUUM FREEZE e investigue transações longas.',
                 v_rec.full_name, v_rec.x_age, v_rec.m_age),
          jsonb_build_object(
            'object_name',        v_rec.full_name,
            'xid_age',            v_rec.x_age,
            'mxid_age',           v_rec.m_age,
            'pct_to_wraparound',  v_pct,
            'relation_size_bytes', v_rec.rel_size,
            'fix_sql',            v_fix_sql,
            'diagnostic_sql',     'SELECT pid, age(backend_xmin) AS xmin_age, state, query_start, query FROM pg_stat_activity WHERE backend_xmin IS NOT NULL ORDER BY age(backend_xmin) DESC LIMIT 10;',
            'suggested_setting',  'ALTER TABLE ' || v_rec.full_name || ' SET (autovacuum_freeze_max_age = 100000000);'
          )
        );
      END IF;
    END IF;
  END LOOP;

  FOR v_rec IN
    SELECT datname, age(datfrozenxid)::bigint AS x_age
    FROM pg_database WHERE datallowconn = true
  LOOP
    v_pct := ROUND((v_rec.x_age::numeric / v_wraparound_limit) * 100, 2);
    v_severity := CASE
      WHEN v_rec.x_age > 1800000000 THEN 'EMERGENCY'
      WHEN v_rec.x_age > 1500000000 THEN 'CRITICAL'
      WHEN v_rec.x_age > 1000000000 THEN 'HIGH'
      WHEN v_rec.x_age >  500000000 THEN 'MEDIUM'
      ELSE NULL
    END;
    CONTINUE WHEN v_severity IS NULL;

    scope := 'database'; object_name := v_rec.datname;
    xid_age := v_rec.x_age; mxid_age := NULL;
    severity := v_severity; pct_to_wraparound := v_pct;
    RETURN NEXT;

    IF v_severity IN ('HIGH','CRITICAL','EMERGENCY') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.system_alerts
        WHERE alert_type = 'xid_wraparound_db'
          AND (metadata->>'database') = v_rec.datname
          AND created_at > now() - (v_alert_dedup_hours || ' hours')::interval
      ) THEN
        INSERT INTO public.system_alerts (alert_type, severity, title, description, metadata)
        VALUES (
          'xid_wraparound_db',
          v_severity,
          format('[%s] Banco %s a %.2f%% do wraparound', v_severity, v_rec.datname, v_pct),
          format('age(datfrozenxid)=%s no banco %s. Rode vacuumdb --all --freeze e investigue replication slots/prepared xacts.', v_rec.x_age, v_rec.datname),
          jsonb_build_object(
            'database', v_rec.datname,
            'xid_age', v_rec.x_age,
            'pct_to_wraparound', v_pct,
            'fix_sql', 'vacuumdb --all --freeze --jobs=4',
            'diagnostic_sql', 'SELECT slot_name, age(xmin) FROM pg_replication_slots WHERE xmin IS NOT NULL; SELECT gid, prepared, age(transaction) FROM pg_prepared_xacts;'
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_xid_wraparound() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.scan_xid_wraparound() TO service_role;

COMMENT ON FUNCTION public.scan_xid_wraparound() IS
  'Onda 18: Scanner de wraparound de XID/MultiXact. Emite alertas HIGH/CRITICAL/EMERGENCY em system_alerts.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-xid-wraparound-daily') THEN
      PERFORM cron.unschedule('scan-xid-wraparound-daily');
    END IF;
    PERFORM cron.schedule(
      'scan-xid-wraparound-daily',
      '30 3 * * *',
      $cron$ SELECT public.scan_xid_wraparound(); $cron$
    );
  END IF;
END $$;
