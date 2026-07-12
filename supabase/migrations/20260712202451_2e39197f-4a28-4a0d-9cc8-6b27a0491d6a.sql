
-- MTTR por tipo de alerta nos últimos N dias (apenas alertas resolvidos)
CREATE OR REPLACE FUNCTION public.alerts_mttr_by_type(days integer DEFAULT 7)
RETURNS TABLE(
  alert_type text,
  severity text,
  resolved_count bigint,
  avg_minutes numeric,
  p50_minutes numeric,
  p95_minutes numeric,
  max_minutes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    alert_type,
    upper(severity) AS severity,
    COUNT(*)::bigint AS resolved_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60.0)::numeric, 2) AS avg_minutes,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60.0)::numeric, 2) AS p50_minutes,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60.0)::numeric, 2) AS p95_minutes,
    ROUND(MAX(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60.0)::numeric, 2) AS max_minutes
  FROM public.system_alerts
  WHERE resolved_at IS NOT NULL
    AND created_at >= now() - make_interval(days => days)
  GROUP BY alert_type, upper(severity)
  ORDER BY resolved_count DESC, avg_minutes DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.alerts_mttr_by_type(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alerts_mttr_by_type(integer) TO service_role;

-- Ranking de scanners "barulhentos": maior volume de alertas emitidos nas últimas 24h
CREATE OR REPLACE FUNCTION public.alerts_noisy_scanners(days integer DEFAULT 1)
RETURNS TABLE(
  alert_type text,
  total bigint,
  unresolved bigint,
  distinct_severities bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    alert_type,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE resolved_at IS NULL)::bigint AS unresolved,
    COUNT(DISTINCT upper(severity))::bigint AS distinct_severities,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen
  FROM public.system_alerts
  WHERE created_at >= now() - make_interval(days => days)
  GROUP BY alert_type
  ORDER BY total DESC
  LIMIT 15;
$$;

REVOKE ALL ON FUNCTION public.alerts_noisy_scanners(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alerts_noisy_scanners(integer) TO service_role;
