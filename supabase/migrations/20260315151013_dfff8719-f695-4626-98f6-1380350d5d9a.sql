
-- GAP-008: Add credit limit control to fornecedores
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS limite_credito numeric DEFAULT NULL;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS saldo_comprometido numeric DEFAULT 0;

-- Function to recalculate committed balance for a supplier
CREATE OR REPLACE FUNCTION public.recalculate_saldo_comprometido(p_fornecedor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_saldo numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN p.status IN ('pendente', 'aprovado', 'enviado', 'em_transito') THEN p.valor_total
      ELSE 0
    END
  ), 0) INTO v_saldo
  FROM public.pedidos p
  WHERE p.fornecedor_id = p_fornecedor_id;

  -- Add pending payments
  v_saldo := v_saldo + COALESCE((
    SELECT SUM(pg.valor - COALESCE(pg.valor_pago, 0))
    FROM public.pagamentos pg
    WHERE pg.fornecedor_id = p_fornecedor_id
    AND pg.status IN ('pendente', 'aprovado', 'agendado', 'atrasado')
  ), 0);

  UPDATE public.fornecedores
  SET saldo_comprometido = v_saldo, updated_at = now()
  WHERE id = p_fornecedor_id;

  RETURN v_saldo;
END;
$$;

-- Trigger to update saldo when pedido changes
CREATE OR REPLACE FUNCTION public.trigger_update_saldo_on_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recalculate_saldo_comprometido(COALESCE(NEW.fornecedor_id, OLD.fornecedor_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_saldo_on_pedido_change
  AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_saldo_on_pedido();

-- Trigger to update saldo when pagamento changes
CREATE OR REPLACE FUNCTION public.trigger_update_saldo_on_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recalculate_saldo_comprometido(COALESCE(NEW.fornecedor_id, OLD.fornecedor_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_saldo_on_pagamento_change
  AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_saldo_on_pagamento();
