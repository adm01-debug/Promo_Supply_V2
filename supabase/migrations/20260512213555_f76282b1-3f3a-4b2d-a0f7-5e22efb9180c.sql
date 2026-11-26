-- Add organization_id to missing tables
ALTER TABLE public.department_budgets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.dashboard_filter_favorites ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS
ALTER TABLE public.department_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_filter_favorites ENABLE ROW LEVEL SECURITY;

-- Department Budgets Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization budgets" ON public.department_budgets;
    CREATE POLICY "Users can view their organization budgets" ON public.department_budgets FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization budgets" ON public.department_budgets;
    CREATE POLICY "Users can manage their organization budgets" ON public.department_budgets FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Dashboard Filter Favorites Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their organization dashboard filters" ON public.dashboard_filter_favorites;
    CREATE POLICY "Users can view their organization dashboard filters" ON public.dashboard_filter_favorites FOR SELECT USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their organization dashboard filters" ON public.dashboard_filter_favorites;
    CREATE POLICY "Users can manage their organization dashboard filters" ON public.dashboard_filter_favorites FOR ALL USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dept_budgets_org ON public.department_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_filters_org ON public.dashboard_filter_favorites(organization_id);
