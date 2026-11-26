ALTER TABLE public.approval_rules ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);
CREATE INDEX idx_approval_rules_cost_center ON public.approval_rules(cost_center_id);
