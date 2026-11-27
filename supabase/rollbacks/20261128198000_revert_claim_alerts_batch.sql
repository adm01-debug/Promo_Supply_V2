-- Rollback de supabase/migrations/20261128198000_claim_alerts_batch.sql
--
-- ATENCAO - ordem obrigatoria: reverta PRIMEIRO o deploy da edge
-- `alert-dispatcher` para a versao que seleciona a fila direto em
-- `system_alerts` (select + order + limit, sem RPC). Se a coluna e a funcao
-- forem removidas com a edge nova no ar, todo ciclo do cron de 1 min falha com
-- "function public.claim_alerts_batch does not exist" e nenhum alerta e''
-- entregue.
--
-- Depois do deploy antigo, rode este script. Ele nao toca em dados de alerta:
-- `dispatched_at`, `dispatch_status` e `dispatch_error` permanecem como estao.

DROP FUNCTION IF EXISTS public.claim_alerts_batch(integer);

DROP INDEX IF EXISTS public.idx_system_alerts_fila_dispatch;

ALTER TABLE public.system_alerts
  DROP COLUMN IF EXISTS dispatch_lease_until;