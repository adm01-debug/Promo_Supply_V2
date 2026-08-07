
-- Fix search_path
CREATE OR REPLACE FUNCTION public.check_telemetry_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.level = 'ERROR' THEN
        INSERT INTO public.system_alerts (tenant_id, alert_type, severity, message, metadata)
        VALUES (NEW.tenant_id, 'SYSTEM_ERROR', 'HIGH', NEW.message, NEW.context);
    END IF;
    RETURN NEW;
END;
$$;

-- Revogar EXECUTE público em funções internas (só usadas por triggers)
REVOKE EXECUTE ON FUNCTION public.apply_penalty_escalation()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calc_checklist_overall_score()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_telemetry_alerts()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_telemetry()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_sensitive_data(jsonb)          FROM PUBLIC, anon, authenticated;
