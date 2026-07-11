
CREATE OR REPLACE FUNCTION public.generate_sequential_number(prefix text, table_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  result   TEXT;
  lock_key BIGINT;
BEGIN
  -- Sanitiza table_name: apenas identificadores válidos (letra/digito/_)
  IF table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'invalid table_name: %', table_name;
  END IF;
  IF prefix IS NULL OR length(prefix) = 0 OR length(prefix) > 16 THEN
    RAISE EXCEPTION 'invalid prefix';
  END IF;

  -- Advisory lock por tabela+prefix — serializa somente geradores concorrentes
  -- da MESMA sequência lógica. Liberado no COMMIT/ROLLBACK.
  lock_key := hashtextextended(table_name || '|' || prefix, 42);
  PERFORM pg_advisory_xact_lock(lock_key);

  EXECUTE format(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM %L) AS INTEGER)), 0) + 1 FROM public.%I',
    prefix || '-(\d+)', table_name
  ) INTO next_num;

  result := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_sequential_number(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_sequential_number(text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_sequential_number(text, text) IS
  'Gera "PREFIX-NNNNNN" sequencial. Usa pg_advisory_xact_lock por (table,prefix) para prevenir race condition. Liberado no fim da transação.';
