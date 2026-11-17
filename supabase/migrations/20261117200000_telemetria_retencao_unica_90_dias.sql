-- telemetry_logs tinha DUAS retencoes concorrentes sobre a mesma tabela:
--   * cron 'cleanup-telemetry-logs' (02:20 diario) apagava com 30 dias;
--   * public.apply_lgpd_retention() (cron lgpd_retention_daily, 03:15) com 90 dias.
-- A de 30 dias roda antes e e mais agressiva, entao vencia sempre e a de 90 dias
-- nunca tinha o que apagar. Na pratica a guarda real era 30 dias, enquanto a
-- politica declarada no codigo e na documentacao era 90.
--
-- Decisao do dono do produto: manter 90 dias (custo irrelevante — a tabela ocupa
-- 1,2 MB com 463 registros — e preserva rastro para investigar falha antiga).
-- Esta migration desliga a rotina de 30 dias; apply_lgpd_retention passa a ser a
-- unica fonte de verdade da retencao de telemetry_logs.
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-telemetry-logs');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cleanup-telemetry-logs ja estava ausente: %', SQLERRM;
END;
$$;
