CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_cotacao_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status IS DISTINCT FROM 'aprovada' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'aprovada', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status IN ('pendente', 'em_cotacao');
  END IF;
  RETURN NEW;
END;
$function$
