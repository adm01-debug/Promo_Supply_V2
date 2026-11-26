-- ============================================================================
-- Habilita os 8 crons de negocio a executarem _invoke_edge_function.
--
-- CAUSA (docs/contexto/supabase/cron-runs.md, jobs 113-120):
--   cron.schedule() grava como username do job o ROLE DA CONEXAO que executa a
--   migration. 20261121153000 foi aplicada por aplicar-migration-prod.yml
--   usando SUPABASE_DB_URL, cujo role e ci_snapshot (role de leitura do
--   paridade-banco.yml). Os jobs existem e disparam no horario certo, mas todo
--   disparo falha na primeira instrucao:
--
--     ## 113 - alert-dispatcher-1min
--     2026-11-21 17:41:00 | failed | ERROR: permission denied for function
--                                     _invoke_edge_function
--
--   20261112171300 revogou EXECUTE de PUBLIC/anon em _invoke_edge_function e
--   concedeu so a authenticated/service_role. Como o job roda com o role do
--   dono (ci_snapshot), nao ha EXECUTE.
--
-- POR QUE NAO TROCAR O OWNER DOS JOBS:
--   Testado em producao, os tres caminhos falham:
--   - cron.alter_job(username => ...) -> "XX000: must be superuser to alter
--     username"; o schema cron pertence a supabase_admin e postgres nao e
--     superuser neste projeto.
--   - cron.unschedule(nome) rodando como postgres -> "could not find valid entry
--     for job": so enxerga jobs do proprio role.
--   - cron.unschedule(jobid) -> "42501: permission denied for table job".
--   Ou seja, o owner de um job e definido na criacao e nao ha caminho suportado
--   para troca-lo. Recriar exigiria remover, e remover e' o que esta bloqueado.
--
-- DECISAO:
--   Conceder EXECUTE em public._invoke_edge_function(text) ao role que ja e'
--   dono dos jobs. Mudanca de UMA permissao, reversivel por REVOKE, sem tocar
--   em agenda, comando ou dados de negocio. A funcao e' SECURITY DEFINER e le a
--   chave service_role do Vault: quem tem EXECUTE consegue apenas NOMEAR uma
--   edge function, nunca obter a chave. ci_snapshot e' um role de CI cujo
--   detentor ja possui SUPABASE_ACCESS_TOKEN com escrita neste projeto, entao
--   nao ha escalada de privilegio nova.
--   Sem DDL de tabela. Idempotente.
-- ============================================================================

DO $do$
DECLARE
  v_dono text;
  v_ok boolean;
  v_jobs int;
BEGIN
  SELECT pg_get_userbyid(proowner) INTO v_dono
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = '_invoke_edge_function';

  IF v_dono IS NULL THEN
    RAISE EXCEPTION 'public._invoke_edge_function(text) nao existe em producao';
  END IF;

  IF current_user <> v_dono AND current_user NOT IN ('supabase_admin', 'postgres') THEN
    RAISE EXCEPTION 'sem permissao para conceder: dono da funcao e %, conexao e %',
      v_dono, current_user;
  END IF;

  GRANT EXECUTE ON FUNCTION public._invoke_edge_function(text) TO ci_snapshot;

  SELECT has_function_privilege('ci_snapshot',
           'public._invoke_edge_function(text)', 'EXECUTE') INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'GRANT nao teve efeito: ci_snapshot continua sem EXECUTE';
  END IF;

  SELECT count(*) INTO v_jobs FROM cron.job WHERE jobname IN (
    'alert-dispatcher-1min','approval-escalation-check','contract-expiry-check',
    'cotacao-followup-check','expiry-alerts-check','sla-alerts-check',
    'weekly-procurement-report','weekly-summary-report-job');

  IF v_jobs <> 8 THEN
    RAISE EXCEPTION 'esperados 8 jobs de negocio, encontrados %', v_jobs;
  END IF;

  RAISE NOTICE 'ok: ci_snapshot pode executar _invoke_edge_function; % jobs de negocio ativos', v_jobs;
END;
$do$;