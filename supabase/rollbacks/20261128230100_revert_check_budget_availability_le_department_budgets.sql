-- Reversao da 20261128230100_check_budget_availability_le_department_budgets.sql
-- (etapas 090/137). Volta a assinatura (uuid, numeric) lendo cost_centers, como estava
-- antes da migration. NAO e aplicada pelo workflow.

BEGIN;

DROP FUNCTION IF EXISTS public.check_budget_availability(uuid, numeric, date);

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


REVOKE EXECUTE ON FUNCTION public.check_budget_availability(uuid, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_budget_availability(uuid, numeric) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';