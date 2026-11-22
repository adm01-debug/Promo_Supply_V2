CREATE OR REPLACE FUNCTION public.check_telemetry_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_alert_id UUID;
BEGIN
  IF NEW.level = 'error'::public.log_level THEN
    SELECT id INTO v_alert_id
      FROM public.system_alerts
     WHERE alert_type = 'SYSTEM_ERROR'
       AND resolved_at IS NULL
       AND message = NEW.message
       AND tenant_id IS NOT DISTINCT FROM NEW.tenant_id
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_alert_id IS NULL THEN
      INSERT INTO public.system_alerts (tenant_id, alert_type, severity, message, metadata)
      VALUES (
        NEW.tenant_id,
        'SYSTEM_ERROR',
        'HIGH',
        NEW.message,
        COALESCE(NEW.context, '{}'::jsonb)
          || jsonb_build_object('occurrences', 1, 'last_seen', now())
      );
    ELSE
      UPDATE public.system_alerts
         SET metadata = COALESCE(metadata, '{}'::jsonb)
               || jsonb_build_object(
                    'occurrences', COALESCE((metadata->>'occurrences')::int, 1) + 1,
                    'last_seen', now()
                  ),
             dispatch_status = CASE
               WHEN dispatch_status = 'delivered' THEN 'delivered'
               ELSE dispatch_status
             END
       WHERE id = v_alert_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
