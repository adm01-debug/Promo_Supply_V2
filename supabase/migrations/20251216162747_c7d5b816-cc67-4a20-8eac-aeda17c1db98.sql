-- Create enum for action types
CREATE TYPE public.audit_action_type AS ENUM (
  'create',
  'update',
  'delete',
  'view',
  'export',
  'login',
  'logout',
  'approve',
  'reject',
  'cancel'
);

-- Create enum for entity types
CREATE TYPE public.audit_entity_type AS ENUM (
  'solicitacao',
  'cotacao',
  'pedido',
  'pagamento',
  'fornecedor',
  'usuario',
  'configuracao',
  'relatorio'
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  action_type audit_action_type NOT NULL,
  entity_type audit_entity_type NOT NULL,
  entity_id TEXT,
  entity_description TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create app_role enum for future roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'buyer', 'finance', 'viewer');

-- Create user_roles table for future authentication
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Allow inserting audit logs for authenticated users
CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policy for anon users (for mock data phase)
CREATE POLICY "Allow anon to insert audit logs"
ON public.audit_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- RLS policy: Allow anon to view for development (remove in production)
CREATE POLICY "Allow anon to view audit logs (dev only)"
ON public.audit_logs
FOR SELECT
TO anon
USING (true);

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));