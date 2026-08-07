
-- Department Budgets table for budget validation
CREATE TABLE public.department_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_custo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  mes INTEGER, -- NULL means annual budget
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_comprometido NUMERIC NOT NULL DEFAULT 0,
  valor_utilizado NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (centro_custo, ano, mes)
);

ALTER TABLE public.department_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budgets"
ON public.department_budgets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and coordinator can manage budgets"
ON public.department_budgets FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Finance can manage budgets"
ON public.department_budgets FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'finance'::app_role))
WITH CHECK (has_role(auth.uid(), 'finance'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_department_budgets_updated_at
BEFORE UPDATE ON public.department_budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check budget availability before approval
CREATE OR REPLACE FUNCTION public.check_budget_availability(p_centro_custo TEXT, p_valor NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_available NUMERIC;
BEGIN
  SELECT * INTO v_budget
  FROM public.department_budgets
  WHERE centro_custo = p_centro_custo
  AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND (mes IS NULL OR mes = EXTRACT(MONTH FROM CURRENT_DATE))
  ORDER BY mes NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', true, 'message', 'Sem orçamento definido para este centro de custo', 'has_budget', false);
  END IF;

  v_available := v_budget.valor_total - v_budget.valor_comprometido - v_budget.valor_utilizado;

  IF p_valor > v_available THEN
    RETURN jsonb_build_object(
      'available', false,
      'has_budget', true,
      'budget_total', v_budget.valor_total,
      'budget_committed', v_budget.valor_comprometido,
      'budget_used', v_budget.valor_utilizado,
      'budget_available', v_available,
      'requested', p_valor,
      'message', 'Orçamento insuficiente. Disponível: R$ ' || ROUND(v_available, 2)
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'has_budget', true,
    'budget_total', v_budget.valor_total,
    'budget_available', v_available,
    'message', 'Orçamento disponível'
  );
END;
$$;
