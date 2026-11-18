CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.rate_limit_logs
     WHERE created_at < now() - INTERVAL '30 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END; $function$
