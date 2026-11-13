-- ============================================
-- MIGRATION: registra o job pg_cron 'limpa-historico-cron-semanal'
-- Data: 2026-11-13
--
-- O job já existe em produção (cron.job jobid 40, criado direto no banco, sem
-- arquivo no repo): todo domingo 04:17 UTC apaga de cron.job_run_details o
-- histórico de execuções com mais de 7 dias (a tabela cresce a cada execução
-- de todos os jobs). Este arquivo só versiona o que roda.
-- Idempotente: remove o job pelo nome se existir e agenda de novo com a mesma
-- definição (o jobid muda; nada referencia o jobid).
-- ============================================

SELECT cron.unschedule('limpa-historico-cron-semanal')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpa-historico-cron-semanal');

SELECT cron.schedule(
    'limpa-historico-cron-semanal',
    '17 4 * * 0',
    $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
