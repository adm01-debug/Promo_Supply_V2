
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS TABLE(deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
  v_start   timestamptz := clock_timestamp();
BEGIN
  WITH del AS (
    DELETE FROM public.password_reset_requests
    WHERE expires_at IS NOT NULL
      AND expires_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*)::int INTO v_deleted FROM del;

  INSERT INTO public.health_scan_runs
    (started_at, finished_at, total_scanners, ok_count, failed_count, duration_ms, results)
  VALUES (
    v_start,
    clock_timestamp(),
    1, 1, 0,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::int,
    jsonb_build_object(
      'scan', 'cleanup_expired_password_resets',
      'deleted', v_deleted
    )
  );

  RETURN QUERY SELECT v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_password_resets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_password_resets() TO service_role;
