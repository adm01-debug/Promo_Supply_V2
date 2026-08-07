
-- Auto-transition: When cotação is approved, update solicitação to em_andamento
CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_cotacao_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status != 'aprovada' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'em_andamento', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status IN ('pendente', 'em_cotacao', 'aprovada');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_transition_sol_on_cotacao
  AFTER UPDATE OF status ON public.cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_solicitacao_on_cotacao_approval();

-- Auto-transition: When pedido is entregue, update solicitação to concluída
CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_pedido_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'concluida', updated_at = now()
    WHERE id = NEW.solicitacao_id
    AND status IN ('em_andamento', 'aprovada');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_transition_sol_on_pedido_delivery
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_solicitacao_on_pedido_delivery();

-- Auto-create pagamento when pedido is entregue
CREATE OR REPLACE FUNCTION public.auto_create_pagamento_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_numero TEXT;
  v_existing INT;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' THEN
    -- Check if pagamento already exists for this pedido
    SELECT COUNT(*) INTO v_existing FROM public.pagamentos WHERE pedido_id = NEW.id;
    IF v_existing = 0 THEN
      -- Generate numero
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'PAG-(\d+)') AS INTEGER)), 0) + 1
      INTO v_existing FROM public.pagamentos;
      v_numero := 'PAG-' || LPAD(v_existing::TEXT, 6, '0');

      INSERT INTO public.pagamentos (
        numero, pedido_id, fornecedor_id, valor, data_vencimento, status
      ) VALUES (
        v_numero,
        NEW.id,
        NEW.fornecedor_id,
        NEW.valor_total,
        (CURRENT_DATE + INTERVAL '30 days')::date,
        'pendente'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_pagamento_on_delivery
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_pagamento_on_delivery();
