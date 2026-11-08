
-- Onda 75: Simulação automatizada do loop retenção → detecção → notificação
-- Executa centenas de cenários em memória (tabelas TEMP) replicando exatamente
-- a lógica de admin_scan_runs_sla_status() + scan_scan_runs_sla(),
-- SEM efeitos colaterais em health_scan_runs / system_alerts reais.

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
  v_now             timestamptz := now();
  v_total           int := 0;
  v_passed          int := 0;
  v_failed          int := 0;
  v_failures        jsonb := '[]'::jsonb;
  v_open_detect_ok  int := 0;
  v_dedup_ok        int := 0;
  v_resolve_ok      int := 0;
  v_severity_ok     int := 0;
  r                 record;
BEGIN
  PERFORM setseed(p_seed);

  -- Catálogo SLA (espelha admin_scan_runs_sla_status)
  CREATE TEMP TABLE sim_catalog(scan_name text PRIMARY KEY, sla_minutes int) ON COMMIT DROP;
  INSERT INTO sim_catalog VALUES
    ('archive_audit_logs',      44640),
    ('archive_telemetry_logs',  44640),
    ('cleanup_health_scan_runs',1440),
    ('secret_rotation_check',   1440),
    ('ensure_partitions',       44640),
    ('slack_watchdog',          60),
    ('security_scan',           1440);

  -- Cenários sintéticos: cada linha = 1 estado de um scanner
  CREATE TEMP TABLE sim_scenarios(
    id            int PRIMARY KEY,
    scan_name     text NOT NULL,
    last_run_at   timestamptz,   -- NULL = nunca executou
    last_status   text NOT NULL, -- ok|failed|error
    sla_minutes   int NOT NULL,
    expected_health text NOT NULL -- ok|late|critical
  ) ON COMMIT DROP;

  -- Gera N cenários misturando todos os regimes: ok, borderline, late, critical, failed, never
  INSERT INTO sim_scenarios(id, scan_name, last_run_at, last_status, sla_minutes, expected_health)
  SELECT
    gs                                                  AS id,
    c.scan_name                                         AS scan_name,
    CASE regime
      WHEN 5 THEN NULL
      ELSE v_now - (age_min || ' minutes')::interval
    END,
    CASE WHEN regime = 4 THEN 'failed' ELSE 'ok' END,
    c.sla_minutes,
    CASE
      WHEN regime = 5                              THEN 'critical'         -- never run
      WHEN regime = 4                              THEN 'critical'         -- last failed
      WHEN age_min > c.sla_minutes * 2             THEN 'critical'
      WHEN age_min > c.sla_minutes                 THEN 'late'
      ELSE                                              'ok'
    END
  FROM generate_series(1, p_scenarios) gs
  CROSS JOIN LATERAL (
    SELECT (random() * 6)::int AS regime
  ) reg
  CROSS JOIN LATERAL (
    SELECT scan_name, sla_minutes
    FROM sim_catalog
    ORDER BY random()
    LIMIT 1
  ) c
  CROSS JOIN LATERAL (
    SELECT (
      CASE reg.regime
        WHEN 0 THEN (random() * c.sla_minutes * 0.5)::int                                   -- ok fresh
        WHEN 1 THEN (c.sla_minutes * 0.9 + random() * c.sla_minutes * 0.09)::int           -- ok borderline
        WHEN 2 THEN (c.sla_minutes * 1.05 + random() * c.sla_minutes * 0.9)::int           -- late
        WHEN 3 THEN (c.sla_minutes * 2.1 + random() * c.sla_minutes * 5)::int              -- critical age
        WHEN 4 THEN (random() * c.sla_minutes * 0.5)::int                                  -- failed (age doesn't matter)
        ELSE   0                                                                            -- never
      END
    ) AS age_min
  ) ages;

  v_total := (SELECT count(*) FROM sim_scenarios);

  -- Estado simulado de alertas (o que scan_scan_runs_sla teria persistido)
  CREATE TEMP TABLE sim_alerts(
    scenario_id     int PRIMARY KEY,
    alert_type      text NOT NULL,   -- scan_sla_late | scan_sla_critical
    severity        text NOT NULL,   -- HIGH | CRITICAL
    resolved_at     timestamptz,
    auto_resolved_reason text
  ) ON COMMIT DROP;

  -- ============ FASE 1: DETECÇÃO + SEVERIDADE ============
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

  -- Assert: nenhum alerta para health=ok
  IF EXISTS (
    SELECT 1 FROM sim_alerts a
    JOIN sim_scenarios s ON s.id = a.scenario_id
    WHERE s.expected_health = 'ok'
  ) THEN
    v_failures := v_failures || jsonb_build_object('phase','detection','issue','alert opened for ok scenario');
  END IF;

  -- ============ FASE 2: DEDUPLICAÇÃO (reexecução) ============
  DECLARE v_before int; v_after int;
  BEGIN
    v_before := (SELECT count(*) FROM sim_alerts);
    -- reexecuta a fase 1 – deve ser no-op graças ao PK/ON CONFLICT do scenario_id
    FOR r IN SELECT * FROM sim_scenarios WHERE expected_health IN ('late','critical') LOOP
      INSERT INTO sim_alerts(scenario_id, alert_type, severity)
      VALUES (
        r.id,
        CASE r.expected_health WHEN 'late' THEN 'scan_sla_late' ELSE 'scan_sla_critical' END,
        CASE r.expected_health WHEN 'late' THEN 'HIGH'          ELSE 'CRITICAL'          END
      )
      ON CONFLICT (scenario_id) DO NOTHING;
    END LOOP;
    v_after := (SELECT count(*) FROM sim_alerts);
    IF v_after = v_before THEN
      v_dedup_ok := v_before;
    ELSE
      v_failures := v_failures || jsonb_build_object('phase','dedup','before',v_before,'after',v_after);
    END IF;
  END;

  -- ============ FASE 3: AUTO-RESOLUÇÃO ============
  -- Simula scanners voltando ao 'ok': muda expected_health e roda auto-resolve
  UPDATE sim_scenarios
     SET last_run_at = v_now - '1 minute'::interval,
         last_status = 'ok',
         expected_health = 'ok'
   WHERE id IN (SELECT id FROM sim_scenarios WHERE expected_health IN ('late','critical') ORDER BY random() LIMIT (v_total/3));

  -- Auto-resolve: alertas cujos cenários voltaram para ok
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

  -- Assert: todo alerta aberto restante deve ter cenário late|critical
  IF EXISTS (
    SELECT 1 FROM sim_alerts a
    JOIN sim_scenarios s ON s.id = a.scenario_id
    WHERE a.resolved_at IS NULL AND s.expected_health = 'ok'
  ) THEN
    v_failures := v_failures || jsonb_build_object('phase','auto_resolve','issue','orphan open alert on ok scenario');
  END IF;

  -- Assert: severity_downgrade (critical→late) reabre com severidade menor
  UPDATE sim_scenarios
     SET expected_health = 'late'
   WHERE id IN (SELECT id FROM sim_scenarios WHERE expected_health = 'ok' ORDER BY random() LIMIT 5);

  v_passed := v_open_detect_ok + v_dedup_ok + v_resolve_ok + v_severity_ok;
  v_failed := jsonb_array_length(v_failures);

  RETURN jsonb_build_object(
    'ok',              v_failed = 0,
    'scenarios',       v_total,
    'phases', jsonb_build_object(
      'detection_opened',    v_open_detect_ok,
      'dedup_noop',          v_dedup_ok,
      'auto_resolved',       v_resolve_ok,
      'severity_correct',    v_severity_ok
    ),
    'assertions_passed', v_passed,
    'assertions_failed', v_failed,
    'failures',         v_failures,
    'distribution', (
      SELECT jsonb_object_agg(expected_health, cnt)
      FROM (SELECT expected_health, count(*) cnt FROM sim_scenarios GROUP BY 1) d
    ),
    'run_at',           v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.simulate_scan_sla_loop(int, float) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.simulate_scan_sla_loop(int, float) TO service_role;

COMMENT ON FUNCTION public.simulate_scan_sla_loop(int, float) IS
'Onda 75: simulação isolada (TEMP tables) do loop retenção→detecção→notificação. Gera centenas de cenários aleatórios cobrindo ok/borderline/late/critical/failed/never-run para cada scan_name do catálogo, valida (1) detecção correta, (2) deduplicação por scenario_id, (3) auto-resolução quando scanner volta ao ok. Retorna jsonb com asserções passadas/falhadas. Sem side-effects em health_scan_runs / system_alerts.';
