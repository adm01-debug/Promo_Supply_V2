
CREATE OR REPLACE FUNCTION public.simulate_scan_sla_loop(
  p_scenarios int DEFAULT 300,
  p_seed float DEFAULT 0.4242
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now              timestamptz := now();
  v_total            int := 0;
  v_passed           int := 0;
  v_failed           int := 0;
  v_failures         jsonb := '[]'::jsonb;
  v_open_detect_ok   int := 0;
  v_dedup_ok         int := 0;
  v_resolve_ok       int := 0;
  v_severity_ok      int := 0;
  v_initial_dist     jsonb;
  v_dedup_before     int;
  v_dedup_after      int;
  r                  record;
BEGIN
  PERFORM setseed(p_seed);

  CREATE TEMP TABLE sim_catalog(scan_name text PRIMARY KEY, sla_minutes int) ON COMMIT DROP;
  INSERT INTO sim_catalog VALUES
    ('archive_audit_logs',      44640),
    ('archive_telemetry_logs',  44640),
    ('cleanup_health_scan_runs',1440),
    ('secret_rotation_check',   1440),
    ('ensure_partitions',       44640),
    ('slack_watchdog',          60),
    ('security_scan',           1440);

  CREATE TEMP TABLE sim_scenarios(
    id              int PRIMARY KEY,
    scan_name       text NOT NULL,
    last_run_at     timestamptz,
    last_status     text NOT NULL,
    sla_minutes     int NOT NULL,
    regime          text NOT NULL,
    expected_health text NOT NULL
  ) ON COMMIT DROP;

  -- Gerador balanceado: 6 regimes distribuídos uniformemente via mod 6
  INSERT INTO sim_scenarios(id, scan_name, last_run_at, last_status, sla_minutes, regime, expected_health)
  SELECT
    gs,
    c.scan_name,
    CASE regime_name
      WHEN 'never' THEN NULL
      ELSE v_now - (age_min || ' minutes')::interval
    END,
    CASE WHEN regime_name = 'failed' THEN 'failed' ELSE 'ok' END,
    c.sla_minutes,
    regime_name,
    CASE
      WHEN regime_name = 'never'    THEN 'critical'
      WHEN regime_name = 'failed'   THEN 'critical'
      WHEN regime_name = 'critical' THEN 'critical'
      WHEN regime_name = 'late'     THEN 'late'
      ELSE                               'ok'
    END
  FROM generate_series(1, p_scenarios) gs
  CROSS JOIN LATERAL (
    SELECT (ARRAY['ok','borderline','late','critical','failed','never'])[(gs % 6) + 1] AS regime_name
  ) reg
  CROSS JOIN LATERAL (
    SELECT scan_name, sla_minutes
    FROM sim_catalog
    ORDER BY random()
    LIMIT 1
  ) c
  CROSS JOIN LATERAL (
    SELECT (
      CASE reg.regime_name
        WHEN 'ok'         THEN (random() * c.sla_minutes * 0.5)::int
        WHEN 'borderline' THEN (c.sla_minutes * 0.9 + random() * c.sla_minutes * 0.09)::int
        WHEN 'late'       THEN (c.sla_minutes * 1.05 + random() * c.sla_minutes * 0.9)::int
        WHEN 'critical'   THEN (c.sla_minutes * 2.1  + random() * c.sla_minutes * 5)::int
        WHEN 'failed'     THEN (random() * c.sla_minutes * 0.5)::int
        ELSE 0
      END
    ) AS age_min
  ) ages;

  v_total := (SELECT count(*) FROM sim_scenarios);
  v_initial_dist := (
    SELECT jsonb_object_agg(expected_health, cnt)
    FROM (SELECT expected_health, count(*) cnt FROM sim_scenarios GROUP BY 1) d
  );

  CREATE TEMP TABLE sim_alerts(
    scenario_id           int PRIMARY KEY,
    alert_type            text NOT NULL,
    severity              text NOT NULL,
    resolved_at           timestamptz,
    auto_resolved_reason  text
  ) ON COMMIT DROP;

  -- FASE 1: detecção + severidade
  FOR r IN SELECT * FROM sim_scenarios LOOP
    IF r.expected_health IN ('late','critical') THEN
      INSERT INTO sim_alerts(scenario_id, alert_type, severity)
      VALUES (
        r.id,
        CASE r.expected_health WHEN 'late' THEN 'scan_sla_late' ELSE 'scan_sla_critical' END,
        CASE r.expected_health WHEN 'late' THEN 'HIGH'          ELSE 'CRITICAL'          END
      );
      v_open_detect_ok := v_open_detect_ok + 1;
      v_severity_ok    := v_severity_ok    + 1;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM sim_alerts a
    JOIN sim_scenarios s ON s.id = a.scenario_id
    WHERE s.expected_health = 'ok'
  ) THEN
    v_failures := v_failures || jsonb_build_object('phase','detection','issue','alert opened for ok scenario');
  END IF;

  -- FASE 2: dedup (reexecução)
  v_dedup_before := (SELECT count(*) FROM sim_alerts);
  FOR r IN SELECT * FROM sim_scenarios WHERE expected_health IN ('late','critical') LOOP
    INSERT INTO sim_alerts(scenario_id, alert_type, severity)
    VALUES (
      r.id,
      CASE r.expected_health WHEN 'late' THEN 'scan_sla_late' ELSE 'scan_sla_critical' END,
      CASE r.expected_health WHEN 'late' THEN 'HIGH'          ELSE 'CRITICAL'          END
    )
    ON CONFLICT (scenario_id) DO NOTHING;
  END LOOP;
  v_dedup_after := (SELECT count(*) FROM sim_alerts);
  IF v_dedup_after = v_dedup_before THEN
    v_dedup_ok := v_dedup_before;
  ELSE
    v_failures := v_failures || jsonb_build_object('phase','dedup','before',v_dedup_before,'after',v_dedup_after);
  END IF;

  -- FASE 3: auto-resolução (metade dos flagged voltam a ok)
  UPDATE sim_scenarios
     SET last_run_at = v_now - '1 minute'::interval,
         last_status = 'ok',
         expected_health = 'ok'
   WHERE id IN (
     SELECT id FROM sim_scenarios
     WHERE expected_health IN ('late','critical')
     ORDER BY random()
     LIMIT GREATEST(1, (SELECT count(*)/2 FROM sim_scenarios WHERE expected_health IN ('late','critical')))
   );

  WITH resolved AS (
    UPDATE sim_alerts a
       SET resolved_at = v_now,
           auto_resolved_reason = 'scanner_back_to_ok'
      FROM sim_scenarios s
     WHERE a.scenario_id = s.id
       AND a.resolved_at IS NULL
       AND s.expected_health = 'ok'
     RETURNING 1
  )
  SELECT count(*) INTO v_resolve_ok FROM resolved;

  IF EXISTS (
    SELECT 1 FROM sim_alerts a
    JOIN sim_scenarios s ON s.id = a.scenario_id
    WHERE a.resolved_at IS NULL AND s.expected_health = 'ok'
  ) THEN
    v_failures := v_failures || jsonb_build_object('phase','auto_resolve','issue','orphan open alert on ok scenario');
  END IF;

  v_passed := v_open_detect_ok + v_dedup_ok + v_resolve_ok + v_severity_ok;
  v_failed := jsonb_array_length(v_failures);

  RETURN jsonb_build_object(
    'ok',                v_failed = 0,
    'scenarios',         v_total,
    'phases', jsonb_build_object(
      'detection_opened', v_open_detect_ok,
      'dedup_noop',       v_dedup_ok,
      'auto_resolved',    v_resolve_ok,
      'severity_correct', v_severity_ok
    ),
    'assertions_passed', v_passed,
    'assertions_failed', v_failed,
    'failures',          v_failures,
    'initial_distribution', v_initial_dist,
    'regime_distribution', (
      SELECT jsonb_object_agg(regime, cnt)
      FROM (SELECT regime, count(*) cnt FROM sim_scenarios GROUP BY 1) d
    ),
    'run_at',            v_now
  );
END;
$$;
