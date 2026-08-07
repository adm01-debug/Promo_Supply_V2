
DROP FUNCTION IF EXISTS public.scan_txid_wraparound();

CREATE OR REPLACE FUNCTION public.scan_txid_wraparound()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lock_key BIGINT := hashtext('scan_txid_wraparound')::bigint;
  v_db_age BIGINT;
  v_rec RECORD;
  v_severity TEXT;
  v_alerts INT := 0;
  v_max_age_setting BIGINT := 2000000000; -- limite absoluto do PG (2^31 - margem)
BEGIN
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_running');
  END IF;

  -- Idade global da database
  SELECT age(datfrozenxid) INTO v_db_age
  FROM pg_database WHERE datname = current_database();

  IF v_db_age >= 1800000000 THEN v_severity := 'critical';
  ELSIF v_db_age >= 1500000000 THEN v_severity := 'critical';
  ELSIF v_db_age >= 1000000000 THEN v_severity := 'high';
  ELSIF v_db_age >= 500000000 THEN v_severity := 'medium';
  ELSE v_severity := NULL;
  END IF;

  IF v_severity IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'txid_wraparound_database'
        AND severity = v_severity
        AND created_at > now() - interval '4 hours'
        AND (resolved_at IS NULL OR resolved_at > now() - interval '4 hours')
    ) THEN
      INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata)
      VALUES (
        'txid_wraparound_database',
        v_severity,
        format('Wraparound TXID: database em %s transações', to_char(v_db_age, 'FM999,999,999,999')),
        format('Database %I está a %s de %s do limite absoluto de wraparound. Autovacuum deve estar rodando VACUUM FREEZE. Se não progredir, forçar manualmente.',
          current_database(),
          to_char(v_max_age_setting - v_db_age, 'FM999,999,999,999'),
          to_char(v_max_age_setting, 'FM999,999,999,999')),
        jsonb_build_object(
          'database', current_database(),
          'age', v_db_age,
          'remaining', v_max_age_setting - v_db_age,
          'pct_used', round((v_db_age::numeric / v_max_age_setting) * 100, 2),
          'diagnostic_sql', 'SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;',
          'top_tables_sql', 'SELECT relname, age(relfrozenxid) FROM pg_class WHERE relkind IN (''r'',''t'',''m'') ORDER BY 2 DESC LIMIT 20;',
          'fix_sql', 'VACUUM (FREEZE, VERBOSE) <table_name>; -- executar nas top tabelas primeiro',
          'warning', 'Se atingir 2.1B transações, PostgreSQL entra em shutdown forçado para prevenir corrupção. Ação imediata necessária acima de 1.5B.'
        )
      );
      v_alerts := v_alerts + 1;
    END IF;
  END IF;

  -- Idade por tabela (top 20 mais próximas do limite)
  FOR v_rec IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      age(c.relfrozenxid) AS tbl_age,
      pg_total_relation_size(c.oid) AS size_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','t','m','p')
      AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
      AND age(c.relfrozenxid) > 500000000
    ORDER BY age(c.relfrozenxid) DESC
    LIMIT 20
  LOOP
    IF v_rec.tbl_age >= 1500000000 THEN v_severity := 'critical';
    ELSIF v_rec.tbl_age >= 1000000000 THEN v_severity := 'high';
    ELSIF v_rec.tbl_age >= 500000000 THEN v_severity := 'medium';
    ELSE CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.system_alerts
      WHERE alert_type = 'txid_wraparound_table'
        AND metadata->>'table' = v_rec.schema_name || '.' || v_rec.table_name
        AND created_at > now() - interval '4 hours'
        AND (resolved_at IS NULL OR resolved_at > now() - interval '4 hours')
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.system_alerts(alert_type, severity, title, message, metadata)
    VALUES (
      'txid_wraparound_table',
      v_severity,
      format('Wraparound TXID em %I.%I: %s transações',
        v_rec.schema_name, v_rec.table_name, to_char(v_rec.tbl_age, 'FM999,999,999,999')),
      format('Tabela %I.%I não recebe FREEZE há %s transações. Autovacuum pode estar bloqueado (long-running queries, tabelas em uso constante).',
        v_rec.schema_name, v_rec.table_name, to_char(v_rec.tbl_age, 'FM999,999,999,999')),
      jsonb_build_object(
        'table', v_rec.schema_name || '.' || v_rec.table_name,
        'age', v_rec.tbl_age,
        'size_pretty', pg_size_pretty(v_rec.size_bytes),
        'pct_used', round((v_rec.tbl_age::numeric / v_max_age_setting) * 100, 2),
        'fix_sql', format('VACUUM (FREEZE, VERBOSE, PARALLEL 4) %I.%I;', v_rec.schema_name, v_rec.table_name),
        'diagnostic_sql', 'SELECT pid, state, wait_event, query_start, query FROM pg_stat_activity WHERE state != ''idle'' AND backend_xmin IS NOT NULL ORDER BY backend_xmin ASC;',
        'blocking_hint', 'Se houver transações antigas (backend_xmin baixo), elas impedem o FREEZE. Terminar ou aguardar.'
      )
    );
    v_alerts := v_alerts + 1;
  END LOOP;

  RETURN jsonb_build_object('db_age', v_db_age, 'alerts_created', v_alerts, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.scan_txid_wraparound() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_txid_wraparound() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan_txid_wraparound_30min') THEN
    PERFORM cron.unschedule('scan_txid_wraparound_30min');
  END IF;
  PERFORM cron.schedule(
    'scan_txid_wraparound_30min',
    '*/30 * * * *',
    $cron$ SELECT public.scan_txid_wraparound(); $cron$
  );
END $$;
