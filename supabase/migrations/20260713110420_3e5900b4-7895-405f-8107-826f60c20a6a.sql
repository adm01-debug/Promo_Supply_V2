
DROP FUNCTION IF EXISTS public.get_db_health_snapshot();

CREATE OR REPLACE FUNCTION public.get_db_health_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Autorização: apenas admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied: admin role required'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),

    -- Alertas: agregado 24h
    'alerts_24h', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE resolved_at IS NULL),
        'resolved', COUNT(*) FILTER (WHERE resolved_at IS NOT NULL),
        'by_severity', jsonb_object_agg(severity, cnt_sev),
        'by_type', (
          SELECT jsonb_object_agg(alert_type, cnt_type)
          FROM (
            SELECT alert_type, COUNT(*) AS cnt_type
            FROM public.system_alerts
            WHERE created_at > now() - interval '24 hours'
            GROUP BY alert_type
            ORDER BY cnt_type DESC
            LIMIT 25
          ) t
        )
      )
      FROM (
        SELECT severity, COUNT(*) AS cnt_sev
        FROM public.system_alerts
        WHERE created_at > now() - interval '24 hours'
        GROUP BY severity
      ) s
    ),

    -- Top 5 críticos ativos
    'critical_open', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      FROM (
        SELECT id, alert_type, severity, title, created_at, metadata
        FROM public.system_alerts
        WHERE resolved_at IS NULL
          AND severity IN ('critical','high')
        ORDER BY
          CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT 5
      ) x
    ),

    -- Cron jobs de monitoramento
    'monitoring_jobs', (
      SELECT COALESCE(jsonb_agg(row_to_json(j) ORDER BY j.jobname), '[]'::jsonb)
      FROM (
        SELECT
          jobname,
          schedule,
          active,
          (SELECT status FROM cron.job_run_details d
            WHERE d.jobid = c.jobid ORDER BY start_time DESC LIMIT 1) AS last_status,
          (SELECT start_time FROM cron.job_run_details d
            WHERE d.jobid = c.jobid ORDER BY start_time DESC LIMIT 1) AS last_run
        FROM cron.job c
        WHERE jobname LIKE 'scan_%' OR jobname LIKE '%_monitor%' OR jobname LIKE '%_health%'
      ) j
    ),

    -- Últimas 10 execuções de health scan
    'recent_scans', (
      SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      FROM (
        SELECT id, scan_type, status, started_at, finished_at, findings_count
        FROM public.health_scan_runs
        ORDER BY started_at DESC
        LIMIT 10
      ) r
    ),

    -- Database vitals
    'database', (
      SELECT jsonb_build_object(
        'name', current_database(),
        'size_pretty', pg_size_pretty(pg_database_size(current_database())),
        'size_bytes', pg_database_size(current_database()),
        'txid_age', age(datfrozenxid),
        'txid_pct_used', round((age(datfrozenxid)::numeric / 2000000000) * 100, 2),
        'connections_active', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
        'connections_idle', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle'),
        'connections_idle_in_transaction', (SELECT COUNT(*) FROM pg_stat_activity WHERE state LIKE 'idle in transaction%'),
        'max_connections', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
        'cache_hit_ratio', (
          SELECT round((sum(blks_hit)::numeric / NULLIF(sum(blks_hit) + sum(blks_read), 0)) * 100, 2)
          FROM pg_stat_database WHERE datname = current_database()
        ),
        'deadlocks', (SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()),
        'rolled_back', (SELECT xact_rollback FROM pg_stat_database WHERE datname = current_database())
      )
      FROM pg_database WHERE datname = current_database()
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_db_health_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_db_health_snapshot() TO authenticated;
