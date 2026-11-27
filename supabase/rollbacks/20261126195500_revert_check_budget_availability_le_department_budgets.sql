-- Reversao de 20261126195500_check_budget_availability_le_department_budgets.sql
--
-- NAO esta no fluxo de deploy: existe para ser aplicado à mão caso a leitura de
-- department_budgets precise ser desfeita. Restaura exatamente a definicao vigente antes
-- daquela migration (20260512143450_5e734e19-0c49-4b8b-ba15-dfc0d412b863.sql:76-112),
-- que le cost_centers.total_budget/committed_amount/used_amount.
--
-- Atencao: com cost_centers alimentado apenas por budget_transactions (0 linhas), voltar
-- a esta definicao faz a trava responder 'available: true' mesmo com o centro de custo
-- estourado em department_budgets.
CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id UUID, p_valor DECIMAL)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
