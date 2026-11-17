-- Pausa os crons da integração SPOT/Stricker até que exista credencial válida.
--
-- Causa: SPOT_API_ACCESS_KEY nunca foi cadastrada nos secrets do Supabase e a
-- única chave documentada (doc do fornecedor) está revogada — a API responde
-- {"ErrorCode":11,"ErrorMessage":"Access key not found."} em todas as variantes
-- testadas (v1 e v1SSL, http e https), verificado em 2026-11-17.
--
-- Efeito observado antes desta mudança: `spot-api-sync-stock` roda a cada 15 min
-- e aborta em supabase/functions/spot-api/index.ts:133 ("SPOT_API_ACCESS_KEY não
-- configurada"), gerando 414 registros de erro em telemetry_logs desde
-- 2026-11-13 sem nunca gravar uma linha nas tabelas spot_*.
--
-- O código da integração foi auditado contra a documentação oficial do
-- fornecedor (webservice SPOT v1SSL) e está correto: endpoints, fluxo de token
-- de 24h e limites diários (Stocks 96/dia, catálogo 22/dia) conferem.
-- Nada precisa ser alterado no código — falta apenas a credencial.
--
-- ONDE ESTÁ A CREDENCIAL VÁLIDA (achado em 2026-11-17):
-- NÃO solicitar chave nova ao fornecedor antes de checar aqui. O projeto irmão
-- Promo_Gifts_V4 (Supabase ref doufsxqlfjyuvxuezpln) mantém a chave da SPOT
-- ativa e em uso, guardada no Vault como SPOT_ACCESS_KEY e lida por
-- fn_get_spot_access_key() (SECURITY DEFINER). Referência no repo daquele
-- projeto: medallion/SPOT_INTEGRACAO_COMPLETA.md:136.
-- Esse projeto pertence a outra conta/organização Supabase: o token usado por
-- este repositório recebe HTTP 403 ao consultá-lo. É preciso um access token
-- com permissão naquele projeto para copiar a chave.
--
-- PARA REATIVAR (depois de cadastrar SPOT_API_ACCESS_KEY nos secrets):
--   select cron.alter_job(jobid, active := true)
--     from cron.job where jobname like 'spot-api-sync%';
--
-- Os agendamentos são preservados; apenas `active` muda para false.
do $$
declare j record;
begin
  for j in select jobid, jobname from cron.job where jobname like 'spot-api-sync%' loop
    perform cron.alter_job(j.jobid, active := false);
    raise notice 'cron pausado: %', j.jobname;
  end loop;
end $$;