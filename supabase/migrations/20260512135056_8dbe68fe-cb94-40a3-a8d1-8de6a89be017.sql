-- Adicionar cost_center_id na tabela department_budgets
ALTER TABLE public.department_budgets 
ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);

-- Criar índice para performance
CREATE INDEX idx_department_budgets_cost_center ON public.department_budgets(cost_center_id);

-- Atualizar a função check_budget_availability para usar validações reais
CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id uuid, p_valor numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget RECORD;
  v_available NUMERIC;
  v_cc_name TEXT;
BEGIN
  -- Buscar nome do centro de custo
  SELECT name INTO v_cc_name FROM public.cost_centers WHERE id = p_cost_center_id;
  
  IF v_cc_name IS NULL THEN
    RETURN jsonb_build_object('available', false, 'message', 'Centro de custo não encontrado', 'has_budget', false);
  END IF;

  -- Buscar orçamento vigente para o centro de custo
  SELECT * INTO v_budget
  FROM public.department_budgets
  WHERE cost_center_id = p_cost_center_id
  AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND (mes IS NULL OR mes = EXTRACT(MONTH FROM CURRENT_DATE))
  ORDER BY mes NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', true, 
      'message', 'Sem orçamento definido para ' || v_cc_name || '. Prosseguindo sem restrição orçamentária.', 
      'has_budget', false
    );
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
      'message', 'Orçamento insuficiente para ' || v_cc_name || '. Disponível: R$ ' || ROUND(v_available, 2)
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'has_budget', true,
    'budget_total', v_budget.valor_total,
    'budget_available', v_available,
    'message', 'Orçamento disponível para ' || v_cc_name
  );
END;
$function$;
