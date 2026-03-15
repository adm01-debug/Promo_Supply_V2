
-- AUTO-005: Auto-update supplier score when pedido is delivered
CREATE OR REPLACE FUNCTION public.auto_update_supplier_score_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fornecedor_id uuid;
  v_total_pedidos integer;
  v_entregas_no_prazo integer;
  v_new_score numeric;
BEGIN
  -- Only trigger when status changes TO 'entregue'
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
    v_fornecedor_id := NEW.fornecedor_id;
    
    -- Count total delivered pedidos for this supplier
    SELECT COUNT(*) INTO v_total_pedidos
    FROM public.pedidos
    WHERE fornecedor_id = v_fornecedor_id
    AND status = 'entregue';
    
    -- Count on-time deliveries
    SELECT COUNT(*) INTO v_entregas_no_prazo
    FROM public.pedidos
    WHERE fornecedor_id = v_fornecedor_id
    AND status = 'entregue'
    AND data_entrega IS NOT NULL
    AND data_previsao IS NOT NULL
    AND data_entrega <= data_previsao;
    
    -- Calculate score (1-5 scale): base 3.0 + up to 2.0 for on-time rate
    IF v_total_pedidos > 0 THEN
      v_new_score := 3.0 + (2.0 * v_entregas_no_prazo::numeric / v_total_pedidos);
      v_new_score := ROUND(LEAST(5.0, GREATEST(1.0, v_new_score)), 1);
    ELSE
      v_new_score := 3.0;
    END IF;
    
    UPDATE public.fornecedores
    SET avaliacao = v_new_score, updated_at = now()
    WHERE id = v_fornecedor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_update_supplier_score_on_delivery
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_supplier_score_on_delivery();
