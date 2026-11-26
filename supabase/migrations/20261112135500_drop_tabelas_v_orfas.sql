-- ============================================
-- MIGRATION: remove 6 tabelas órfãs criadas por engano
-- Data: 2026-11-12
--
-- Causa: o corpo da função de dashboard em
-- 20260519114020_1546616d-be8d-4565-92a6-fb1303688550.sql usa variáveis
-- v_kpis, v_pipeline, v_trends, v_top_categories, v_urgent_items e
-- v_cotacao_status com `SELECT ... INTO v_x`. Executado fora da função, esse
-- comando CRIA uma tabela com o nome da variável. As 6 tabelas existem em
-- produção com uma única coluna (jsonb_build_object/jsonb_agg), 0–1 linha
-- (snapshot antigo), RLS ligado e nenhuma policy, nenhuma dependência e nenhum
-- uso em src/ ou supabase/functions/.
-- ============================================

DROP TABLE IF EXISTS public.v_kpis;
DROP TABLE IF EXISTS public.v_pipeline;
DROP TABLE IF EXISTS public.v_trends;
DROP TABLE IF EXISTS public.v_top_categories;
DROP TABLE IF EXISTS public.v_urgent_items;
DROP TABLE IF EXISTS public.v_cotacao_status;
