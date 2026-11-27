-- ============================================
-- MIGRATION: remove 12 tabelas orfas do particionamento abandonado (JOB-08)
-- Data: 2026-11-28
--
-- Causa: a tentativa de particionamento mensal de 2026-07 renomeou as originais
-- para `*_legacy_20260712` e criou `*_202605`..`*_202609`
-- (20260712222930_cd4547af-7aac-44d8-8ac2-48991a40dfbf.sql). O particionamento foi
-- abandonado em 20261117170000 ("nenhuma tabela em public e particionada"), mas as
-- 12 tabelas intermediarias ficaram no banco. No snapshot de producao todas tem
-- kind=table, is_partition=false, parent=null: nao sao alcancadas por um DELETE na
-- tabela-pai e `apply_lgpd_retention()` (fonte unica da retencao desde
-- 20261117230000) enumera nomes literais, entao nunca as limpa.
--
-- Medicao antes do DROP (docs/contexto/supabase/stats.json, snapshot de 26/11/2026,
-- branch `contexto` — est_rows):
--   telemetry_logs_202605 ............... 560
--   telemetry_logs_202607 ................ 50
--   telemetry_logs_legacy_20260712 ...... 567   => 1.177 linhas
--   telemetry_logs_202606/202608/202609 .. 0
--   audit_logs_202605..202609 ............ 0
--   audit_logs_legacy_20260712 ........... 0
-- Sao linhas de telemetria de depuracao de maio/julho, acima do prazo declarado de
-- 90 dias, e as colunas carregam dado pessoal (user_id, client_ip, user_agent).
--
-- Nenhum consumidor: 0 referencias em src/ e supabase/functions/ (as unicas
-- ocorrencias em src/ sao src/integrations/supabase/types.ts — contrato gerado que o
-- types-sync.yml regenera — e a lista de `src/tests/security/…restrictive.test.ts`,
-- que le migrations, nao o banco). Nenhuma view ou relacao depende delas.
--
-- Sem CASCADE de proposito: se algo depender destas tabelas, a transacao unica do
-- canal de apply falha inteira e nada e apagado.
-- ============================================

DROP TABLE IF EXISTS public.telemetry_logs_202605;
DROP TABLE IF EXISTS public.telemetry_logs_202606;
DROP TABLE IF EXISTS public.telemetry_logs_202607;
DROP TABLE IF EXISTS public.telemetry_logs_202608;
DROP TABLE IF EXISTS public.telemetry_logs_202609;
DROP TABLE IF EXISTS public.telemetry_logs_legacy_20260712;
DROP TABLE IF EXISTS public.audit_logs_202605;
DROP TABLE IF EXISTS public.audit_logs_202606;
DROP TABLE IF EXISTS public.audit_logs_202607;
DROP TABLE IF EXISTS public.audit_logs_202608;
DROP TABLE IF EXISTS public.audit_logs_202609;
DROP TABLE IF EXISTS public.audit_logs_legacy_20260712;