CREATE OR REPLACE FUNCTION public.resolve_stale_system_error_alerts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resolved INT;
BEGIN
  WITH stale AS (
    UPDATE public.system_alerts
       SET resolved_at = now()
     WHERE alert_type = 'SYSTEM_ERROR'
       AND resolved_at IS NULL
       AND COALESCE((metadata->>'last_seen')::timestamptz, created_at) < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*) INTO v_resolved FROM stale;
  RETURN v_resolved;
END;
$function$
