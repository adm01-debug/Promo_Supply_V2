
-- =====================================================================
-- Onda 62 · R-05  Cleanup de password_reset_requests expirados
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS TABLE(deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH del AS (
    DELETE FROM public.password_reset_requests
    WHERE expires_at IS NOT NULL
      AND expires_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*)::int INTO v_deleted FROM del;

  INSERT INTO public.health_scan_runs (scan_name, status, details)
  VALUES (
    'cleanup_expired_password_resets',
    'ok',
    jsonb_build_object('deleted', v_deleted, 'ran_at', now())
  );

  RETURN QUERY SELECT v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_password_resets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_password_resets() TO service_role;

-- =====================================================================
-- Onda 62 · R-11  Observador de staleness dos cron jobs
-- =====================================================================
CREATE OR REPLACE VIEW public.cron_job_staleness AS
SELECT
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  latest.last_run_at,
  latest.status                                              AS last_status,
  EXTRACT(EPOCH FROM (now() - latest.last_run_at)) / 3600.0  AS hours_since_last_run,
  CASE
    WHEN latest.last_run_at IS NULL                                THEN 'never_ran'
    WHEN now() - latest.last_run_at > interval '48 hours'          THEN 'critical'
    WHEN now() - latest.last_run_at > interval '24 hours'          THEN 'warning'
    ELSE 'healthy'
  END                                                        AS health
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT start_time AS last_run_at, status
  FROM cron.job_run_details d
  WHERE d.jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) latest ON true;

REVOKE ALL ON public.cron_job_staleness FROM PUBLIC, anon;
GRANT SELECT ON public.cron_job_staleness TO authenticated, service_role;

COMMENT ON VIEW public.cron_job_staleness IS
  'Onda 62: exibe saúde dos jobs pg_cron. Consumido por /admin/health.';

-- =====================================================================
-- Agendamento diário do cleanup (03:35 UTC)
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_password_resets_daily') THEN
    PERFORM cron.unschedule('cleanup_expired_password_resets_daily');
  END IF;

  PERFORM cron.schedule(
    'cleanup_expired_password_resets_daily',
    '35 3 * * *',
    $cron$SELECT public.cleanup_expired_password_resets();$cron$
  );
END $$;
