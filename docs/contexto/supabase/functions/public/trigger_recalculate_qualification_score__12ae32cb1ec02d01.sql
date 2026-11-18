CREATE OR REPLACE FUNCTION public.trigger_recalculate_qualification_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.calculate_supplier_qualification_score(
    COALESCE(NEW.fornecedor_id, OLD.fornecedor_id)
  );
  RETURN NEW;
END;
$function$
