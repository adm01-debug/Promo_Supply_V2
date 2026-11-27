-- Etapa 090 (NEG-08, parte 1 de 2): a trava de orçamento passa a ler department_budgets.
--
-- Por que: public.check_budget_availability lia cost_centers.total_budget/committed_amount/
-- used_amount, colunas que so public.update_cost_center_budget_totals altera no trigger
-- tr_budget_transaction_update (AFTER INSERT ON public.budget_transactions). Nenhum codigo do
-- repositorio insere em budget_transactions (grep em src/ e supabase/functions/) e a tabela tem
-- 0 linhas, entao committed_amount/used_amount ficam em zero e a trava responde quase sempre
-- 'available: true'. O consumo real e escrito em department_budgets.valor_comprometido/
-- valor_utilizado pelos gatilhos do ciclo de compra.
--
-- O que muda: a função localiza as linhas do período atual — a anual (mes IS NULL) e a do mês —
-- com o mesmo criterio de public.update_budget_on_solicitacao_change
-- (20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql:301-311) e usa a
-- disponibilidade da mais restritiva das duas (as duas precisam caber no valor solicitado).
-- Assinatura e contrato JSON preservados: available, has_budget, budget_total,
-- budget_available, message (lidos por src/features/solicitacoes/hooks/useSolicitacoes.ts:136-155)
-- mais budget_committed, budget_used e requested (declareados em
-- src/components/compras/NovaSolicitacaoModal.tsx:53-60).
--
-- Centro de custo sem linha de orçamento no período: available = true e has_budget = false,
-- mantendo o comportamento anterior (a trava não bloqueia quem não tem orçamento cadastrado).
-- Centro de custo inexistente: available = false (mesmo comportamento anterior, fail-closed).
--
-- Não toca cost_centers: approval_threshold e as colunas de orçamento seguem em uso por
-- src/pages/configuracoes/ConfiguracoesCentroCusto.tsx:297-298 e useSolicitacoes.ts:312.
--
-- Reversão (aplicar à mão, se preciso):
--   20261126195500_revert_check_budget_availability_le_department_budgets.sql

CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id UUID, p_valor DECIMAL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;