-- Category Strategy and Kraljic Matrix
CREATE TABLE IF NOT EXISTS public.category_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
    kraljic_quadrant TEXT CHECK (kraljic_quadrant IN ('strategic', 'leverage', 'bottleneck', 'routine')),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    spend_impact TEXT CHECK (spend_impact IN ('low', 'medium', 'high')),
    strategy_description TEXT,
    preferred_contract_type TEXT,
    last_review_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Strategic Sourcing Pipeline
CREATE TABLE IF NOT EXISTS public.sourcing_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id),
    status TEXT DEFAULT 'identification' CHECK (status IN ('identification', 'baseline', 'strategy', 'execution', 'negotiation', 'completed', 'cancelled')),
    baseline_value NUMERIC(15,2),
    target_saving_percent NUMERIC(5,2),
    estimated_saving_value NUMERIC(15,2),
    actual_saving_value NUMERIC(15,2),
    comprador_id UUID REFERENCES auth.users(id),
    start_date DATE,
    end_date DATE,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Spend Forecasting (AI generated)
CREATE TABLE IF NOT EXISTS public.spend_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES public.categorias(id),
    forecast_date DATE NOT NULL,
    estimated_value NUMERIC(15,2) NOT NULL,
    confidence_level NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_forecasts ENABLE ROW LEVEL SECURITY;

-- Basic isolation policies (can be refined per role)
CREATE POLICY "Tenant isolation for category_strategies" 
ON public.category_strategies FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for sourcing_pipeline" 
ON public.sourcing_pipeline FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for spend_forecasts" 
ON public.spend_forecasts FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()));

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON public.sourcing_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_forecast_date ON public.spend_forecasts(forecast_date);
