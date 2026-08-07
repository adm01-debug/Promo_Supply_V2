-- Add organization_id to missing tables
ALTER TABLE public.approval_rules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.approval_delegations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.approval_steps ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS on all tables (idempotent)
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if any and create multi-tenant policies
-- Using a helper function to avoid repetition if needed, but for clarity let's do it explicitly

-- Approval Rules
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization rules" ON public.approval_rules;
    CREATE POLICY "Users can view their organization rules" ON public.approval_rules FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization rules" ON public.approval_rules;
    CREATE POLICY "Users can manage their organization rules" ON public.approval_rules FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Approval Delegations
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization delegations" ON public.approval_delegations;
    CREATE POLICY "Users can view their organization delegations" ON public.approval_delegations FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization delegations" ON public.approval_delegations;
    CREATE POLICY "Users can manage their organization delegations" ON public.approval_delegations FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Approval Workflows
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization workflows" ON public.approval_workflows;
    CREATE POLICY "Users can view their organization workflows" ON public.approval_workflows FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization workflows" ON public.approval_workflows;
    CREATE POLICY "Users can manage their organization workflows" ON public.approval_workflows FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Categories
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization categories" ON public.categorias;
    CREATE POLICY "Users can view their organization categories" ON public.categorias FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization categories" ON public.categorias;
    CREATE POLICY "Users can manage their organization categories" ON public.categorias FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Fornecedores
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization suppliers" ON public.fornecedores;
    CREATE POLICY "Users can view their organization suppliers" ON public.fornecedores FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization suppliers" ON public.fornecedores;
    CREATE POLICY "Users can manage their organization suppliers" ON public.fornecedores FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_rules_org ON public.approval_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_org ON public.approval_delegations(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_org ON public.approval_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_categorias_org ON public.categorias(organization_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_org ON public.fornecedores(organization_id);
CREATE INDEX IF NOT EXISTS idx_produtos_org ON public.produtos(organization_id);
