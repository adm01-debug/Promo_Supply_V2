-- ============================================================================
-- Retencao de dados: fonte unica de verdade
-- ============================================================================
-- CAUSA
-- Auditoria encontrou 5 tabelas com DOIS prazos de retencao concorrentes:
-- um cron com DELETE inline e a funcao oficial `apply_lgpd_retention()`.
-- O cron sempre roda com prazo menor, entao o prazo DECLARADO no sistema
-- (e citado como politica de LGPD) nunca valia de fato:
--
--   tabela               cron inline (o que acontecia)  apply_lgpd_retention
--   query_telemetry      7 dias                          90 dias
--   deadlock_snapshots   7 dias                          90 dias
--   geo_access_logs      30 dias                         180 dias
--   wal_rate_snapshots   30 dias                         90 dias
--   rate_limit_logs      24 horas                        180 dias
--
-- E o mesmo padrao ja corrigido para `telemetry_logs` (cron de 30 dias
-- desagendado em favor dos 90 dias declarados) e para a funcao orfa
-- `cleanup_old_audit_logs()` (dropada).
--
-- DECISAO
-- 1. As 4 primeiras: remover o cron curto. `apply_lgpd_retention()` passa a
--    ser a fonte unica. Custo zero de espaco: as 4 tabelas somam menos de
--    400 kB hoje (query_telemetry 128 kB, deadlock_snapshots 120 kB,
--    geo_access_logs 80 kB, wal_rate_snapshots 56 kB).
-- 2. `rate_limit_logs` NAO entra: o expurgo de 24 h nao e retencao, e
--    limpeza operacional de janelas expiradas. `check_rate_limit()` consulta
--    a tabela no caminho quente via `idx_rate_limit_logs_ident_endpoint_window`;
--    inflar para 180 dias degradaria esse indice. 24 h e mais restritivo que
--    o teto de 180 dias, logo ja esta conforme.
-- ============================================================================

DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'cleanup-query-telemetry',
    'cleanup-deadlock-snapshots',
    'cleanup-geo-access-logs',
    'cleanup-wal-rate-snapshots'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
      RAISE NOTICE 'cron desagendado: %', j;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Funcoes de manutencao nao agendadas: marcar para nao virarem armadilha
-- ============================================================================
-- Elas existem no banco, nao sao chamadas por nenhum cron, nenhuma outra
-- funcao, nenhum trigger e nenhuma policy. Sem marcacao, o proximo agente
-- (humano ou IA) tende a agenda-las "porque estavam ali", criando de novo um
-- segundo prazo concorrente -- exatamente o bug que esta migration corrige.
-- Nao sao dropadas: a logica delas e util como referencia e o DROP seria
-- perda de trabalho anterior.

COMMENT ON FUNCTION public.cleanup_old_query_telemetry() IS
  'NAO AGENDADA. Retencao de query_telemetry e feita por apply_lgpd_retention() (90 dias). Nao agendar: criaria um segundo prazo concorrente.';
COMMENT ON FUNCTION public.cleanup_deadlock_snapshots() IS
  'NAO AGENDADA. Retencao de deadlock_snapshots e feita por apply_lgpd_retention() (90 dias). Nao agendar.';
COMMENT ON FUNCTION public.cleanup_old_geo_access_logs() IS
  'NAO AGENDADA. Retencao de geo_access_logs e feita por apply_lgpd_retention() (180 dias). Nao agendar.';
COMMENT ON FUNCTION public.cleanup_old_wal_rate_snapshots() IS
  'NAO AGENDADA. Retencao de wal_rate_snapshots e feita por apply_lgpd_retention() (90 dias). Nao agendar.';
COMMENT ON FUNCTION public.cleanup_old_telemetry_logs() IS
  'NAO AGENDADA. Retencao de telemetry_logs e feita por apply_lgpd_retention() (90 dias). Nao agendar.';
COMMENT ON FUNCTION public.cleanup_old_rate_limit_logs() IS
  'NAO AGENDADA. O expurgo operacional de rate_limit_logs e o cron cleanup-rate-limit-logs (24 h, DELETE inline por window_start); o teto legal e apply_lgpd_retention() (180 dias).';
COMMENT ON FUNCTION public.cleanup_old_security_logs() IS
  'NAO AGENDADA. Retencao de security_logs e feita por apply_lgpd_retention() (5 anos, LGPD art.16). Nao agendar: apagaria auditoria antes do prazo legal.';
COMMENT ON FUNCTION public.cleanup_old_login_attempts() IS
  'NAO AGENDADA. Retencao de login_attempts e feita por apply_lgpd_retention() (180 dias). Nao agendar.';
COMMENT ON FUNCTION public.cleanup_old_system_alerts() IS
  'AGENDADA em 20261127130000. O cron cleanup-system-alerts (job 2, 10 2 * * *) passou a chamar esta funcao: resolvido expurga em 60 dias, aberto em 180. Antes disso o job fazia DELETE inline por created_at (30 dias) e apagava alerta aberto. Sem regra concorrente em apply_lgpd_retention().';

-- ============================================================================
-- Particionamento: infraestrutura pronta e deliberadamente inativa
-- ============================================================================
-- As 5 funcoes abaixo formam um conjunto completo de particionamento mensal
-- deixado por trabalho anterior, mas nenhuma tabela e particionada hoje
-- (audit_logs 248 kB / 32 linhas; telemetry_logs 1216 kB / 470 linhas) e
-- particionar nesse volume so adiciona complexidade. A decisao de NAO ativar
-- e consciente, e o gatilho de reavaliacao ja existe e roda: o cron semanal
-- `scan-particoes-semanal` chama `scan_partition_candidates(1.0)`.
-- Marcadas para que o conjunto nao seja confundido com codigo morto e
-- removido, nem ativado sem o gatilho.

COMMENT ON FUNCTION public.archive_audit_logs_older_than(integer) IS
  'INATIVA POR DECISAO. Move audit_logs antigos para tabela de arquivo; depende de particionamento, que nao esta ligado. Reavaliar junto com ensure_audit_logs_partition().';
COMMENT ON FUNCTION public.archive_telemetry_logs_older_than(integer) IS
  'INATIVA POR DECISAO. Move telemetry_logs antigos para tabela de arquivo; depende de particionamento, que nao esta ligado. Reavaliar junto com ensure_telemetry_logs_partition().';
COMMENT ON FUNCTION public.ensure_audit_logs_partition(date) IS
  'INATIVA POR DECISAO. Particionamento de audit_logs nao esta ligado (tabela < 1 MB). Reavaliar quando scan_partition_candidates() (cron scan-particoes-semanal) apontar a tabela. Nao remover: faz parte do conjunto com maintain_monthly_partitions() e archive_audit_logs_older_than().';
COMMENT ON FUNCTION public.ensure_telemetry_logs_partition(date) IS
  'INATIVA POR DECISAO. Particionamento de telemetry_logs nao esta ligado (tabela < 2 MB). Reavaliar via scan_partition_candidates() (cron scan-particoes-semanal).';
COMMENT ON FUNCTION public.maintain_monthly_partitions(text, integer, integer) IS
  'INATIVA POR DECISAO. Orquestra ensure_*_partition(); so faz sentido depois que alguma tabela for de fato particionada. Reavaliar via scan_partition_candidates().';