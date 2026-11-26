# edge-maintain - maintain-partitions: INATIVA POR DECISAO

- **Estado:** INATIVO POR DECISAO (nao existe cron.schedule; nao agendar agora)
- **Data:** 2026-11-26 (doc corrigida 2026-11-21)
- **Camadas:** edge / DB
- **Evidencia (real):** edge completa `supabase/functions/maintain-partitions/index.ts` (verifyCronSecret + recordCronHeartbeat). RPC real `maintain_monthly_partitions` em `supabase/migrations/20260719000004_partition_maintenance.sql:9`, bootstrap :113-122.
- **Decisao ESTABELECIDA NO REPO (17/11, anterior a esta doc):** `supabase/migrations/20261117230000_retencao_fonte_unica.sql:87-100` declara particionamento **INATIVA POR DECISAO** - audit_logs < 1 MB (248 kB / 32 linhas), telemetry_logs < 2 MB (1216 kB / 470 linhas); particionar nesse volume so adiciona complexidade. O gatilho de reavaliacao JA EXISTE E RODA: cron semanal `scan-particoes-semanal` -> `scan_partition_candidates(1.0)` (`20261117170000:241-247`), que emite alerta quando uma tabela atingir o limiar.
- **POR QUE NAO AGENDAR:** agendar `cron.schedule` da edge agora (a) contradiz a decisao documentada, (b) recriaria a armadilha que a propria migration 20261117230000 alerta (agente tende a agendar "porque esta ali", e o COMMENT ON FUNCTION marca explicitamente NAO agendar para o conjunto partition), e (c) roda manutencao sobre tabelas nao particionadas.
- **Acionamento correto:** quando `scan_particoes-semanal` apontar audit_logs/telemetry_logs como candidatas (crescerem > limiar), PARTICIONAR as tabelas e SO ENTAO agendar esta edge (add cron.schedule + remover o bloqueio no COMMENT).
- **Regra de negocio:** manutencao mensal de particoes para performance em tabelas grandes; hoje nada e particionado, entao nada a manter.
- **Raio de impacto:** nenhum runtime. Acionamento futuro via gatilho scan-particoes-semanal.
