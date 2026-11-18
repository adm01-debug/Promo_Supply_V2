CREATE OR REPLACE FUNCTION public.alert_on_outbox_dead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'dead' AND (OLD.status IS DISTINCT FROM 'dead') THEN
    INSERT INTO public.system_alerts (alert_type, severity, message, metadata)
    VALUES (
      'outbox_dead_letter',
      'HIGH',
      format('Integration outbox message %s failed permanently after %s retries (target=%s)',
             NEW.id, NEW.retries, NEW.target),
      jsonb_build_object(
        'outbox_id', NEW.id,
        'target', NEW.target,
        'endpoint', NEW.endpoint,
        'retries', NEW.retries,
        'last_error', NEW.last_error
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
