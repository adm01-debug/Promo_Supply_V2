-- Reversao da etapa 150 (SEG-04). Nao aplicada: restaura as duas funcoes de SQL arbitrario
-- com o corpo original e derruba o substituto.
BEGIN;

CREATE OR REPLACE FUNCTION public.execute_read_query(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_plan jsonb;
  v_body text;
BEGIN
  v_body := upper(btrim(p_sql));
  IF v_body !~ '^EXPLAIN' THEN
    RAISE EXCEPTION 'Somente EXPLAIN e permitido';
  END IF;
  v_body := regexp_replace(v_body, '^EXPLAIN(\s*\([^)]*\)|\s+(ANALYZE|VERBOSE|BUFFERS|COSTS|SETTINGS|WAL|TIMING|SUMMARY))*\s*', '');
  v_body := regexp_replace(v_body, '^\s*\([^)]*\)', '');
  v_body := btrim(v_body);
  IF v_body !~ '^(SELECT|WITH)(\s|$)' THEN
    RAISE EXCEPTION 'EXPLAIN somente para SELECT/WITH (leitura)';
  END IF;
  EXECUTE p_sql INTO v_plan;
  RETURN v_plan;
END;
$$;
REVOKE ALL ON FUNCTION public.execute_read_query(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_read_query(text) TO service_role;

CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
  RETURN coalesce(result, '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

DROP FUNCTION IF EXISTS public.audit_rls_policies();

COMMIT;