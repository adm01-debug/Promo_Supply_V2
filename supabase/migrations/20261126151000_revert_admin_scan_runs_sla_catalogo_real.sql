-- Reversao de 20261126151000_admin_scan_runs_sla_catalogo_real.sql
--
-- NAO esta no fluxo de deploy: aplica de volta o catalogo de 7 nomes que existia
-- em 20260712223608_27e977bb-634d-42c4-b07d-23cb5f25956a.sql (cartao volta a
-- exibir 7 scanners como `critical` permanente).

CREATE OR REPLACE FUNCTION public.admin_scan_runs_sla_status()
RETURNS TABLE (
  scan_name        text,
  last_run_at      timestamptz,
  age_minutes      integer,
  sla_minutes      integer,
  last_status      text,
  health           text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH sla(scan_name, sla_minutes) AS (
    VALUES
      ('archive_audit_logs',      44640),
      ('archive_telemetry_logs',  44640),
      ('cleanup_health_scan_runs',1440),
      ('secret_rotation_check',   1440),
      ('ensure_partitions',       44640),
      ('slack_watchdog',          60),
      ('security_scan',           1440)
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
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_scan_runs_sla_status() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_scan_runs_sla_status() TO authenticated, service_role;