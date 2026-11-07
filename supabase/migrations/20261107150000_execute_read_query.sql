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
BEGIN
  -- Validação: só permite SELECT (leitura), nunca DML/DDL.
  IF upper(btrim(p_sql)) !~ '^EXPLAIN' THEN
    RAISE EXCEPTION 'Somente EXPLAIN é permitido';
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
