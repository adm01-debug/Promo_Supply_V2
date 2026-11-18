CREATE OR REPLACE FUNCTION public.cleanup_deadlock_snapshots()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.deadlock_snapshots
  WHERE captured_at < now() - INTERVAL '7 days';
$function$
