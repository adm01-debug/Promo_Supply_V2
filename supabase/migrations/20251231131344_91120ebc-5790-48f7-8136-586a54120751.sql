-- Create password reset requests table with approval workflow
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'expired')),
  reason TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  reset_token TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own reset requests" 
ON public.password_reset_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create reset requests for themselves
CREATE POLICY "Users can create their own reset requests" 
ON public.password_reset_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all reset requests" 
ON public.password_reset_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update reset requests" 
ON public.password_reset_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can update requests (for completion)
CREATE POLICY "System can update requests" 
ON public.password_reset_requests 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_email ON public.password_reset_requests(email);
CREATE INDEX idx_password_reset_requests_token ON public.password_reset_requests(reset_token) WHERE reset_token IS NOT NULL;