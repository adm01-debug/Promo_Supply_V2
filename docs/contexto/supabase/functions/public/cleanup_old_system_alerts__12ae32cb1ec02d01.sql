CREATE OR REPLACE FUNCTION public.cleanup_old_system_alerts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.system_alerts
  WHERE (resolved_at IS NOT NULL AND resolved_at < now() - interval '60 days')
     OR (resolved_at IS NULL AND created_at < now() - interval '180 days');
END;
$function$
