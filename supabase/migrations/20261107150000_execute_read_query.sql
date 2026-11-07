-- ============================================
-- MIGRATION: RPC execute_read_query
-- Data: 2026-11-07
-- Descrição: Executa EXPLAIN (ANALYZE, BUFFERS) em queries de leitura
-- para o script scripts/db-explain-analyze.ts (B-03).
--
-- Segurança: função SECURITY DEFINER com search_path fixo e
-- revogação de EXECUTE para o público (só service_role executa).
-- ============================================

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
$$;

-- Só service_role (e dono) executa; público não.
REVOKE ALL ON FUNCTION public.execute_read_query(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_read_query(text) TO service_role;

COMMENT ON FUNCTION public.execute_read_query(text) IS
  'Executa EXPLAIN (ANALYZE, BUFFERS) em queries de leitura para o benchmark B-03. Restrito a service_role.';
