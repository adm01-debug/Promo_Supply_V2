
-- =====================================================================
-- ONDA 10 — Scanner de Saturação de Conexões e Replication Lag
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) scan_connection_saturation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scan_connection_saturation(
  warn_pct numeric DEFAULT 70,
  crit_pct numeric DEFAULT 90
)
RETURNS TABLE(
  severity text,
  total_connections int,
  max_connections int,
  usage_pct numeric,
  by_state jsonb,
  top_apps jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_total int;
  v_max int;
  v_pct numeric;
  v_aborted int;
  v_by_state jsonb;
  v_top_apps jsonb;
  v_top_users jsonb;
  v_severity text;
  v_diag_sql text;
BEGIN
  SELECT current_setting('max_connections')::int INTO v_max;

  SELECT count(*) INTO v_total FROM pg_stat_activity WHERE pid <> pg_backend_pid();

  SELECT count(*) INTO v_aborted
  FROM pg_stat_activity
  WHERE state = 'idle in transaction (aborted)' AND pid <> pg_backend_pid();

  v_pct := CASE WHEN v_max > 0 THEN round((v_total::numeric / v_max) * 100, 2) ELSE 0 END;

  SELECT jsonb_object_agg(coalesce(state, 'unknown'), cnt)
  INTO v_by_state
  FROM (
    SELECT state, count(*) AS cnt
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
    GROUP BY state
  ) s;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_top_apps
  FROM (
    SELECT coalesce(application_name, '(unknown)') AS app, count(*) AS cnt
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
    GROUP BY application_name
    ORDER BY count(*) DESC
    LIMIT 5
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_top_users
  FROM (
    SELECT coalesce(usename, '(none)') AS usr, count(*) AS cnt
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
    GROUP BY usename
    ORDER BY count(*) DESC
    LIMIT 5
  ) t;

  v_severity := CASE
    WHEN v_pct >= crit_pct OR v_aborted > 5 THEN 'CRITICAL'
    WHEN v_pct >= warn_pct THEN 'HIGH'
    ELSE 'OK'
  END;

  v_diag_sql := 'SELECT pid, usename, application_name, state, wait_event_type, wait_event, '
             || 'now()-xact_start AS xact_age, left(query,200) AS query '
             || 'FROM pg_stat_activity WHERE pid <> pg_backend_pid() '
             || 'ORDER BY xact_start NULLS LAST LIMIT 50;';

  IF v_severity <> 'OK' THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, message, metadata, created_at
    ) VALUES (
      'db_connection_saturation',
      v_severity,
      format('Conexões DB em %s%% (%s/%s)', v_pct, v_total, v_max),
      format('Uso do pool: %s%%. Idle-in-txn (aborted): %s. Revisar top apps e considerar pg_terminate_backend em conexões travadas.', v_pct, v_aborted),
      jsonb_build_object(
        'total_connections', v_total,
        'max_connections', v_max,
        'usage_pct', v_pct,
        'aborted_in_txn', v_aborted,
        'by_state', v_by_state,
        'top_apps', v_top_apps,
        'top_users', v_top_users,
        'diagnostic_sql', v_diag_sql,
        'wave', 10
      ),
      now()
    );
  END IF;

  RETURN QUERY SELECT v_severity, v_total, v_max, v_pct, v_by_state, v_top_apps;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_connection_saturation(numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_connection_saturation(numeric, numeric) TO service_role;

-- ---------------------------------------------------------------------
-- 2) scan_replication_lag
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scan_replication_lag(
  warn_seconds int DEFAULT 30,
  crit_seconds int DEFAULT 120
)
RETURNS TABLE(
  target text,
  severity text,
  lag_seconds numeric,
  detail jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
  v_sev text;
  v_lag_secs numeric;
  v_has_repl boolean;
BEGIN
  -- Guard: if no replicas AND no slots, exit quietly (single-node dev)
  SELECT EXISTS(SELECT 1 FROM pg_stat_replication)
      OR EXISTS(SELECT 1 FROM pg_replication_slots)
    INTO v_has_repl;
  IF NOT v_has_repl THEN
    RETURN;
  END IF;

  -- Per-replica lag
  FOR r IN
    SELECT
      coalesce(application_name, client_addr::text, 'replica-'||pid::text) AS app,
      pid,
      client_addr,
      state,
      sync_state,
      EXTRACT(EPOCH FROM greatest(coalesce(write_lag,'0'::interval),
                                  coalesce(flush_lag,'0'::interval),
                                  coalesce(replay_lag,'0'::interval)))::numeric AS max_lag_secs,
      write_lag, flush_lag, replay_lag
    FROM pg_stat_replication
  LOOP
    v_lag_secs := coalesce(r.max_lag_secs, 0);
    v_sev := CASE
      WHEN v_lag_secs >= crit_seconds THEN 'CRITICAL'
      WHEN v_lag_secs >= warn_seconds THEN 'HIGH'
      ELSE 'OK'
    END;

    IF v_sev <> 'OK' THEN
      INSERT INTO public.system_alerts (
        alert_type, severity, title, message, metadata, created_at
      ) VALUES (
        'db_replication_lag',
        v_sev,
        format('Replica %s com lag de %ss', r.app, round(v_lag_secs, 1)),
        format('Replica %s (%s) apresentando atraso. Verificar rede, load na replica e checkpoints do primário.', r.app, r.state),
        jsonb_build_object(
          'replica', r.app,
          'pid', r.pid,
          'state', r.state,
          'sync_state', r.sync_state,
          'write_lag', r.write_lag::text,
          'flush_lag', r.flush_lag::text,
          'replay_lag', r.replay_lag::text,
          'lag_seconds', v_lag_secs,
          'wave', 10
        ),
        now()
      );
    END IF;

    target := r.app; severity := v_sev; lag_seconds := v_lag_secs;
    detail := jsonb_build_object('state', r.state, 'sync_state', r.sync_state);
    RETURN NEXT;
  END LOOP;

  -- Inactive slots (WAL bloat risk)
  FOR r IN
    SELECT slot_name, slot_type, active, restart_lsn,
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
    FROM pg_replication_slots
    WHERE active = false
  LOOP
    INSERT INTO public.system_alerts (
      alert_type, severity, title, message, metadata, created_at
    ) VALUES (
      'db_replication_slot_inactive',
      'HIGH',
      format('Slot de replicação inativo: %s', r.slot_name),
      format('Slot inativo retendo %s bytes de WAL. Risco de saturar disco. Considere drop se orfão.', coalesce(r.retained_bytes::text, '?')),
      jsonb_build_object(
        'slot_name', r.slot_name,
        'slot_type', r.slot_type,
        'retained_wal_bytes', r.retained_bytes,
        'drop_sql', format('SELECT pg_drop_replication_slot(%L);', r.slot_name),
        'wave', 10
      ),
      now()
    );

    target := 'slot:'||r.slot_name; severity := 'HIGH';
    lag_seconds := NULL;
    detail := jsonb_build_object('retained_wal_bytes', r.retained_bytes, 'slot_type', r.slot_type);
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_replication_lag(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_replication_lag(int, int) TO service_role;
