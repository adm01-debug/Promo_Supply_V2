CREATE OR REPLACE FUNCTION public.audit_pagamento_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.financial_audit_logs (
        entity_type,
        entity_id,
        action,
        old_data,
        new_data,
        user_id
    ) VALUES (
        'pagamento',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid()
    );
    RETURN NEW;
END;
$function$
