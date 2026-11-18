CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.query_telemetry WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$function$
