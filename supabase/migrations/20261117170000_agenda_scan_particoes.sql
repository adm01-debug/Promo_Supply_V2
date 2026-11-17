-- Agenda o detector de candidatas a particionamento.
--
-- Contexto (medido em 17/11/2026 no banco de producao):
--   audit_logs     = 216 kB / ~22 linhas
--   telemetry_logs = 1208 kB / ~439 linhas
--   nenhuma tabela em public e particionada (pg_class.relkind = 'p' -> 0 linhas)
--
-- Particionar agora seria DDL destrutiva (recriar tabela + swap, com RLS e FKs) sem
-- ganho algum. A retencao ja esta ativa e segura:
--   cron 17 `lgpd_retention_daily`  -> apply_lgpd_retention(): audit_logs 5 anos (LGPD
--                                      art.16), telemetry_logs 90 dias
--   cron 3  `cleanup-telemetry-logs` -> telemetry_logs 30 dias
--
-- O que faltava: `scan_partition_candidates(min_size_gb)` existe no banco e ja grava
-- alerta em system_alerts com o SQL de migracao pronto, mas nao estava agendada em
-- nenhum job -- o aviso "chegou a hora de particionar" nunca ia disparar. Este cron
-- fecha essa lacuna sem tocar em estrutura de tabela.

SELECT cron.unschedule('scan-particoes-semanal')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-particoes-semanal');

SELECT cron.schedule(
  'scan-particoes-semanal',
  '45 4 * * 0',
  $$SELECT public.scan_partition_candidates(1.0)$$
);