CREATE OR REPLACE FUNCTION public.auto_create_pagamento_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_numero TEXT;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue'
     AND NEW.fornecedor_id IS NOT NULL AND COALESCE(NEW.valor_total, 0) > 0
     AND NOT EXISTS (SELECT 1 FROM public.pagamentos WHERE pedido_id = NEW.id) THEN
    -- mesmo gerador (com advisory lock) que o front usa em usePagamentos.createPagamento
    v_numero := public.generate_sequential_number('PAG', 'pagamentos');

    INSERT INTO public.pagamentos (
      numero, pedido_id, fornecedor_id, valor, data_vencimento, status,
      organization_id, tenant_id
    ) VALUES (
      v_numero,
      NEW.id,
      NEW.fornecedor_id,
      NEW.valor_total,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'pendente',
      NEW.organization_id,
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END;
$function$
