-- ============================================================================
-- MIGRATION: refresh da MV de KPIs sai de 96x/dia para 1x/dia (etapa 222)
-- Data: 2026-11-27
--
-- PROBLEMA MEDIDO (cron.job + cron.job_run_details + health_scan_runs, 26/11)
--   O job pg_cron 'refresh-mv-dashboard-kpis' (jobid 19, dono postgres) chama
--   public.refresh_mv_dashboard_kpis() a cada 15 minutos: 96 execucoes/dia.
--   Cada execucao grava 1 linha em health_scan_runs (~35 mil linhas/ano) e
--   gasta ~180 ms reescrevendo uma MV que o painel executivo nao le.
--   Historico: ate 20261113180000 o refresh falhava em 100% das execucoes
--   (6064 falhas, 0 sucessos) por falta do indice unico da MV.
--
-- POR QUE A MV NAO VAI ALIMENTAR O PAINEL (caminho sugerido pelo plano --
-- RECUSADO depois de medir: nao e' equivalente e trocaria os numeros do painel)
--   1. Escopo: a MV agrupa por pedidos.tenant_id e get_dashboard_kpis filtra
--      por public.tenant_in_my_group(tenant_id). O painel executivo filtra por
--      pedidos.organization_id (src/hooks/useExecutiveDashboardData.ts:120).
--      As duas colunas coexistem em pedidos e nao sao a mesma coisa num tenant
--      com mais de uma organizacao.
--   2. Data: a MV agrupa por date_trunc('day', created_at); o painel por
--      data_emissao (fallback created_at). A RPC oficial do dashboard,
--      get_compras_dashboard_metrics (20261112222833:137), agrupa por
--      data_emissao -- logo data_emissao e' a data canonica.
--   3. Frescor: o painel e' tempo real (staleTime 30s); a MV e' batch --
--      liga-lo deixaria a tendencia mensal ate 1 ciclo atras. E o painel
--      continua precisando das linhas cruas de pedidos para cycle time,
--      pedidos atrasados, maverick spend, top fornecedores e performance por
--      comprador: o ganho seria zero.
--
-- O QUE ESTA MIGRATION FAZ
--   Apenas troca o schedule do job para 1x/dia, 04:20 UTC = 01:20 BRT.
--   NADA e' removido: a materialized view mv_dashboard_kpis, a funcao
--   public.refresh_mv_dashboard_kpis() e a RPC public.get_dashboard_kpis(date,date)
--   com os GRANTs para authenticated continuam existindo e funcionando.
--
-- DONO DO JOB x CANAL psql (medido no probe de 26/11)
--   O canal aplicar-migration-prod.yml roda o psql como ci_snapshot, e o
--   pg_cron restringe unschedule(job_name)/alter_job ao DONO do job: executar
--   como ci_snapshot devolve "could not find valid entry for job". O job 19
--   pertence a postgres (cron.job tem 28 jobs: 19 dele, 9 de ci_snapshot).
--   Por isso o bloco abaixo emite o aviso de contrato 'exige conexao como
--   postgres', que faz o canal reaplicar este mesmo arquivo pelo Management
--   API (conecta como postgres). Sem esse guard o psql aborta por um motivo
--   que nao e' privilegio e nada e' aplicado -- foi o que aconteceu na
--   primeira tentativa (run 45784247927, linha 53).
--
-- Idempotente: roda igual 1x ou Nx; se o job nao existir (restore novo), cria.
-- Reversao: docs/qa/reversao/20261127193000_perf08_mv_dashboard_kpis_refresh_diario_revert.sql
-- ============================================================================

SET LOCAL lock_timeout = '10s';

DO $$
DECLARE
  v_id       bigint;
  v_dono     text;
  v_schedule text := '20 4 * * *';
BEGIN
  SELECT jobid, username INTO v_id, v_dono
    FROM cron.job WHERE jobname = 'refresh-mv-dashboard-kpis';

  -- (a) job inexistente (restore/ambiente novo): cria ja' com o schedule novo
  IF v_id IS NULL THEN
    PERFORM cron.schedule(
      'refresh-mv-dashboard-kpis',
      v_schedule,
      'SELECT public.refresh_mv_dashboard_kpis();'
    );
    RETURN;
  END IF;

  -- (b) job de outro usuario: o pg_cron nao deixa alterar. Aviso de contrato
  --     do canal (aplicar-migration-prod.yml) para reaplicar como postgres.
  IF v_dono IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION
      'alterar o job % (dono %) exige conexao como postgres',
      'refresh-mv-dashboard-kpis', v_dono;
  END IF;

  -- (c) job proprio: troca SO o schedule; comando, dono e banco ficam iguais
  PERFORM cron.alter_job(v_id, v_schedule, NULL, NULL, NULL, NULL);
END $$;