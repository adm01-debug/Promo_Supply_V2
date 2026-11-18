CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted INTEGER;
BEGIN
  WITH d AS (
    DELETE FROM public.login_attempts
     WHERE created_at < now() - INTERVAL '90 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END; $function$
