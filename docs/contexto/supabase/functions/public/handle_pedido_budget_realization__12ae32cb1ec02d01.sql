CREATE OR REPLACE FUNCTION public.handle_pedido_budget_realization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_sol_id UUID;
    v_cost_center_id UUID;
    v_valor_solicitado NUMERIC;
    v_sol_created_at TIMESTAMPTZ;
    v_sol_status TEXT;
    v_old_gasto BOOLEAN := false;
    v_new_gasto BOOLEAN := false;
    v_devolve_comprometido NUMERIC := 0;
BEGIN
    SELECT s.id, s.cost_center_id, s.valor_estimado, s.created_at, s.status
      INTO v_sol_id, v_cost_center_id, v_valor_solicitado, v_sol_created_at, v_sol_status
      FROM public.solicitacoes s
     WHERE s.id = NEW.solicitacao_id;

    IF v_cost_center_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        v_old_gasto := COALESCE(OLD.status = ANY (ARRAY['aprovado', 'enviado', 'em_transito', 'entregue', 'parcial']), false);
    END IF;
    v_new_gasto := COALESCE(NEW.status = ANY (ARRAY['aprovado', 'enviado', 'em_transito', 'entregue', 'parcial']), false);

    -- Solicitacao encerrada sem compra: nao devolve comprometido (ela nao retem mais).
    IF v_sol_status IS NOT NULL AND v_sol_status NOT IN ('cancelada', 'rejeitada') THEN
        v_devolve_comprometido := COALESCE(v_valor_solicitado, 0);
    END IF;

    IF v_new_gasto AND NOT v_old_gasto THEN
        -- Entrou em gasto: o pedido assume o valor da solicitacao.
        UPDATE public.department_budgets
           SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(v_valor_solicitado, 0)),
               valor_utilizado = valor_utilizado + COALESCE(NEW.valor_total, 0),
               updated_at = now()
         WHERE cost_center_id = v_cost_center_id
           AND ano = EXTRACT(YEAR FROM v_sol_created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));

    ELSIF v_new_gasto AND v_old_gasto
          AND COALESCE(OLD.valor_total, 0) IS DISTINCT FROM COALESCE(NEW.valor_total, 0) THEN
        -- Continua em gasto e o valor do pedido mudou: ajusta so o utilizado pelo delta.
        UPDATE public.department_budgets
           SET valor_utilizado = GREATEST(0, valor_utilizado - COALESCE(OLD.valor_total, 0) + COALESCE(NEW.valor_total, 0)),
               updated_at = now()
         WHERE cost_center_id = v_cost_center_id
           AND ano = EXTRACT(YEAR FROM v_sol_created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));

    ELSIF v_old_gasto AND NOT v_new_gasto THEN
        -- Saiu do gasto (cancelado ou devolvido para pendente): devolve o valor.
        UPDATE public.department_budgets
           SET valor_utilizado = GREATEST(0, valor_utilizado - COALESCE(OLD.valor_total, 0)),
               valor_comprometido = valor_comprometido + v_devolve_comprometido,
               updated_at = now()
         WHERE cost_center_id = v_cost_center_id
           AND ano = EXTRACT(YEAR FROM v_sol_created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM v_sol_created_at));
    END IF;

    RETURN NEW;
END;
$function$
