CREATE OR REPLACE FUNCTION public.is_valid_cnpj(_cnpj text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  digits text;
  d int[];
  sum1 int := 0; sum2 int := 0;
  d1 int; d2 int;
  weights1 int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  weights2 int[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  i int;
BEGIN
  IF _cnpj IS NULL THEN RETURN false; END IF;
  digits := regexp_replace(_cnpj, '\D', '', 'g');
  IF length(digits) <> 14 THEN RETURN false; END IF;
  -- rejeita sequências repetidas (00000000000000, 11111111111111, ...)
  IF digits ~ '^(\d)\1{13}$' THEN RETURN false; END IF;

  d := ARRAY(SELECT (substring(digits FROM g FOR 1))::int FROM generate_series(1,14) g);
  FOR i IN 1..12 LOOP sum1 := sum1 + d[i]*weights1[i]; END LOOP;
  d1 := 11 - (sum1 % 11);
  IF d1 >= 10 THEN d1 := 0; END IF;
  IF d1 <> d[13] THEN RETURN false; END IF;

  FOR i IN 1..13 LOOP sum2 := sum2 + d[i]*weights2[i]; END LOOP;
  d2 := 11 - (sum2 % 11);
  IF d2 >= 10 THEN d2 := 0; END IF;
  RETURN d2 = d[14];
END;
$function$
