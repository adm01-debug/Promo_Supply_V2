CREATE OR REPLACE FUNCTION public.upsert_cron_heartbeat(p_job_name text, p_status text, p_error text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.cron_heartbeats (
    job_name, last_run_at, last_status, last_error,
    run_count, success_count, error_count, updated_at
  ) VALUES (
    p_job_name, now(), p_status, p_error,
    1,
    CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'error'   THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (job_name) DO UPDATE SET
    last_run_at   = now(),
    last_status   = p_status,
    last_error    = p_error,
    run_count     = cron_heartbeats.run_count + 1,
    success_count = cron_heartbeats.success_count + CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    error_count   = cron_heartbeats.error_count   + CASE WHEN p_status = 'error'   THEN 1 ELSE 0 END,
    updated_at    = now();
END;
$function$
