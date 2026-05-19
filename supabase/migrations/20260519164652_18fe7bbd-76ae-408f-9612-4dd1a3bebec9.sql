-- Drop existing enum if it exists (for idempotency)
DO $$ BEGIN
    CREATE TYPE public.log_level AS ENUM ('info', 'warn', 'error', 'debug');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the telemetry logs table
CREATE TABLE IF NOT EXISTS public.telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    level public.log_level NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    request_id UUID,
    user_id UUID REFERENCES auth.users(id),
    user_agent TEXT,
    url TEXT,
    client_ip TEXT
);

-- Enable RLS
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for insertion: Any authenticated user can log (for frontend tracking)
CREATE POLICY "Anyone can insert telemetry logs" 
ON public.telemetry_logs 
FOR INSERT 
WITH CHECK (true);

-- Create policy for viewing: Only users with admin role can view logs
CREATE POLICY "Admins can view telemetry logs" 
ON public.telemetry_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role::text = 'admin'
    )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_created_at ON public.telemetry_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_level ON public.telemetry_logs (level);
