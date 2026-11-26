-- Reversao de 20261127130000_retencao_system_alerts_fonte_unica.sql
--
-- Devolve o job 2 (`cleanup-system-alerts`) ao DELETE inline de 30 dias por
-- `created_at` e o comentario da funcao ao texto de 20261117230000.
-- Aplicar manualmente (mesmo canal: workflow "Aplicar migration no banco de producao").
-- ATENCAO: reverter reintroduz a perda de alerta ABERTO aos 30 dias.
DO $do$
DECLARE
  v_present boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-system-alerts') INTO v_present;
  IF v_present THEN
    PERFORM cron.unschedule('cleanup-system-alerts');
  END IF;
  PERFORM cron.schedule(
    'cleanup-system-alerts',
    '10 2 * * *',
    $$DELETE FROM public.system_alerts WHERE created_at < NOW() - INTERVAL '30 days'$$
  );
END;
$do$;

COMMENT ON FUNCTION public.cleanup_old_system_alerts() IS
  'NAO AGENDADA. O expurgo de system_alerts e o cron cleanup-system-alerts (30 dias, DELETE inline). Sem regra concorrente em apply_lgpd_retention().';