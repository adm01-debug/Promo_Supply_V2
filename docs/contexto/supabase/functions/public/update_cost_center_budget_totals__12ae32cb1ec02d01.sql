CREATE OR REPLACE FUNCTION public.update_cost_center_budget_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'commitment') THEN
            UPDATE public.cost_centers 
            SET committed_amount = committed_amount + NEW.amount
            WHERE id = NEW.cost_center_id;
        ELSIF (NEW.type = 'actual') THEN
            UPDATE public.cost_centers 
            SET used_amount = used_amount + NEW.amount,
                committed_amount = GREATEST(0, committed_amount - NEW.amount)
            WHERE id = NEW.cost_center_id;
        ELSIF (NEW.type = 'release') THEN
            UPDATE public.cost_centers 
            SET committed_amount = GREATEST(0, committed_amount - NEW.amount)
            WHERE id = NEW.cost_center_id;
        ELSIF (NEW.type = 'adjustment') THEN
            UPDATE public.cost_centers 
            SET total_budget = total_budget + NEW.amount
            WHERE id = NEW.cost_center_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
