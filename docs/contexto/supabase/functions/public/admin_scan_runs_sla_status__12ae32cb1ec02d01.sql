CREATE OR REPLACE FUNCTION public.admin_scan_runs_sla_status()
 RETURNS TABLE(scan_name text, last_run_at timestamp with time zone, age_minutes integer, sla_minutes integer, last_status text, health text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH sla(scan_name, sla_minutes) AS (
    VALUES
      ('lgpd_retention',            1440),  -- 1 dia (retencao LGPD, 1x/dia)
      ('refresh_mv_dashboard_kpis',   45)   -- 45 min (roda a cada 15 min)
  ),
  latest AS (
    SELECT DISTINCT ON (h.scan_name)
      h.scan_name,
      COALESCE(h.finished_at, h.started_at) AS last_run_at,
      COALESCE(h.status, CASE WHEN h.failed_count > 0 THEN 'failed' ELSE 'ok' END) AS last_status
    FROM public.health_scan_runs h
    WHERE h.scan_name IS NOT NULL
    ORDER BY h.scan_name, COALESCE(h.finished_at, h.started_at) DESC
  )
  SELECT
    COALESCE(l.scan_name, sla.scan_name)                                            AS scan_name,
    l.last_run_at                                                                   AS last_run_at,
    CASE
      WHEN l.last_run_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - l.last_run_at))::int / 60
    END                                                                             AS age_minutes,
    sla.sla_minutes                                                                 AS sla_minutes,
    l.last_status                                                                   AS last_status,
    CASE
      WHEN l.last_run_at IS NULL                                                   THEN 'critical'
      WHEN l.last_status IN ('failed','error')                                     THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - l.last_run_at))/60 > sla.sla_minutes * 2    THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - l.last_run_at))/60 > sla.sla_minutes        THEN 'late'
      ELSE 'ok'
    END                                                                             AS health
  FROM sla
  FULL OUTER JOIN latest l USING (scan_name);
$function$
