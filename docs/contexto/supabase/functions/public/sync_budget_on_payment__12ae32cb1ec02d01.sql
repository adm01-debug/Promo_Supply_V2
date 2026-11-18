CREATE OR REPLACE FUNCTION public.sync_budget_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cost_center_id UUID;
BEGIN
    -- Determinar o centro de custo (do pagamento ou da solicitação vinculada ao pedido)
    v_cost_center_id := COALESCE(
        NEW.cost_center_id,
        (SELECT s.cost_center_id
           FROM public.pedidos pe
           JOIN public.solicitacoes s ON s.id = pe.solicitacao_id
          WHERE pe.id = NEW.pedido_id
          LIMIT 1)
    );

    IF v_cost_center_id IS NOT NULL THEN
        -- Se o status mudou para 'pago'
        IF (NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago')) THEN
            UPDATE public.department_budgets
            SET
                valor_utilizado = valor_utilizado + NEW.valor,
                valor_comprometido = GREATEST(0, valor_comprometido - NEW.valor)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM NEW.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
