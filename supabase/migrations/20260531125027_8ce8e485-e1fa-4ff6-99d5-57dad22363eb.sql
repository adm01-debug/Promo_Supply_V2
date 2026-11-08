-- Update telemetry_logs to include tenant_id
ALTER TABLE public.telemetry_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Grant permissions for telemetry_logs
GRANT INSERT ON public.telemetry_logs TO authenticated;
GRANT ALL ON public.telemetry_logs TO service_role;

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tenant_id UUID,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID
);

-- Grant permissions for system_alerts
GRANT SELECT ON public.system_alerts TO authenticated;
GRANT ALL ON public.system_alerts TO service_role;

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for system_alerts
CREATE POLICY "Users can view alerts for their tenant"
    ON public.system_alerts
    FOR SELECT
    USING (tenant_id IS NULL OR (auth.uid() IN (
        SELECT id FROM auth.users WHERE (raw_user_meta_data->>'tenant_id')::uuid = tenant_id
    )));

-- Function to automatically trigger alerts on high-severity logs
CREATE OR REPLACE FUNCTION public.check_telemetry_alerts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.level = 'ERROR' THEN
        INSERT INTO public.system_alerts (tenant_id, alert_type, severity, message, metadata)
        VALUES (NEW.tenant_id, 'SYSTEM_ERROR', 'HIGH', NEW.message, NEW.context);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for telemetry_logs
DROP TRIGGER IF EXISTS trigger_check_telemetry_alerts ON public.telemetry_logs;
CREATE TRIGGER trigger_check_telemetry_alerts
    AFTER INSERT ON public.telemetry_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.check_telemetry_alerts();
