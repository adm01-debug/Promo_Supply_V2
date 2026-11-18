CREATE OR REPLACE FUNCTION public.handle_pedido_budget_realization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_solicitacao_id UUID;
    v_cost_center_id UUID;
    v_valor_solicitado NUMERIC;
    v_sol_created_at TIMESTAMPTZ;
BEGIN
    -- Obter a solicitação vinculada para saber o centro de custo e o período do orçamento
    SELECT id, cost_center_id, valor_estimado, created_at
    INTO v_solicitacao_id, v_cost_center_id, v_valor_solicitado, v_sol_created_at
    FROM public.solicitacoes
    WHERE id = NEW.solicitacao_id;

    IF v_cost_center_id IS NOT NULL THEN
        -- Se o pedido foi aprovado ou concluído
        IF (NEW.status IN ('aprovado', 'concluido', 'recebido') AND (OLD.status IS NULL OR OLD.status NOT IN ('aprovado', 'concluido', 'recebido'))) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido - COALESCE(v_valor_solicitado, 0),
                valor_utilizado = valor_utilizado + COALESCE(NEW.valor_total, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM v_sol_created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));

        -- Se o pedido foi cancelado e já tinha impactado o orçamento como utilizado
        ELSIF (NEW.status = 'cancelado' AND OLD.status IN ('aprovado', 'concluido', 'recebido')) THEN
            UPDATE public.department_budgets
            SET valor_utilizado = valor_utilizado - COALESCE(OLD.valor_total, 0),
                valor_comprometido = valor_comprometido + COALESCE(v_valor_solicitado, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM v_sol_created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
