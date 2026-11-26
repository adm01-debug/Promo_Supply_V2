-- ============================================
-- MIGRATION: fecha public.execute_read_query para anon/authenticated
-- Data: 2026-11-12
--
-- Causa: a migration 20261107150000 fez REVOKE ... FROM PUBLIC, mas o Supabase
-- concede EXECUTE explicitamente a anon e authenticated em funções do schema
-- public (default privileges). Resultado em produção: qualquer visitante com a
-- chave pública chamava esta função SECURITY DEFINER pela API, e a validação
-- aceita `EXPLAIN ANALYZE WITH d AS (INSERT/UPDATE/DELETE ...) SELECT ...`,
-- que executa a escrita como o dono da função.
--
-- Efeito: só service_role (usado por scripts/db-explain-analyze.ts) executa.
-- ============================================

REVOKE EXECUTE ON FUNCTION public.execute_read_query(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_read_query(text) TO service_role;
