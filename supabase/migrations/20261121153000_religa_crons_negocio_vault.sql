-- ============================================================================
-- Religa os crons de NEGOCIO definidos em migrations mas inativos em producao.
--
-- CAUSA (auditoria-implementacao-261120.md, secao 6):
--   70 jobs definidos em migrations x ~18 vivos em prod. Os 9 abaixo sao os de
--   negocio: NENHUM alerta de SLA, vencimento, follow-up de cotacao,
--   escalonamento de aprovacao ou relatorio semanal e emitido.
--
--   Os 5 definidos em 20260402114640 usavam chave ANON literal
--   (app.settings.supabase_anon_key) + URL via current_setting; as edges hoje
--   exigem service_role via verifyCronSecret (fail-closed) -> rodavam 401 sem
--   efeito. weekly-summary-report-job (20260507194402) aponta para o projeto
--   Supabase ERRADO (apuzcrkeqodktmpwobnz, diferente do oficial
--   lmypcdfsrgfftzhxawao) e tambem usa URL literal.
--
-- DECISAO:
--   1. Ligar os 9 via public._invoke_edge_function (chave service_role lida do
--      Vault, fail-closed, criada em 20261112171742) com os HORARIOS ORIGINAIS.
--   2. Conservador e idempotente: cria o job apenas se NAO existir em cron.job
--      (WHERE NOT EXISTS). Job ja ativo em prod (ex.: outbox-worker-1min,
--      decidido por migration posterior) NAO e sobrescrito nem duplicado.
--   3. Unica excecao: weekly-summary-report-job, que precisa de CORRECAO de
--      destino (projeto errado). Nesse caso, unschedule + schedule novo.
--   4. NAO reativa crons de retencao/higiene desligados por decisao documentada
--      (20261117230000 retencao fonte unica; 20261117170000 particionamento).
-- ============================================================================

-- 1) OBS-01: dispatcher de alertas (1 min)
SELECT cron.schedule(
  'alert-dispatcher-1min',
  '* * * * *',
  $$SELECT public._invoke_edge_function('alert-dispatcher');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alert-dispatcher-1min');

-- 2) INT-06: worker de outbox (1 min) ? preserva se ja ativo em prod
SELECT cron.schedule(
  'outbox-worker-1min',
  '* * * * *',
  $$SELECT public._invoke_edge_function('process-outbox');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'outbox-worker-1min');

-- 3) Escalonamento de aprovacoes paradas (15 min)
SELECT cron.schedule(
  'approval-escalation-check',
  '*/15 * * * *',
  $$SELECT public._invoke_edge_function('check-approval-escalations');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'approval-escalation-check');

-- 4) Vencimento de contratos (diario 07:00 UTC)
SELECT cron.schedule(
  'contract-expiry-check',
  '0 7 * * *',
  $$SELECT public._invoke_edge_function('check-expiry-alerts');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'contract-expiry-check');

-- 5) Follow-up de cotacoes paradas 48h+ (diario 12:00 UTC, horario da migracao mais recente)
SELECT cron.schedule(
  'cotacao-followup-check',
  '0 12 * * *',
  $$SELECT public._invoke_edge_function('check-cotacao-followup');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cotacao-followup-check');

-- 6) Alerta de vencimentos (diario 10:00 UTC)
SELECT cron.schedule(
  'expiry-alerts-check',
  '0 10 * * *',
  $$SELECT public._invoke_edge_function('check-expiry-alerts');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expiry-alerts-check');

-- 7) SLA de pedidos/fornecedores (30 min)
SELECT cron.schedule(
  'sla-alerts-check',
  '*/30 * * * *',
  $$SELECT public._invoke_edge_function('check-sla-alerts');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sla-alerts-check');

-- 8) Relatorio semanal de compras (segunda 11:00 UTC, horario da migracao mais recente)
SELECT cron.schedule(
  'weekly-procurement-report',
  '0 11 * * 1',
  $$SELECT public._invoke_edge_function('weekly-report');$$
)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-procurement-report');

-- 9) Resumo semanal (segunda 08:00 UTC) ? CORRIGE o destino: projeto oficial
--    via Vault (a definicao antiga apontava para apuzcrkeqodktmpwobnz, projeto errado)
SELECT cron.unschedule('weekly-summary-report-job')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summary-report-job');
SELECT cron.schedule(
  'weekly-summary-report-job',
  '0 8 * * 1',
  $$SELECT public._invoke_edge_function('weekly-summary-report');$$
);

-- Observabilidade: as edges registram recordCronHeartbeat (health_dashboard);
-- cron_watchdog (20260711191946) monitora outbox/alert-dispatcher; a paridade
-- semanal (paridade-banco.yml) confere presenca dos jobs no banco.
