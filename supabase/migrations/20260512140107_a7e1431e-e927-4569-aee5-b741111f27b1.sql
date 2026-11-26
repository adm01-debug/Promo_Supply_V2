-- Adicionar colunas extras na tabela cost_centers
ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.cost_centers(id),
ADD COLUMN IF NOT EXISTS department TEXT;

-- Indexar para performance
CREATE INDEX IF NOT EXISTS idx_cost_centers_manager ON public.cost_centers(manager_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON public.cost_centers(parent_id);

-- Remover funções antigas para evitar conflitos de sobrecarga
DROP FUNCTION IF EXISTS public.check_budget_availability(text, numeric);
DROP FUNCTION IF EXISTS public.check_budget_availability(uuid, numeric);

-- Recriar a função de verificação de orçamento de forma robusta
CREATE OR REPLACE FUNCTION public.check_budget_availability(
    p_cost_center_id UUID,
    p_valor NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_total_budget NUMERIC;
    v_committed NUMERIC;
    v_used NUMERIC;
    v_available NUMERIC;
    v_cc_name TEXT;
BEGIN
    -- Obter o nome do centro de custo
    SELECT name INTO v_cc_name FROM public.cost_centers WHERE id = p_cost_center_id;

    IF v_cc_name IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'has_budget', false,
            'message', 'Centro de Custo não encontrado.'
        );
    END IF;

    -- Obter o orçamento para o centro de custo no ano atual
    SELECT valor_total, valor_comprometido, valor_utilizado
    INTO v_total_budget, v_committed, v_used
    FROM public.department_budgets
    WHERE cost_center_id = p_cost_center_id
    AND ano = EXTRACT(YEAR FROM CURRENT_DATE)
    LIMIT 1;

    IF v_total_budget IS NULL THEN
        RETURN jsonb_build_object(
            'available', false,
            'has_budget', false,
            'message', 'Nenhum orçamento definido para o Centro de Custo ' || v_cc_name || ' em ' || EXTRACT(YEAR FROM CURRENT_DATE)
        );
    END IF;

    v_available := v_total_budget - (v_committed + v_used);

    IF v_available >= p_valor THEN
        RETURN jsonb_build_object(
            'available', true,
            'has_budget', true,
            'budget_total', v_total_budget,
            'budget_available', v_available,
            'message', 'Saldo disponível no Centro de Custo ' || v_cc_name
        );
    ELSE
        RETURN jsonb_build_object(
            'available', false,
            'has_budget', true,
            'budget_total', v_total_budget,
            'budget_available', v_available,
            'message', 'Saldo insuficiente no Centro de Custo ' || v_cc_name || '. Necessário: R$ ' || ROUND(p_valor, 2) || ', Disponível: R$ ' || ROUND(v_available, 2)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
