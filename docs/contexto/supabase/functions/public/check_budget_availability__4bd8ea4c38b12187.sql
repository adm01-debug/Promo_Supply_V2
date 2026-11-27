CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id uuid, p_valor numeric)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cc_name TEXT;
    v_row RECORD;
    v_available DECIMAL;
    v_valor DECIMAL := COALESCE(p_valor, 0);
    v_periodo TEXT;
BEGIN
    SELECT name INTO v_cc_name FROM public.cost_centers WHERE id = p_cost_center_id;

    IF v_cc_name IS NULL THEN
        RETURN json_build_object(
            'available', false,
            'has_budget', false,
            'budget_total', 0,
            'budget_available', 0,
            'message', 'Centro de custo não encontrado.'
        );
    END IF;

    -- Linha anual (mes IS NULL) + linha do mes corrente; vale a mais restritiva.
    SELECT b.*,
           (COALESCE(b.valor_total, 0) - COALESCE(b.valor_comprometido, 0) - COALESCE(b.valor_utilizado, 0)) AS disponivel
    INTO v_row
    FROM public.department_budgets b
    WHERE b.cost_center_id = p_cost_center_id
      AND b.ano = EXTRACT(YEAR FROM CURRENT_DATE)::int
      AND (b.mes IS NULL OR b.mes = EXTRACT(MONTH FROM CURRENT_DATE)::int)
    ORDER BY disponivel ASC, b.mes NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', false,
            'budget_total', 0,
            'budget_committed', 0,
            'budget_used', 0,
            'budget_available', 0,
            'requested', v_valor,
            'message', 'Sem orçamento definido para o centro de custo ' || v_cc_name
                       || ' em ' || TO_CHAR(CURRENT_DATE, 'MM/YYYY')
                       || '. Prosseguindo sem restrição orçamentária.'
        );
    END IF;

    v_available := COALESCE(v_row.disponivel, 0);
    v_periodo := CASE WHEN v_row.mes IS NULL
                      THEN 'orçamento anual'
                      ELSE 'orçamento de ' || LPAD(v_row.mes::text, 2, '0') || '/' || v_row.ano
                 END;

    IF v_available >= v_valor THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', COALESCE(v_row.valor_total, 0) > 0,
            'budget_total', COALESCE(v_row.valor_total, 0),
            'budget_committed', COALESCE(v_row.valor_comprometido, 0),
            'budget_used', COALESCE(v_row.valor_utilizado, 0),
            'budget_available', v_available,
            'requested', v_valor,
            'message', 'Saldo disponível no centro de custo ' || v_cc_name
                       || ' (' || v_periodo || '): ' || ROUND(v_available, 2)
        );
    END IF;

    RETURN json_build_object(
        'available', false,
        'has_budget', COALESCE(v_row.valor_total, 0) > 0,
        'budget_total', COALESCE(v_row.valor_total, 0),
        'budget_committed', COALESCE(v_row.valor_comprometido, 0),
        'budget_used', COALESCE(v_row.valor_utilizado, 0),
        'budget_available', v_available,
        'requested', v_valor,
        'message', 'Saldo insuficiente no centro de custo ' || v_cc_name
                   || ' (' || v_periodo || '). Disponível: ' || ROUND(v_available, 2)
                   || ', solicitado: ' || ROUND(v_valor, 2)
    );
END;
$function$
