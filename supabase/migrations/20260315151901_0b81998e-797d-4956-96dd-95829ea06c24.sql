
-- AUTO-001: Auto-approve solicitações under R$1000
CREATE OR REPLACE FUNCTION public.auto_approve_low_value_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-approve if valor_estimado < 1000 and status is pendente
  IF NEW.status = 'pendente' AND NEW.valor_estimado IS NOT NULL AND NEW.valor_estimado < 1000 THEN
    NEW.status := 'aprovada';
    
    -- Create notification for the requester
    INSERT INTO public.notifications (user_id, title, message, type, priority)
    SELECT NEW.solicitante_id, 
           'Solicitação auto-aprovada',
           'A solicitação #' || NEW.numero || ' foi aprovada automaticamente (valor < R$ 1.000)',
           'approval',
           'normal'
    WHERE NEW.solicitante_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_approve_low_value
  BEFORE INSERT ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_low_value_solicitacao();
