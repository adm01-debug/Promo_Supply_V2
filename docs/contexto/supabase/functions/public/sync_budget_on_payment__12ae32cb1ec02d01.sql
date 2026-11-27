CREATE OR REPLACE FUNCTION public.sync_budget_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.cost_center_id IS NULL OR NEW.pedido_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status <> 'pago') THEN
        UPDATE public.department_budgets
           SET valor_utilizado = valor_utilizado + COALESCE(NEW.valor, 0),
               updated_at = now()
         WHERE cost_center_id = NEW.cost_center_id
           AND ano = EXTRACT(YEAR FROM NEW.created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));

    ELSIF OLD.status = 'pago' AND NEW.status <> 'pago' THEN
        UPDATE public.department_budgets
           SET valor_utilizado = GREATEST(0, valor_utilizado - COALESCE(OLD.valor, 0)),
               updated_at = now()
         WHERE cost_center_id = NEW.cost_center_id
           AND ano = EXTRACT(YEAR FROM OLD.created_at)
           AND (mes IS NULL OR mes = EXTRACT(MONTH FROM OLD.created_at));
    END IF;

    RETURN NEW;
END;
$function$
