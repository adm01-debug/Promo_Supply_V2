CREATE OR REPLACE FUNCTION public.execute_read_query(p_sql text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_plan jsonb;
  v_body text;
BEGIN
  -- Validação: só permite EXPLAIN de leitura (SELECT/WITH), nunca DML/DDL.
  v_body := upper(btrim(p_sql));
  IF v_body !~ '^EXPLAIN' THEN
    RAISE EXCEPTION 'Somente EXPLAIN é permitido';
  END IF;

  -- Remove o prefixo EXPLAIN e as opções, com ou sem parênteses
  -- (ex.: (ANALYZE, BUFFERS, FORMAT JSON) ou ANALYZE solto).
  -- Nota: \b (word boundary) não funciona no regex do Postgres; usar (\s|$).
  v_body := regexp_replace(v_body, '^EXPLAIN(\s*\([^)]*\)|\s+(ANALYZE|VERBOSE|BUFFERS|COSTS|SETTINGS|WAL|TIMING|SUMMARY))*\s*', '');
  v_body := regexp_replace(v_body, '^\s*\([^)]*\)', '');
  v_body := btrim(v_body);

  -- O comando após EXPLAIN deve ser somente leitura (SELECT ou WITH).
  -- Bloqueia EXPLAIN ANALYZE DELETE/UPDATE/INSERT/DDL (que executariam o DML).
  IF v_body !~ '^(SELECT|WITH)(\s|$)' THEN
    RAISE EXCEPTION 'EXPLAIN somente para SELECT/WITH (leitura)';
  END IF;

  EXECUTE p_sql INTO v_plan;
  RETURN v_plan;
END;
$function$
