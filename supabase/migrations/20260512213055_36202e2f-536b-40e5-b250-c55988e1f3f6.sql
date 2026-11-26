-- Add organization_id to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS on audit_logs if not already enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Users can view audit logs for their organization'
    ) THEN
        CREATE POLICY "Users can view audit logs for their organization" 
        ON public.audit_logs 
        FOR SELECT 
        USING (organization_id IN (
            SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'System can insert audit logs'
    ) THEN
        CREATE POLICY "System can insert audit logs" 
        ON public.audit_logs 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;
