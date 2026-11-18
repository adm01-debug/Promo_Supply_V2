CREATE OR REPLACE FUNCTION public.normalize_phone_br(_raw text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  digits text;
BEGIN
  IF _raw IS NULL OR btrim(_raw) = '' THEN
    RETURN NULL;
  END IF;

  -- Extrai apenas dígitos
  digits := regexp_replace(_raw, '\D', '', 'g');

  IF digits = '' THEN
    RETURN NULL;
  END IF;

  -- Já tem código de país (12-15 dígitos) → assume internacional
  IF length(digits) BETWEEN 12 AND 15 THEN
    RETURN '+' || digits;
  END IF;

  -- 10 dígitos (DD + fixo 8) ou 11 dígitos (DD + celular 9) → prefixa Brasil
  IF length(digits) IN (10, 11) THEN
    RETURN '+55' || digits;
  END IF;

  -- Formatos inválidos: retorna null para não corromper
  RETURN NULL;
END;
$function$
