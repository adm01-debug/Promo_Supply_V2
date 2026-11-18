CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_pedido_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'em_andamento', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status = 'aprovada';
  END IF;
  RETURN NEW;
END;
$function$
