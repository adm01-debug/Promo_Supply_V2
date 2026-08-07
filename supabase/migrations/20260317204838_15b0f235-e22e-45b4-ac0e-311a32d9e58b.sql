
-- 1. Receiving Quality Checklists table
CREATE TABLE public.receiving_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  contract_id UUID REFERENCES public.contracts(id),
  inspector_id UUID,
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  packaging_score INTEGER NOT NULL DEFAULT 5,
  conformity_score INTEGER NOT NULL DEFAULT 5,
  quantity_score INTEGER NOT NULL DEFAULT 5,
  documentation_score INTEGER NOT NULL DEFAULT 5,
  overall_score NUMERIC NOT NULL DEFAULT 5,
  notes TEXT,
  defects_found TEXT,
  photos_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'approved',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklists" ON public.receiving_checklists
  FOR SELECT TO public USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers coordinators admins can manage checklists" ON public.receiving_checklists
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));

-- 2. Penalty Escalation Config table
CREATE TABLE public.penalty_escalation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  min_infractions INTEGER NOT NULL DEFAULT 1,
  max_infractions INTEGER,
  action_type TEXT NOT NULL DEFAULT 'warning',
  penalty_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  block_days INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.penalty_escalation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view escalation config" ON public.penalty_escalation_config
  FOR SELECT TO public USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins coordinators can manage escalation config" ON public.penalty_escalation_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

-- 3. Supplier Bonifications table
CREATE TABLE public.supplier_bonifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  contract_id UUID REFERENCES public.contracts(id),
  bonification_type TEXT NOT NULL DEFAULT 'discount',
  value_percent NUMERIC DEFAULT 0,
  reason TEXT NOT NULL,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE,
  compliance_rate NUMERIC DEFAULT 100,
  on_time_deliveries INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_bonifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bonifications" ON public.supplier_bonifications
  FOR SELECT TO public USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins coordinators can manage bonifications" ON public.supplier_bonifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));
