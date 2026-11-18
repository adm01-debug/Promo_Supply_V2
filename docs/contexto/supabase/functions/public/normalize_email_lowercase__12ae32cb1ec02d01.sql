CREATE OR REPLACE FUNCTION public.normalize_email_lowercase()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    NEW.email := lower(btrim(NEW.email));
    IF NEW.phone IS NOT NULL THEN
      NEW.phone := btrim(NEW.phone);
    END IF;
  ELSIF TG_TABLE_NAME = 'fornecedores' THEN
    IF NEW.email IS NOT NULL THEN NEW.email := lower(btrim(NEW.email)); END IF;
  ELSE
    NEW.email := lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$function$
