CREATE OR REPLACE FUNCTION public.trg_cotacao_approved_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selecionada = true AND (OLD.selecionada IS DISTINCT FROM NEW.selecionada) AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes s
    SET status = 'aprovada', updated_at = now()
    WHERE s.id = NEW.solicitacao_id
      AND s.status IN ('pendente', 'em_cotacao')
      AND NOT EXISTS (
        SELECT 1
        FROM public.approval_workflows w
        WHERE w.solicitacao_id = s.id
          AND w.status <> 'approved'
      );
  END IF;
  RETURN NEW;
END;
$function$
