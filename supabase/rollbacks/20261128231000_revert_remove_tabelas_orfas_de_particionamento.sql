-- Rollback de supabase/migrations/20261128231000_remove_tabelas_orfas_de_particionamento.sql
--
-- ATENCAO - as linhas NAO voltam. O DROP removeu 1.177 linhas de telemetria de
-- depuracao (maio/julho de 2026) que ja estavam acima do prazo de 90 dias da
-- `apply_lgpd_retention()`; nao existe copia delas no repositorio. O script abaixo
-- reconstroi apenas a ESTRUTURA, vazia, caso alguem precise do nome da tabela de
-- volta (por exemplo, uma migration antiga que a cite).
--
-- Criadas em 20260712222930_cd4547af-7aac-44d8-8ac2-48991a40dfbf.sql e abandonadas
-- em 20261117170000. Nao reagende `ensure-*-next-partition` nem o edge
-- `maintain-partitions`: a decisao de nao particionar continua valendo.

CREATE TABLE IF NOT EXISTS public.telemetry_logs_202605 (LIKE public.telemetry_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.telemetry_logs_202606 (LIKE public.telemetry_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.telemetry_logs_202607 (LIKE public.telemetry_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.telemetry_logs_202608 (LIKE public.telemetry_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.telemetry_logs_202609 (LIKE public.telemetry_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.telemetry_logs_legacy_20260712 (LIKE public.telemetry_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.audit_logs_202605 (LIKE public.audit_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.audit_logs_202606 (LIKE public.audit_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.audit_logs_202607 (LIKE public.audit_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.audit_logs_202608 (LIKE public.audit_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.audit_logs_202609 (LIKE public.audit_logs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.audit_logs_legacy_20260712 (LIKE public.audit_logs INCLUDING ALL);