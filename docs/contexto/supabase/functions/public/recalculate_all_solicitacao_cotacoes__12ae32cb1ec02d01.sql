CREATE OR REPLACE FUNCTION public.recalculate_all_solicitacao_cotacoes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Evita recursão infinita
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;

    UPDATE public.cotacoes
    SET updated_at = now()
    WHERE solicitacao_id = COALESCE(NEW.solicitacao_id, OLD.solicitacao_id)
    AND id != COALESCE(NEW.id, OLD.id);
    
    RETURN NULL;
END;
$function$
