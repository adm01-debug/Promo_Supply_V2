-- ---------------------------------------------------------------------------
-- Verificacao de comportamento da migration 20261128120000_cron_watchdog_le_heartbeats
-- (etapas 172 e 171(c)). Nao e um teste automatizado do CI: e a prova executavel
-- registrada na PR e em 05-PROGRESSO.md.
--
-- Roda em Postgres descartavel, sem tocar em nenhum banco real: cria stubs de
-- cron.job, cron.job_run_details, cron_watchdog_seen, cron_heartbeats e
-- system_alerts, aplica a migration e o rollback de verdade e executa
-- public.cron_watchdog() sobre 5 cenarios montados na mao.
--
-- Como rodar (WSL, a partir da RAIZ do repositorio):
--   createdb wt_wd_test
--   psql -v ON_ERROR_STOP=1 -d wt_wd_test -f docs/qa/verificacoes/20261128120000_cron_watchdog_le_heartbeats_validacao.sql
--   dropdb wt_wd_test
-- A ultima consulta imprime `falhas | total`; o esperado e' 0 | 22.
-- ---------------------------------------------------------------------------
\set ON_ERROR_STOP on
\echo === STUBS ===
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigint PRIMARY KEY, jobname text, schedule text, command text, active boolean, database text);
CREATE TABLE cron.job_run_details (jobid bigint, runid bigint, start_time timestamptz, status text);
CREATE TABLE public.cron_watchdog_seen (jobid bigint PRIMARY KEY, jobname text, first_seen timestamptz);
CREATE TABLE public.cron_heartbeats (job_name text PRIMARY KEY, last_run_at timestamptz, last_status text, last_error text,
  run_count int DEFAULT 0, success_count int DEFAULT 0, error_count int DEFAULT 0, updated_at timestamptz DEFAULT now());
CREATE TABLE public.system_alerts (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, created_at timestamptz DEFAULT now(),
  tenant_id uuid, alert_type text, severity text, message text, metadata jsonb, resolved_at timestamptz,
  resolved_by text, dispatch_status text);
CREATE FUNCTION public.resolve_stale_system_error_alerts() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN END; $f$;

\echo === APLICA A MIGRATION NOVA ===
\i 'supabase/migrations/20261128120000_cron_watchdog_le_heartbeats.sql'

CREATE TABLE public.t_checks (nome text, passou boolean, detalhe text);

\echo === CENARIOS ===
INSERT INTO public.cron_heartbeats (job_name,last_run_at,last_status,last_error,run_count,success_count,error_count)
 VALUES ('check-sla-alerts', now()-interval '20 min','error','boom',7,6,1);
INSERT INTO public.cron_heartbeats (job_name,last_run_at,last_status,run_count)
 VALUES ('weekly-report', now(),'unknown',0), ('weekly-summary-report', now(),'unknown',0), ('planejador-sem-heartbeat', now(),'unknown',0);

INSERT INTO cron.job VALUES (10,'check-cotacao-followup','*/5 * * * *','select net.http_post()',true,'postgres');
INSERT INTO public.cron_watchdog_seen VALUES (10,'check-cotacao-followup', now()-interval '30 days');
INSERT INTO cron.job_run_details VALUES (10,1, now()-interval '5 min','succeeded');
INSERT INTO public.cron_heartbeats (job_name,last_run_at,last_status,run_count)
 VALUES ('check-cotacao-followup', now()-interval '4 hours','success',12);

INSERT INTO cron.job VALUES (11,'maintain-partitions','*/10 * * * *','select 1',true,'postgres');
INSERT INTO public.cron_watchdog_seen VALUES (11,'maintain-partitions', now()-interval '10 days');

INSERT INTO cron.job VALUES (12,'process-outbox','*/5 * * * *','select 1',true,'postgres');
INSERT INTO public.cron_watchdog_seen VALUES (12,'process-outbox', now()-interval '10 days');
INSERT INTO cron.job_run_details VALUES (12,1, now()-interval '10 min','failed'), (12,2, now()-interval '5 min','failed');

INSERT INTO public.system_alerts (alert_type,severity,message,created_at,dispatch_status) VALUES
 ('cron_watchdog.stalled.x','HIGH','a', now()-interval '5 hours','failed'),
 ('expiry_alert','HIGH','b', now()-interval '3 hours','exhausted'),
 ('alerta-novo','HIGH','c', now()-interval '10 min','failed'),
 ('sem-assinante','HIGH','e', now()-interval '5 hours','no_subscribers'),
 ('ja-entregue','HIGH','d', now()-interval '5 hours','delivered');

SELECT public.cron_watchdog();

\echo === EXECUCAO 1: novos alertas esperados ===
INSERT INTO public.t_checks
SELECT 'erro de heartbeat abre alerta', EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_heartbeat.error.check-sla-alerts' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'job sem heartbeat abre alerta', EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_heartbeat.stale.check-cotacao-followup' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'heartbeat normal nao alerta', NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_heartbeat.error.check-cotacao-followup'), NULL
UNION ALL SELECT 'seeds run_count=0 nao alertam', NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type LIKE 'cron_heartbeat.%report%' OR alert_type LIKE 'cron_heartbeat.%planejador%'), NULL
UNION ALL SELECT 'ramo stalled intacto', EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_watchdog.stalled.maintain-partitions' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'ramo failing intacto', EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_watchdog.failing.process-outbox' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'dispatch travado abre dead letter', EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='alert_dispatch_dead_letter' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'dead letter conta so os travados', (SELECT metadata->>'pending_alerts' FROM public.system_alerts WHERE alert_type='alert_dispatch_dead_letter' AND resolved_at IS NULL) = '2', NULL
UNION ALL SELECT 'dead letter registra checked_at', (SELECT metadata ? 'checked_at' FROM public.system_alerts WHERE alert_type='alert_dispatch_dead_letter' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'alertas alheios ficam abertos', (SELECT count(*) FROM public.system_alerts WHERE alert_type IN ('cron_watchdog.stalled.x','expiry_alert','ja-entregue','alerta-novo','sem-assinante') AND resolved_at IS NULL) = 5, NULL
UNION ALL SELECT 'severidade dos novos e HIGH', NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE (alert_type LIKE 'cron_heartbeat.%' OR alert_type='alert_dispatch_dead_letter') AND severity <> 'HIGH'), NULL;

\echo === IDEMPOTENCIA: 3 execucoes sem mudanca ===
SELECT public.cron_watchdog(); SELECT public.cron_watchdog(); SELECT public.cron_watchdog();
INSERT INTO public.t_checks
SELECT 'sem duplicar alertas', NOT EXISTS (SELECT 1 FROM (SELECT alert_type, count(*) c FROM public.system_alerts WHERE alert_type LIKE 'cron_heartbeat.%' OR alert_type='alert_dispatch_dead_letter' GROUP BY 1) t WHERE c > 1), NULL
UNION ALL SELECT 'dead letter segue unico e contando 2', (SELECT count(*) FROM public.system_alerts WHERE alert_type='alert_dispatch_dead_letter' AND resolved_at IS NULL) = 1 AND (SELECT metadata->>'pending_alerts' FROM public.system_alerts WHERE alert_type='alert_dispatch_dead_letter' AND resolved_at IS NULL) = '2', NULL;

\echo === NORMALIZACAO ===
UPDATE public.cron_heartbeats SET last_run_at = now(), last_status = 'success', last_error = NULL, run_count = 8 WHERE job_name IN ('check-sla-alerts','check-cotacao-followup');
INSERT INTO cron.job_run_details VALUES (11,1, now(),'succeeded'), (12,3, now(),'succeeded');
UPDATE public.system_alerts SET dispatch_status = 'delivered' WHERE resolved_at IS NULL AND dispatch_status IN ('failed','exhausted');

SELECT public.cron_watchdog();

INSERT INTO public.t_checks
SELECT 'erro de heartbeat fecha sozinho', (SELECT resolved_at IS NOT NULL FROM public.system_alerts WHERE alert_type='cron_heartbeat.error.check-sla-alerts'), NULL
UNION ALL SELECT 'stale fecha sozinho', (SELECT resolved_at IS NOT NULL FROM public.system_alerts WHERE alert_type='cron_heartbeat.stale.check-cotacao-followup'), NULL
UNION ALL SELECT 'stalled fecha sozinho', (SELECT resolved_at IS NOT NULL FROM public.system_alerts WHERE alert_type='cron_watchdog.stalled.maintain-partitions'), NULL
UNION ALL SELECT 'failing fecha sozinho', (SELECT resolved_at IS NOT NULL FROM public.system_alerts WHERE alert_type='cron_watchdog.failing.process-outbox'), NULL
UNION ALL SELECT 'dead letter fecha sozinho', (SELECT resolved_at IS NOT NULL FROM public.system_alerts WHERE alert_type='alert_dispatch_dead_letter'), NULL
UNION ALL SELECT 'nada aberto de cron no fim', NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE resolved_at IS NULL AND alert_type <> 'cron_watchdog.stalled.x' AND (alert_type LIKE 'cron_heartbeat.%' OR alert_type LIKE 'cron_watchdog.%' OR alert_type='alert_dispatch_dead_letter')), NULL;

\echo === REVERT: restaura o corpo antigo e fecha os novos ===
\i 'supabase/rollbacks/20261128120000_revert_cron_watchdog_le_heartbeats.sql'
INSERT INTO cron.job VALUES (13,'job-apos-revert','*/10 * * * *','select 1',true,'postgres');
INSERT INTO public.cron_watchdog_seen VALUES (13,'job-apos-revert', now()-interval '10 days');
SELECT public.cron_watchdog();
INSERT INTO public.cron_heartbeats (job_name,last_run_at,last_status,run_count)
 VALUES ('job-novo-sem-heartbeat', now()-interval '1 hour','error',3);
SELECT public.cron_watchdog();
INSERT INTO public.t_checks
SELECT 'revert nao varre mais heartbeats', NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_heartbeat.error.job-novo-sem-heartbeat'), NULL
UNION ALL SELECT 'revert mantem o ramo antigo vivo', EXISTS (SELECT 1 FROM public.system_alerts WHERE alert_type='cron_watchdog.stalled.job-apos-revert' AND resolved_at IS NULL), NULL
UNION ALL SELECT 'revert fechou os alertas de 171c/173', NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE resolved_at IS NULL AND (alert_type='alert_dispatch_dead_letter' OR alert_type LIKE 'cron_heartbeat.%')), NULL;

\echo === RESULTADO ===
SELECT nome, CASE WHEN passou THEN 'PASS' ELSE 'FAIL' END AS r, detalhe FROM public.t_checks ORDER BY r DESC, nome;
SELECT count(*) FILTER (WHERE NOT passou) AS falhas, count(*) AS total FROM public.t_checks;