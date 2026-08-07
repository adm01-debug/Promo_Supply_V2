-- Create account lockout table for tracking failed attempts and lockouts
CREATE TABLE public.account_lockouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_failed_attempt TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Allow system to manage lockouts
CREATE POLICY "System can manage lockouts" 
ON public.account_lockouts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lockout_record RECORD;
  remaining_seconds INTEGER;
BEGIN
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = _email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
  END IF;
  
  IF lockout_record.locked_until IS NOT NULL AND lockout_record.locked_until > now() THEN
    remaining_seconds := EXTRACT(EPOCH FROM (lockout_record.locked_until - now()))::INTEGER;
    RETURN jsonb_build_object(
      'locked', true, 
      'remaining_seconds', remaining_seconds,
      'locked_until', lockout_record.locked_until
    );
  END IF;
  
  RETURN jsonb_build_object('locked', false, 'remaining_seconds', 0);
END;
$$;

-- Create function to record failed login attempt with exponential backoff
CREATE OR REPLACE FUNCTION public.record_failed_login(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lockout_record RECORD;
  new_failed_attempts INTEGER;
  new_lockout_count INTEGER;
  lockout_duration INTEGER;
  lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get or create lockout record
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = _email;
  
  IF NOT FOUND THEN
    INSERT INTO public.account_lockouts (email, failed_attempts, last_failed_attempt)
    VALUES (_email, 1, now())
    RETURNING * INTO lockout_record;
    
    RETURN jsonb_build_object('locked', false, 'attempts', 1);
  END IF;
  
  -- Reset attempts if last failure was more than 15 minutes ago
  IF lockout_record.last_failed_attempt < now() - INTERVAL '15 minutes' THEN
    new_failed_attempts := 1;
  ELSE
    new_failed_attempts := lockout_record.failed_attempts + 1;
  END IF;
  
  -- Check if should lock (5 failed attempts)
  IF new_failed_attempts >= 5 THEN
    new_lockout_count := lockout_record.lockout_count + 1;
    -- Exponential backoff: 1min, 2min, 4min, 8min, 16min, max 30min
    lockout_duration := LEAST(POWER(2, new_lockout_count - 1)::INTEGER, 30);
    lockout_until := now() + (lockout_duration || ' minutes')::INTERVAL;
    
    UPDATE public.account_lockouts
    SET failed_attempts = 0,
        lockout_count = new_lockout_count,
        locked_until = lockout_until,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = _email;
    
    RETURN jsonb_build_object(
      'locked', true, 
      'lockout_minutes', lockout_duration,
      'locked_until', lockout_until,
      'lockout_count', new_lockout_count
    );
  ELSE
    UPDATE public.account_lockouts
    SET failed_attempts = new_failed_attempts,
        last_failed_attempt = now(),
        updated_at = now()
    WHERE email = _email;
    
    RETURN jsonb_build_object(
      'locked', false, 
      'attempts', new_failed_attempts,
      'remaining_attempts', 5 - new_failed_attempts
    );
  END IF;
END;
$$;

-- Create function to clear lockout on successful login
CREATE OR REPLACE FUNCTION public.clear_login_lockout(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.account_lockouts
  SET failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE email = _email;
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_account_lockouts_email ON public.account_lockouts(email);
CREATE INDEX idx_account_lockouts_locked_until ON public.account_lockouts(locked_until) WHERE locked_until IS NOT NULL;