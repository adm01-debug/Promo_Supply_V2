CREATE OR REPLACE FUNCTION public.assign_numero_solicitacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.numero IS NULL OR btrim(NEW.numero) = '' THEN
    NEW.numero := public.generate_sequential_number('SOL', 'solicitacoes');
  END IF;
  RETURN NEW;
END;
$function$
