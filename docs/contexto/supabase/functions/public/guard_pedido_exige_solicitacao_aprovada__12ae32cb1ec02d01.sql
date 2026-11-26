CREATE OR REPLACE FUNCTION public.guard_pedido_exige_solicitacao_aprovada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  IF NEW.solicitacao_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  SELECT s.status INTO v_status
  FROM public.solicitacoes s
  WHERE s.id = NEW.solicitacao_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Solicitacao % nao encontrada para a ordem de compra', NEW.solicitacao_id
      USING ERRCODE = '23503';
  END IF;

  IF v_status NOT IN ('aprovada', 'em_andamento') THEN
    RAISE EXCEPTION 'Ordem de compra exige solicitacao aprovada (solicitacao % esta em %)',
      NEW.solicitacao_id, v_status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
