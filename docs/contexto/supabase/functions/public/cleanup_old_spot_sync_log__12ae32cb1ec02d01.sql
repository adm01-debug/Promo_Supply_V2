CREATE OR REPLACE FUNCTION public.cleanup_old_spot_sync_log()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted integer;
BEGIN
  WITH d AS (
    DELETE FROM public.spot_api_sync_log
     WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END;
$function$
