CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id uuid, p_valor numeric, p_data date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ano INTEGER := EXTRACT(YEAR FROM COALESCE(p_data, CURRENT_DATE))::INTEGER;
    v_cc_name TEXT;
    v_total NUMERIC;
    v_committed NUMERIC;
    v_used NUMERIC;
    v_available NUMERIC;
    v_source TEXT;
    v_valor NUMERIC := COALESCE(p_valor, 0);
BEGIN
    SELECT c.name INTO v_cc_name
      FROM public.cost_centers c
     WHERE c.id = p_cost_center_id;

    -- Fonte principal: orcamento anual do centro de custo (o que os gatilhos alimentam).
    SELECT COALESCE(b.valor_total, 0), COALESCE(b.valor_comprometido, 0), COALESCE(b.valor_utilizado, 0)
      INTO v_total, v_committed, v_used
      FROM public.department_budgets b
     WHERE b.cost_center_id = p_cost_center_id
       AND b.ano = v_ano
       AND b.mes IS NULL
     ORDER BY b.updated_at DESC
     LIMIT 1;

    IF FOUND THEN
        v_source := 'department_budgets_ano';
    ELSE
        -- Fallback: centro de custo sem linha anual (cadastro antigo) usa as colunas dele.
        SELECT COALESCE(c.total_budget, 0), COALESCE(c.committed_amount, 0), COALESCE(c.used_amount, 0)
          INTO v_total, v_committed, v_used
          FROM public.cost_centers c
         WHERE c.id = p_cost_center_id;

        IF FOUND THEN
            v_source := 'cost_centers';
        ELSE
            v_source := 'sem_orcamento';
            v_total := 0; v_committed := 0; v_used := 0;
        END IF;
    END IF;

    v_available := v_total - (v_committed + v_used);

    IF v_total <= 0 THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', false,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Centro de custo sem orçamento cadastrado' ||
                       COALESCE(' para ' || v_cc_name, '') || '; solicitação liberada sem trava orçamentária.',
            'budget_source', v_source,
            'budget_year', v_ano
        );
    END IF;

    IF v_available >= v_valor THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', true,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo disponível no centro de custo ' || COALESCE(v_cc_name, ''),
            'budget_source', v_source,
            'budget_year', v_ano
        );
    ELSE
        RETURN json_build_object(
            'available', false,
            'has_budget', true,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo insuficiente no centro de custo ' || COALESCE(v_cc_name, '') ||
                       '. Disponível: ' || v_available,
            'budget_source', v_source,
            'budget_year', v_ano
        );
    END IF;
END;
$function$
