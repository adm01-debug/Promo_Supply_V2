-- Sonda de fumaca das edges de negocio ligadas por 20261121153000_religa_crons_negocio_vault.sql.
--
-- ORIGEM: trabalho parcial do agente que abriu claude/chore-smoke-edges-negocio-261121-1526
-- (commit 7aa6f4d) e nao abriu PR. O corpo abaixo e o DO block dele, preservado sem
-- alteracao. Aquele arquivo vivia em supabase/migrations/ com versao 20261121153000, que
-- ja pertence a 20261121153000_religa_crons_negocio_vault.sql -> foi movido para ca,
-- fora de migrations/, para NUNCA ser aplicado automaticamente: um RAISE EXCEPTION aqui
-- derrubaria o apply de prod e a reconstrucao do snapshot.
--
-- PARA QUE SERVE: a migration religa os 9 crons, mas nao prova que as edges respondem ao
-- guard verifyCronSecret (service_role) - as antigas rodavam 401 sem efeito. Esta sonda
-- invoca pela MESMA funcao que os crons usam (public._invoke_edge_function) e falha alto
-- se alguma nao for enfileirada.
--
-- COMO RODAR (uma vez, contra producao):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/ci/sonda-edges-negocio.sql
-- A prova de execucao real e o heartbeat: SELECT * FROM public.cron_heartbeats
--   WHERE edge_function IN (...) ORDER BY executado_em DESC;
--
-- Nao cria DDL e nao altera dados de negocio: apenas enfileira o trabalho que o cron ja
-- faria no proximo horario agendado.

DO $do$
DECLARE
  v_nome text;
  v_id bigint;
  v_falhas int := 0;
BEGIN
  FOR v_nome IN
    SELECT unnest(ARRAY[
      'check-expiry-alerts',
      'check-cotacao-followup',
      'weekly-report',
      'weekly-summary-report',
      'maintain-partitions'
    ])
  LOOP
    SELECT public._invoke_edge_function(v_nome) INTO v_id;
    IF v_id IS NULL THEN
      v_falhas := v_falhas + 1;
      RAISE NOTICE 'edge % NAO invocada (req_id nulo)', v_nome;
    ELSE
      RAISE NOTICE 'edge % enfileirada (req_id %)', v_nome, v_id;
    END IF;
  END LOOP;

  IF v_falhas > 0 THEN
    RAISE EXCEPTION '% de 5 edges nao foram enfileiradas', v_falhas;
  END IF;
END;
$do$;
