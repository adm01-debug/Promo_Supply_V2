CREATE OR REPLACE FUNCTION public.trg_pedido_entregue_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- O pagamento do pedido entregue é criado por auto_create_pagamento_on_delivery.
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'concluida', data_conclusao = COALESCE(data_conclusao, now()), updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status = 'em_andamento';
  END IF;
  RETURN NEW;
END;
$function$
