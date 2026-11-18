CREATE OR REPLACE FUNCTION public.update_budget_on_solicitacao_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_old_status TEXT := NULL;
    v_new_status TEXT := NEW.status;
    v_cost_center_id UUID := NEW.cost_center_id;
    v_old_cost_center_id UUID := NULL;
BEGIN
    -- Período = data da solicitação: linha anual (mes IS NULL) + linha do mês (se existir).
    -- Antes o filtro era só "ano", que acertava a anual e TODAS as mensais.

    -- Se for DELETE, precisamos remover o valor comprometido
    IF (TG_OP = 'DELETE') THEN
        IF (OLD.status != 'cancelada' AND OLD.status != 'finalizada' AND OLD.cost_center_id IS NOT NULL) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
            WHERE cost_center_id = OLD.cost_center_id
            AND ano = EXTRACT(YEAR FROM OLD.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
        END IF;
        RETURN OLD;
    END IF;

    -- Se for INSERT
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status != 'cancelada' AND NEW.status != 'finalizada' AND v_cost_center_id IS NOT NULL) THEN
            UPDATE public.department_budgets
            SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM NEW.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;

    -- Se for UPDATE
    IF (TG_OP = 'UPDATE') THEN
        v_old_status := OLD.status;
        v_old_cost_center_id := OLD.cost_center_id;

        -- Caso 1: Mudança de Centro de Custo
        IF (v_old_cost_center_id IS DISTINCT FROM v_cost_center_id) THEN
            -- Remove do antigo
            IF (v_old_status != 'cancelada' AND v_old_status != 'finalizada' AND v_old_cost_center_id IS NOT NULL) THEN
                UPDATE public.department_budgets
                SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
                WHERE cost_center_id = v_old_cost_center_id
                AND ano = EXTRACT(YEAR FROM OLD.created_at)
                AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
            END IF;
            -- Adiciona no novo
            IF (v_new_status != 'cancelada' AND v_new_status != 'finalizada' AND v_cost_center_id IS NOT NULL) THEN
                UPDATE public.department_budgets
                SET valor_comprometido = valor_comprometido + COALESCE(NEW.valor_estimado, 0)
                WHERE cost_center_id = v_cost_center_id
                AND ano = EXTRACT(YEAR FROM NEW.created_at)
                AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
            END IF;

        -- Caso 2: Mesma CC, mudou valor ou status
        ELSE
            IF (v_cost_center_id IS NOT NULL) THEN
                -- Mudou de Ativo para Finalizado (Converte Comprometido em Utilizado)
                IF (v_old_status != 'finalizada' AND v_new_status = 'finalizada') THEN
                    UPDATE public.department_budgets
                    SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0),
                        valor_utilizado = valor_utilizado + COALESCE(NEW.valor_estimado, 0)
                    WHERE cost_center_id = v_cost_center_id
                    AND ano = EXTRACT(YEAR FROM NEW.created_at)
                    AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));

                -- Mudou de Ativo para Cancelado (Remove Comprometido)
                ELSIF (v_old_status != 'cancelada' AND v_new_status = 'cancelada') THEN
                    UPDATE public.department_budgets
                    SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0)
                    WHERE cost_center_id = v_cost_center_id
                    AND ano = EXTRACT(YEAR FROM NEW.created_at)
                    AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));

                -- Mudou Valor (Apenas se ainda estiver ativo)
                ELSIF (v_new_status != 'cancelada' AND v_new_status != 'finalizada' AND OLD.valor_estimado IS DISTINCT FROM NEW.valor_estimado) THEN
                    UPDATE public.department_budgets
                    SET valor_comprometido = valor_comprometido - COALESCE(OLD.valor_estimado, 0) + COALESCE(NEW.valor_estimado, 0)
                    WHERE cost_center_id = v_cost_center_id
                    AND ano = EXTRACT(YEAR FROM NEW.created_at)
                    AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
