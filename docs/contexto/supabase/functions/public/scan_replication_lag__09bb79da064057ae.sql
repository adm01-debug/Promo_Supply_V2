CREATE OR REPLACE FUNCTION public.scan_replication_lag(warn_seconds integer DEFAULT 30, crit_seconds integer DEFAULT 120)
 RETURNS TABLE(target text, severity text, lag_seconds numeric, detail jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
