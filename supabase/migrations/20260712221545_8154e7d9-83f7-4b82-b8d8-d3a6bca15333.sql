
CREATE OR REPLACE FUNCTION public.check_telemetry_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.level = 'error'::public.log_level THEN
        INSERT INTO public.system_alerts (tenant_id, alert_type, severity, message, metadata)
        VALUES (NEW.tenant_id, 'SYSTEM_ERROR', 'HIGH', NEW.message, NEW.context);
    END IF;
    RETURN NEW;
END;
$function$;
