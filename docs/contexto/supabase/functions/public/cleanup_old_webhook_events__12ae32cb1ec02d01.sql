CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE deleted integer;
BEGIN
  DELETE FROM public.webhook_events
   WHERE received_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$function$
