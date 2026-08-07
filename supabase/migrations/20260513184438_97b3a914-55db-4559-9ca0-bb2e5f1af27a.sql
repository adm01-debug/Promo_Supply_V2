-- Sourcing Pipeline / Projects
DO $$ BEGIN
    CREATE TYPE public.sourcing_project_status AS ENUM ('backlog', 'planning', 'execution', 'negotiation', 'implementation', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.sourcing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categorias(id),
  status sourcing_project_status NOT NULL DEFAULT 'backlog',
  owner_id UUID REFERENCES auth.users(id),
  estimated_spend NUMERIC(15,2),
  target_saving_pct NUMERIC(5,2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Savings Tracker
DO $$ BEGIN
    CREATE TYPE public.saving_type AS ENUM ('negotiated', 'avoidance', 'process', 'specification');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.savings_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.sourcing_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type saving_type NOT NULL DEFAULT 'negotiated',
  baseline_value NUMERIC(15,2) NOT NULL,
  negotiated_value NUMERIC(15,2) NOT NULL,
  actual_saving NUMERIC(15,2) GENERATED ALWAYS AS (baseline_value - negotiated_value) STORED,
  currency CHAR(3) DEFAULT 'BRL',
  validated_by_finance BOOLEAN DEFAULT false,
  finance_notes TEXT,
  realized_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sourcing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_tracker ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "tenant_isolation_sourcing_projects" ON public.sourcing_projects
      FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "tenant_isolation_savings_tracker" ON public.savings_tracker
      FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Triggers for updated_at
DO $$ BEGIN
    CREATE TRIGGER update_sourcing_projects_updated_at BEFORE UPDATE ON public.sourcing_projects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER update_savings_tracker_updated_at BEFORE UPDATE ON public.savings_tracker
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;
