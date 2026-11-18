CREATE OR REPLACE FUNCTION public.cleanup_old_query_telemetry()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted integer;
BEGIN
  WITH d AS (
    DELETE FROM public.query_telemetry
     WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM d;
  RETURN v_deleted;
END;
$function$
