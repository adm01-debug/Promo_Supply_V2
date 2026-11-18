CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id uuid, p_valor numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total DECIMAL;
    v_committed DECIMAL;
    v_used DECIMAL;
    v_available DECIMAL;
    v_cc_name TEXT;
BEGIN
    SELECT name, COALESCE(total_budget, 0), COALESCE(committed_amount, 0), COALESCE(used_amount, 0)
    INTO v_cc_name, v_total, v_committed, v_used
    FROM public.cost_centers 
    WHERE id = p_cost_center_id;

    v_available := v_total - (v_committed + v_used);

    IF v_available >= p_valor THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', v_total > 0,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo disponível no centro de custo ' || v_cc_name
        );
    ELSE
        RETURN json_build_object(
            'available', false,
            'has_budget', v_total > 0,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo insuficiente no centro de custo ' || v_cc_name || '. Disponível: ' || v_available
        );
    END IF;
END;
$function$
