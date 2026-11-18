CREATE OR REPLACE FUNCTION public.alerts_mttr_by_type(days integer DEFAULT 7)
 RETURNS TABLE(alert_type text, severity text, resolved_count bigint, avg_minutes numeric, p50_minutes numeric, p95_minutes numeric, max_minutes numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
