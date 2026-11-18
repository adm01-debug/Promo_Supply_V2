CREATE OR REPLACE FUNCTION public.normalize_cnpj_digits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cnpj IS NOT NULL THEN
    NEW.cnpj := regexp_replace(NEW.cnpj, '\D', '', 'g');
    IF NEW.cnpj = '' THEN NEW.cnpj := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$function$
