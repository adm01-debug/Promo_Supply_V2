CREATE OR REPLACE FUNCTION public.tg_normalize_phone()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'fornecedores' THEN
    NEW.telefone := public.normalize_phone_br(NEW.telefone);
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    NEW.phone := public.normalize_phone_br(NEW.phone);
  END IF;
  RETURN NEW;
END;
$function$
