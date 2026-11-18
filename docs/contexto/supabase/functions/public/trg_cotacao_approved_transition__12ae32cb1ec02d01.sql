CREATE OR REPLACE FUNCTION public.trg_cotacao_approved_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selecionada = true AND (OLD.selecionada IS DISTINCT FROM NEW.selecionada) AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'aprovada', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status IN ('pendente', 'em_cotacao');
  END IF;
  RETURN NEW;
END;
$function$
