CREATE OR REPLACE FUNCTION public.recalculate_saldo_comprometido(p_fornecedor_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
