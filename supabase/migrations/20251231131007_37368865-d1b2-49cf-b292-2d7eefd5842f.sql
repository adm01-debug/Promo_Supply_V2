-- Create allowed_countries table for geo whitelist (only these countries can access)
CREATE TABLE public.allowed_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.allowed_countries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage allowed countries" 
ON public.allowed_countries 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view allowed countries" 
ON public.allowed_countries 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create geo settings table for global configuration
CREATE TABLE public.geo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  geo_restriction_enabled BOOLEAN NOT NULL DEFAULT false,
  restriction_mode TEXT NOT NULL DEFAULT 'whitelist' CHECK (restriction_mode IN ('whitelist', 'blacklist')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.geo_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage geo settings" 
ON public.geo_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view geo settings" 
ON public.geo_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.geo_settings (geo_restriction_enabled, restriction_mode) 
VALUES (false, 'whitelist');