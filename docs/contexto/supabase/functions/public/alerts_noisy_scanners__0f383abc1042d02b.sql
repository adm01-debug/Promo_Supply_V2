CREATE OR REPLACE FUNCTION public.alerts_noisy_scanners(days integer DEFAULT 1)
 RETURNS TABLE(alert_type text, total bigint, unresolved bigint, distinct_severities bigint, first_seen timestamp with time zone, last_seen timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
