CREATE OR REPLACE FUNCTION public.update_budget_on_solicitacao_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_old_retem BOOLEAN := false;
    v_new_retem BOOLEAN := false;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        IF public.solicitacao_retem_orcamento(OLD.id, OLD.status) AND OLD.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(OLD.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = OLD.cost_center_id
               AND ano = EXTRACT(YEAR FROM OLD.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
        END IF;
        RETURN OLD;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        IF public.solicitacao_retem_orcamento(NEW.id, NEW.status) AND NEW.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE
    v_old_retem := public.solicitacao_retem_orcamento(OLD.id, OLD.status);
    v_new_retem := public.solicitacao_retem_orcamento(NEW.id, NEW.status);

    IF (OLD.cost_center_id IS DISTINCT FROM NEW.cost_center_id) THEN
        -- Mudou de centro de custo: devolve no antigo e retira no novo.
        IF v_old_retem AND OLD.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(OLD.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = OLD.cost_center_id
               AND ano = EXTRACT(YEAR FROM OLD.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
        END IF;
        IF v_new_retem AND NEW.cost_center_id IS NOT NULL THEN
            UPDATE public.department_budgets
               SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    ELSIF (NEW.cost_center_id IS NOT NULL) THEN
        IF v_old_retem AND NOT v_new_retem THEN
            -- Encerrou (concluida, rejeitada, cancelada) ou um pedido assumiu o valor.
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0, valor_comprometido - COALESCE(OLD.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        ELSIF NOT v_old_retem AND v_new_retem THEN
            -- Reaberta (ex.: rejeitada -> pendente): volta a comprometer.
            UPDATE public.department_budgets
               SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        ELSIF v_old_retem AND v_new_retem
              AND COALESCE(OLD.valor_estimado, 0) IS DISTINCT FROM COALESCE(NEW.valor_estimado, 0) THEN
            -- Ainda retem e o valor mudou: ajusta pelo delta.
            UPDATE public.department_budgets
               SET valor_comprometido = GREATEST(0,
                       valor_comprometido - COALESCE(OLD.valor_estimado, 0) + COALESCE(NEW.valor_estimado, 0)),
                   updated_at = now()
             WHERE cost_center_id = NEW.cost_center_id
               AND ano = EXTRACT(YEAR FROM NEW.created_at)
               AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
