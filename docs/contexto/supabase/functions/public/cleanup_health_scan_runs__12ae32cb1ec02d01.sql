CREATE OR REPLACE FUNCTION public.cleanup_health_scan_runs()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  DELETE FROM public.health_scan_runs WHERE started_at < now() - interval '30 days';
$function$
