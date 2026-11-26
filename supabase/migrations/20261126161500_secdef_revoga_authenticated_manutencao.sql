-- FN-11 / etapa 152: funcoes SECURITY DEFINER de manutencao/infra executaveis por
-- qualquer usuario logado.
--
-- Causa: a migration 20261112171300_secdef_revoga_anon.sql classificou as funcoes
-- SECURITY DEFINER do schema public e revogou PUBLIC/anon/authenticated das que sao de
-- uso interno, mas duas ficaram de fora da lista e continuaram executaveis por
-- authenticated pela API REST (/rest/v1/rpc/<nome>):
--   * public.maintain_monthly_partitions(text,int,int) - cria e APAGA particoes com
--     EXECUTE format('CREATE TABLE ... PARTITION OF public.%I') e
--     EXECUTE format('DROP TABLE IF EXISTS public.%I', v_partition.part_name). O corte de
--     retencao vem do parametro do chamador: p_retain_months := 0 joga o cutoff para o
--     mes corrente e o laco de DROP passa a mirar todas as particoes;
--   * public.upsert_cron_heartbeat(text,text,text) - faz upsert livre em
--     public.cron_heartbeats, a tabela que o painel de saude dos jobs usa como fonte.
--     Um usuario qualquer pode forjar last_status = 'success' de qualquer job.
--
-- As duas so sao chamadas por caminho de servidor com service_role:
-- supabase/functions/maintain-partitions/index.ts e supabase/functions/_shared/cronHealth.ts.
-- Nenhum caminho do navegador as usa (grep em src/ = 0 ocorrencias), e o teste de
-- integracao src/tests/integration/supabase-db.test.ts usa SUPABASE_SERVICE_ROLE_KEY.
--
-- Correcao: revogar EXECUTE de PUBLIC, anon e authenticated e manter service_role,
-- exatamente o padrao aplicado naquela migration. O bloco inicial confere as duas
-- assinaturas com to_regprocedure antes de qualquer REVOKE.
--
-- Fora desta migration (rastreado em outras etapas):
--   * find_approval_rule ja recebeu escopo de tenant na etapa 116
--     (20261125150000_find_approval_rule_escopo_tenant.sql, PR #386);
--   * check_budget_availability fica com a etapa 137, que trata a mesma funcao e a
--     origem das colunas de cost_centers que ela le.
--
-- Reversao: supabase/rollbacks/20261126161500_revert_secdef_revoga_authenticated_manutencao.sql

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.maintain_monthly_partitions(text,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'assinatura ausente: public.maintain_monthly_partitions(text,integer,integer)';
  END IF;
  IF to_regprocedure('public.upsert_cron_heartbeat(text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'assinatura ausente: public.upsert_cron_heartbeat(text,text,text)';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.maintain_monthly_partitions(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.maintain_monthly_partitions(text, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.upsert_cron_heartbeat(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_cron_heartbeat(text, text, text) TO service_role;

COMMIT;
