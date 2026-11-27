-- ============================================
-- MIGRATION: INT-01 - desagenda os crons do catalogo SPOT e remove o espelho local
-- Data: 2026-11-28 | Etapas 163-166 (docs/qa/03-ACHADOS.md:1926)
--
-- Causa: o catalogo de Compras mantinha uma copia local do fornecedor SPOT,
-- reabastecida por 3 jobs do pg_cron (`spot-api-sync-catalog`,
-- `spot-api-sync-customization`, `spot-api-sync-stock`) que chamam a edge
-- `spot-api`. A partir da PR #619 a edge nao tem mais as acoes `syncCatalog`,
-- `syncCustomization` e `syncStock` (VALID_ACTIONS e CRON_ACTIONS reduzidos a
-- createOrder/getOrders/status) e a tela le a view `v_compras_catalogo` do PIM
-- (Promo Gifts V4) pelo `external-db-bridge`.
--
-- Sem esta migration os 3 jobs continuariam rodando de hora em hora/diariamente
-- e batendo na edge com acao desconhecida: resposta de erro a cada execucao,
-- linhas `status='error'` em `spot_api_sync_log` e consumo de cota da API
-- oficial a troco de nada (o catalogo tem teto de 22 req/dia).
--
-- Jobs mantidos: `spot-api-sync-orders-30min` (acao `getOrders`, unica acao da
-- edge que ainda depende da cota) e os jobs `xbz-*`.
--
-- Medicao em producao antes do DROP (27/11/2026):
--   spot_produtos ................ 1.279 linhas
--   spot_skus .................... 3.776
--   spot_estoque ................. 3.776
--   spot_customization_options ....... 0
--   xbz_produtos / xbz_cores / xbz_produto_fiscal .. 0
-- Todas sao copia derivada do PIM/API oficial: nada aqui e fonte de verdade e
-- nenhuma linha precisa ser preservada.
--
-- Consumidores: 0 em src/ e supabase/functions/ (as unicas ocorrencias em src/
-- sao src/integrations/supabase/types.ts, contrato gerado que o types-sync.yml
-- regenera). Cada tabela tem 1 policy SELECT para `authenticated`; os writers
-- eram as edges com service role.
--
-- Idempotente: unschedule por nome, DROP ... IF EXISTS e policy removida por
-- DROP POLICY IF EXISTS. Sem CASCADE de proposito: se algo depender destas
-- tabelas, a transacao unica falha e nada e aplicado.

-- 1) Desagenda os 3 crons do catalogo (nome literal; schedule ignora job inexistente)
DO $do$
DECLARE
  v_job text;
BEGIN
  FOREACH v_job IN ARRAY ARRAY[
    'spot-api-sync-catalog',
    'spot-api-sync-customization',
    'spot-api-sync-stock'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job) THEN
      PERFORM cron.unschedule(v_job);
    END IF;
  END LOOP;
END;
$do$;

-- 2) Remove o espelho local
DROP POLICY IF EXISTS "Allowed roles can view spot produtos" ON public.spot_produtos;
DROP POLICY IF EXISTS "Allowed roles can view spot skus" ON public.spot_skus;
DROP POLICY IF EXISTS "Allowed roles can view spot estoque" ON public.spot_estoque;
DROP POLICY IF EXISTS "Allowed roles can view spot customization" ON public.spot_customization_options;
DROP POLICY IF EXISTS "xbz_produtos_group_read" ON public.xbz_produtos;
DROP POLICY IF EXISTS "xbz_cores_read_authenticated" ON public.xbz_cores;
DROP POLICY IF EXISTS "xbz_produto_fiscal_group_read" ON public.xbz_produto_fiscal;

DROP TABLE IF EXISTS public.spot_produtos;
DROP TABLE IF EXISTS public.spot_skus;
DROP TABLE IF EXISTS public.spot_estoque;
DROP TABLE IF EXISTS public.spot_customization_options;
DROP TABLE IF EXISTS public.xbz_produtos;
DROP TABLE IF EXISTS public.xbz_cores;
DROP TABLE IF EXISTS public.xbz_produto_fiscal;

-- 3) Confirma o estado final (falha a transacao se o job de pedidos sumiu)
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spot-api-sync-orders-30min') THEN
    RAISE EXCEPTION 'INT-01: cron spot-api-sync-orders-30min ausente - releia a migration antes de remover o espelho';
  END IF;
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname IN ('spot-api-sync-catalog', 'spot-api-sync-customization', 'spot-api-sync-stock')
  ) THEN
    RAISE EXCEPTION 'INT-01: ainda ha cron de catalogo SPOT agendado';
  END IF;
END;
$do$;
