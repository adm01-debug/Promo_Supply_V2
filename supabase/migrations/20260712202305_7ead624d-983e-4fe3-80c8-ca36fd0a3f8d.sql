
CREATE OR REPLACE FUNCTION public.alerts_severity_timeseries(days integer DEFAULT 7)
RETURNS TABLE(day date, severity text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT generate_series(
      (current_date - (days - 1))::date,
      current_date,
      interval '1 day'
    )::date AS day
  ),
  s AS (
    SELECT unnest(ARRAY['EMERGENCY','CRITICAL','HIGH','MEDIUM','LOW','INFO']) AS severity
  )
  SELECT
    d.day,
    s.severity,
    COALESCE(COUNT(a.id), 0)::bigint AS cnt
  FROM d
  CROSS JOIN s
  LEFT JOIN public.system_alerts a
    ON a.created_at::date = d.day
   AND upper(a.severity) = s.severity
  GROUP BY d.day, s.severity
  ORDER BY d.day, s.severity;
$$;

REVOKE ALL ON FUNCTION public.alerts_severity_timeseries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alerts_severity_timeseries(integer) TO service_role;
