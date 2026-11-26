-- Ensure organizations table exists with correct schema
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure user_organizations links users to multiple tenants
CREATE TABLE IF NOT EXISTS public.user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', 
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Add current_organization_id to profiles for session tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES public.organizations(id);

-- Standardize organization_id across all business tables
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.fiscal_documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.licitacoes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Helper function to get the current user's active organization
CREATE OR REPLACE FUNCTION public.get_my_organization()
RETURNS UUID AS $$
    SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Global Multi-Tenant RLS Policy Pattern
-- We apply this to all business tables to ensure zero data leak between companies.

DO $$
DECLARE
    t text;
    tables_to_isolate text[] := ARRAY[
        'solicitacoes', 'pedidos', 'cotacoes', 'fornecedores', 
        'produtos', 'pagamentos', 'contracts', 'fiscal_documents', 
        'licitacoes', 'sourcing_pipeline', 'category_strategies'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_isolate
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "tenant_isolation" ON public.%I FOR ALL USING (organization_id = public.get_my_organization())', t);
    END LOOP;
END $$;

-- Create default org and join current users to it for backward compatibility
DO $$
DECLARE
    default_org_id UUID;
    u_id UUID;
BEGIN
    INSERT INTO public.organizations (name, slug) 
    VALUES ('Promo Supply Enterprise', 'promo-supply') 
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;

    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'promo-supply';
    END IF;

    -- Update all existing data to the default org
    UPDATE public.solicitacoes SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.pedidos SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.cotacoes SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.fornecedores SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.produtos SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.pagamentos SET organization_id = default_org_id WHERE organization_id IS NULL;

    -- Link all existing users to the default org and set it as active
    FOR u_id IN SELECT id FROM auth.users
    LOOP
        INSERT INTO public.user_organizations (user_id, organization_id, role, is_default)
        VALUES (u_id, default_org_id, 'admin', true)
        ON CONFLICT DO NOTHING;

        UPDATE public.profiles SET current_organization_id = default_org_id WHERE user_id = u_id;
    END LOOP;
END $$;
