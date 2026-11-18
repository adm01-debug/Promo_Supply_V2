CREATE OR REPLACE FUNCTION public.tg_fornecedores_validate_cnpj()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.cnpj IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cnpj IS DISTINCT FROM OLD.cnpj)
     AND NOT public.is_valid_cnpj(NEW.cnpj) THEN
    RAISE EXCEPTION 'new row for relation "fornecedores" violates check constraint "fornecedores_cnpj_valid"'
      USING ERRCODE = 'check_violation',
            SCHEMA = 'public',
            TABLE = 'fornecedores',
            CONSTRAINT = 'fornecedores_cnpj_valid';
  END IF;
  RETURN NEW;
END;
$function$
