CREATE OR REPLACE FUNCTION public.cleanup_old_integration_outbox()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE deleted integer := 0; tmp integer;
BEGIN
  DELETE FROM public.integration_outbox
   WHERE status = 'delivered' AND delivered_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS tmp = ROW_COUNT; deleted := deleted + tmp;
  DELETE FROM public.integration_outbox
   WHERE status = 'dead' AND created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS tmp = ROW_COUNT; deleted := deleted + tmp;
  RETURN deleted;
END;
$function$
