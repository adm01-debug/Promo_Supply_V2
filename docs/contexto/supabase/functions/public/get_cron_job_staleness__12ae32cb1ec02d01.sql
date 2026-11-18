CREATE OR REPLACE FUNCTION public.get_cron_job_staleness()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, active boolean, last_run_at timestamp with time zone, last_status text, hours_since_last_run numeric, health text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    latest.last_run_at,
    latest.status,
    EXTRACT(EPOCH FROM (now() - latest.last_run_at)) / 3600.0,
    CASE
      WHEN latest.last_run_at IS NULL                       THEN 'never_ran'
      WHEN now() - latest.last_run_at > interval '48 hours' THEN 'critical'
      WHEN now() - latest.last_run_at > interval '24 hours' THEN 'warning'
      ELSE 'healthy'
    END
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT start_time AS last_run_at, status
    FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY start_time DESC
    LIMIT 1
  ) latest ON true
  WHERE public.has_role(auth.uid(), 'admin');
$function$
