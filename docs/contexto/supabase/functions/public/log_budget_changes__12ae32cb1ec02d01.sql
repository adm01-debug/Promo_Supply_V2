CREATE OR REPLACE FUNCTION public.log_budget_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.budget_audit_logs (budget_id, user_id, action, old_data)
        VALUES (OLD.id, auth.uid(), 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.budget_audit_logs (budget_id, user_id, action, old_data, new_data)
        VALUES (NEW.id, auth.uid(), 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.budget_audit_logs (budget_id, user_id, action, new_data)
        VALUES (NEW.id, auth.uid(), 'INSERT', row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$
