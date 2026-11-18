CREATE OR REPLACE FUNCTION public.trigger_update_saldo_on_pagamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalculate_saldo_comprometido(COALESCE(NEW.fornecedor_id, OLD.fornecedor_id));
  RETURN NEW;
END;
$function$
