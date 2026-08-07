-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Link users to organizations
CREATE TABLE IF NOT EXISTS public.user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- admin, member, guest
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Add organization_id to key tables
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Create a default organization for existing data
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    INSERT INTO public.organizations (name, slug) 
    VALUES ('Default Organization', 'default') 
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;

    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'default';
    END IF;

    -- Update existing data to default org
    UPDATE public.solicitacoes SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.pedidos SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.cotacoes SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.fornecedores SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.produtos SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their organizations" 
ON public.organizations 
FOR SELECT 
USING (id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can see their own memberships" 
ON public.user_organizations 
FOR SELECT 
USING (user_id = auth.uid());

-- RLS for data isolation (Example for solicitacoes)
-- Note: This would need to be applied to all tables.
-- For now, we'll just add the column and basic policies.
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own solicitacoes" ON public.solicitacoes;
CREATE POLICY "Tenant isolation for solicitacoes" 
ON public.solicitacoes 
FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));
