CREATE OR REPLACE FUNCTION public.update_licitacao_best_bid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.licitacoes 
    SET current_best_bid = NEW.valor_lance
    WHERE id = NEW.licitacao_id AND (current_best_bid IS NULL OR NEW.valor_lance < current_best_bid);
    RETURN NEW;
END;
$function$
