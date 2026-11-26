-- Reversao de 20261126161500_secdef_revoga_authenticated_manutencao.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).
-- Devolve o acesso de authenticated as duas funcoes de manutencao, como estavam antes.

BEGIN;

GRANT EXECUTE ON FUNCTION public.maintain_monthly_partitions(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cron_heartbeat(text, text, text) TO authenticated;

COMMIT;
