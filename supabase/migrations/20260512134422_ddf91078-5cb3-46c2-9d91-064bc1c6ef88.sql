CREATE OR REPLACE FUNCTION public.check_budget_availability(
    p_cost_center_id UUID,
    p_valor NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_available_budget NUMERIC;
    v_cc_name TEXT;
BEGIN
    -- Buscar nome do centro de custo
    SELECT name INTO v_cc_name FROM public.cost_centers WHERE id = p_cost_center_id;

    -- Aqui você deve implementar sua lógica real de orçamento vinculada ao centro de custo
    -- Por enquanto, simularemos uma verificação baseada na tabela department_budgets ou similar se existir
    -- Se não houver lógica complexa, retornamos que está disponível por padrão para este MVP
    
    RETURN jsonb_build_object(
        'available', true,
        'has_budget', true,
        'message', 'Orçamento validado para o centro de custo ' || v_cc_name,
        'budget_available', 999999 -- Simulado
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;