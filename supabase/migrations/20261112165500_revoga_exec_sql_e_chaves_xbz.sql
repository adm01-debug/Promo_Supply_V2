-- ============================================
-- MIGRATION: fecha exec_sql e funções da chave XBZ para anon/authenticated
-- Data: 2026-11-12
--
-- Causa: public.exec_sql(text) é SECURITY DEFINER (dono postgres) e executa SQL
-- arbitrário; o default privilege do schema public dá EXECUTE a anon e
-- authenticated. Prova em produção (transação revertida, papel anon):
-- jsonb_array_length(exec_sql('select id from auth.users')) = 12.
-- xbz_cron_key_get() devolve o segredo 'xbz_cron_key' do Vault em texto puro e
-- também era executável por anon. Únicos chamadores usam service_role:
-- supabase/functions/run-audit/index.ts:22, run-audit/rls_test.ts:27/43,
-- xbz-sync-pedidos/index.ts:188.
--
-- Complementa 20261112135000: mv_dashboard_kpis (sem RLS possível, sem leitor
-- no app) sai de authenticated; as 2 views perdem os grants de escrita/MAINTAIN
-- que ainda restavam para anon.
-- ============================================

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

REVOKE ALL ON FUNCTION public.xbz_cron_key_get() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.xbz_cron_key_get() TO service_role;

REVOKE ALL ON FUNCTION public.verify_xbz_cron_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_xbz_cron_key(text) TO service_role;

REVOKE ALL ON public.mv_dashboard_kpis FROM anon, authenticated;
REVOKE ALL ON public.supplier_compliance_summary FROM anon;
REVOKE ALL ON public.v_system_health_overview FROM anon;
