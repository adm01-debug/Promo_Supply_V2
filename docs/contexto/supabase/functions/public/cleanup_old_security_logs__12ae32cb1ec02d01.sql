CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.security_logs
     WHERE created_at < NOW() - INTERVAL '180 days'
       AND severity NOT IN ('critical','high')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$function$
