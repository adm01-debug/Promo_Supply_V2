# 09. Observabilidade

## Pilares

1. **Logs estruturados** — `_shared/logger.ts` (`EdgeLogger`) e `src/lib/logger.ts` (frontend).
2. **Telemetria** — tabela `telemetry_logs` alimentada por edge `telemetry`.
3. **Query telemetry** — tabela `query_telemetry` (thresholds: 3s lenta, 8s muito lenta).
4. **Alertas** — tabela `system_alerts` (severity: LOW/MEDIUM/HIGH/CRITICAL) + edge `alert-dispatcher` → Slack.
5. **Auditoria** — `audit_logs` (trigger `enforce_audit_integrity` impede burla).
6. **Scanners DBA** — funções `scan_*` chamadas por `pg_cron` para monitoramento proativo.
7. **Watchdogs** — `cron_watchdog`, `pg_activity_watchdog`.
8. **Dependency health** — edge `dependency-health` + tabelas `dependency_health*`.

## Frontend

- `src/lib/logger.ts:18` — singleton. `info/warn/error/debug`. Sanitiza `password/token/secret/key/auth/cvv`. Em produção ou nível `warn/error`, envia para edge `telemetry`.
- `src/hooks/usePerformanceMonitor.ts:8` — Web Vitals + timing de rotas.
- `src/hooks/useRenderProfiler.ts:8` — profiler por componente (dev only).

## Edge functions de observabilidade

| Função | Papel |
|---|---|
| `telemetry` | Sink em `telemetry_logs`. Auth opcional. |
| `alert-dispatcher` | Cron 1min. Lê `system_alerts` HIGH/CRITICAL não despachados, POST em `SLACK_WEBHOOK_URL`, marca `dispatched_at`. Dedupe in-memory. |
| `dependency-health` | Drift npm + barrel imports; dispara `workflow_dispatch` no GitHub. |
| `run-audit` | Varre `pg_policies`; 403 se CRITICAL. |
| `system-simulation` | Fuzz + stress-test coordenado (usa service role). |

## Scanners DBA (funções `scan_*`, agendadas via `pg_cron`)

| Scanner | Cron sugerido | Alerta gerado |
|---|---|---|
| `scan_unused_indexes` | 03:15 UTC diário | Índices não-únicos >10MB sem scans → sugestão `DROP INDEX` |
| `scan_table_bloat` | a cada 6h | Dead tuples >20% em tabelas hot → `VACUUM ANALYZE` |
| `scan_sequence_exhaustion` | 04:00 UTC diário | >75% MEDIUM, >90% HIGH — sugere `ALTER SEQUENCE ... AS bigint` |
| `scan_fk_without_cascade` | seg 05:00 UTC | FKs com NO ACTION/RESTRICT em tabelas root tenant-scoped |
| `scan_duplicate_indexes` | ter 05:30 UTC | Duplicados exatos ou coberto por prefixo |
| `scan_partition_candidates` | qua 06:00 UTC | Tabelas >10GB candidatas a `PARTITION BY RANGE` |
| `scan_long_running_transactions` | a cada 10min | idle >10min ou active >30min; inclui PID + `pg_terminate_backend` no metadata |
| `scan_dangerous_statements` | ao vivo | UPDATE/DELETE sem WHERE via `pg_stat_statements` |
| `scan_stale_statistics` | 04:30 UTC diário | `last_analyze` >7d ou >20% modificações desde ANALYZE → sugere `ANALYZE public.<tabela>` |
| `scan_cache_hit_ratio` | a cada hora | heap/idx hit ratio <95% (HIGH <90%) → sugere aumentar shared_buffers ou revisar índices |
| `scan_tables_without_pk` | 05:15 UTC diário | Tabelas sem PK ou REPLICA IDENTITY insuficiente (risco replicação/Realtime) |
| `scan_temp_file_usage` | a cada 10min | Spills de sort/hash para disco → sugere aumentar work_mem ou criar índice |

Alertas caem em `system_alerts` e são despachados por `alert-dispatcher`.

## Watchdogs
- `cron_watchdog()` — verifica falhas repetidas de jobs cron; alerta em `system_alerts`.
- `pg_activity_watchdog()` — locks ativos >5min em `pg_stat_activity` → alerta.
- `alert_on_outbox_dead()` — outbox com status `dead` (5 retries) → alerta.
- `check_telemetry_alerts()` — thresholds sobre `telemetry_logs`.

## Limpezas periódicas (retenção)
`cleanup_expired_challenges`, `cleanup_old_audit_logs`, `cleanup_old_geo_access_logs`, `cleanup_old_integration_outbox`, `cleanup_old_login_attempts`, `cleanup_old_query_telemetry`, `cleanup_old_rate_limit_logs`, `cleanup_old_security_logs`, `cleanup_old_system_alerts`, `cleanup_old_telemetry(_logs)`, `cleanup_old_webhook_events`.

Índices **BRIN** aplicados nas colunas temporais dessas tabelas para retenção eficiente.

## Autovacuum tuning
- Tabelas hot (`audit_logs`, `telemetry_logs`, `notifications`, `integration_outbox`) com parâmetros custom de autovacuum (fillfactor, scale_factor).

## Dashboards e UI
- `pages/admin-telemetria/AdminTelemetria.tsx` — `AppLogsView`, `SystemAlertsView`, `TelemetryCharts`.
- `pages/admin/DependencyHealth.tsx` — snapshot + histórico.
- Componentes: `src/components/admin/telemetry/*`.

## Rastreamento (`requestId`)
- Frontend loga com `requestId = crypto.randomUUID()` no `Logger`.
- Edges leem header `x-request-id` ou geram; sempre retornam `requestId` no JSON de resposta e propagam para logs.

---

## Onda 10 — Saturação de conexões e Replication Lag

Dois scanners novos preenchem gaps de observabilidade de infraestrutura:

### `public.scan_connection_saturation(warn_pct=70, crit_pct=90)`
- Lê `pg_stat_activity` e compara com `max_connections`.
- Escala:
  - **CRITICAL** → uso ≥ 90% **ou** > 5 conexões em `idle in transaction (aborted)`.
  - **HIGH** → uso ≥ 70%.
- Metadata do alerta inclui: `by_state`, top 5 `application_name`, top 5 `usename` e SQL de diagnóstico pronto.
- Cron: `scan-connection-saturation-5min` (a cada 5min).

### `public.scan_replication_lag(warn_seconds=30, crit_seconds=120)`
- Percorre `pg_stat_replication` (lag por replica via `write_lag`/`flush_lag`/`replay_lag`) e `pg_replication_slots` (slots inativos).
- Emite HIGH/CRITICAL por replica e HIGH imediato para slots inativos (risco de WAL bloat).
- Guardrail: sai silenciosamente em single-node (sem replicas nem slots).
- Cron: `scan-replication-lag-5min` (a cada 5min).

### Runbook — alerta CRITICAL de saturação
1. Consultar `system_alerts` do tipo `db_connection_saturation` → executar `metadata.diagnostic_sql`.
2. Identificar `application_name` dominante (edge function? worker?).
3. Se houver `idle in transaction (aborted)`: `SELECT pg_terminate_backend(pid)`.
4. Revisar edge function suspeita — provavelmente falta `await client.end()` ou reuso de cliente por request.
5. Escalar `compute` no painel Cloud somente se padrão de uso for legítimo (não leak).

### Runbook — slot inativo
- Verificar se replica correspondente foi desprovisionada.
- Se órfão: executar `metadata.drop_sql` (`pg_drop_replication_slot(...)`).
- Ignorar apenas se replica está em manutenção temporária conhecida.

> Warnings 0028 (SECURITY DEFINER) permanecem na allowlist arquitetural — funções DBA nunca são expostas ao PostgREST.

---

## Onda 11 — Taxa de geração de WAL

### Objetivo
Detectar cedo picos anormais de geração de WAL, que costumam preceder:
- Saturação de disco por WAL retido.
- Replication lag em cascata (correlato com Onda 10).
- Checkpoints excessivos e I/O storm (correlato com Onda 12).
- Bloat acelerado em tabelas hot (write amplification por índices redundantes).

### Assinatura

```sql
public.scan_wal_generation_rate(
  warn_mb_per_min  numeric DEFAULT 50,
  crit_mb_per_min  numeric DEFAULT 200,
  spike_multiplier numeric DEFAULT 3.0
) RETURNS TABLE(severity, mb_per_min, baseline_mb_per_min, delta_seconds)
```

- `SECURITY DEFINER`, `search_path = public, pg_catalog`.
- `EXECUTE` apenas para `service_role` (revogado de `PUBLIC/anon/authenticated`).

### Persistência

Tabela `public.wal_rate_snapshots` (retenção **24h**, purge automático em cada rodada) — colunas: `captured_at`, `wal_bytes`, `wal_records`, `wal_fpi`, `stats_reset`.
Índice `idx_wal_rate_snapshots_captured_at DESC` para leituras rápidas do baseline.
RLS ativa; SELECT liberado apenas para `admin` via `has_role`.

### Thresholds

| Sinal | Severidade | Condição | GUC/ação sugerida |
|---|---|---|---|
| Absoluto crítico | **CRITICAL** | `mb_per_min ≥ 200` | Investigar imediatamente — risco de encher `pg_wal`. |
| Absoluto alto | **HIGH** | `mb_per_min ≥ 50` | Investigar em janela útil. |
| Pico anômalo | **HIGH** | `mb_per_min ≥ 3× baseline` e `baseline > 1 MB/min` | Comparar com deploy/ETL recente. |
| Reset de stats | Ignorado | `stats_reset` mudou entre snapshots | Uma rodada é descartada; retoma na próxima. |
| Sem histórico | Ignorado | Primeira execução | Aguarda 2ª rodada (≥5min). |

**Baseline móvel:** média das últimas 12 amostras da janela de 2h anteriores ao snapshot atual (exclui o instante da comparação para não diluir o próprio pico).

### Frequência
Cron `scan-wal-generation-rate-5min` → `*/5 * * * *`. Janela alinhada à Onda 10 e 12 para permitir correlação temporal.

### Alerta em `system_alerts`

- `alert_type = 'db_wal_generation_rate'`
- `metadata`:
  - `mb_per_min`, `baseline_mb_per_min`, `spike_multiplier`
  - `delta_bytes`, `delta_seconds`, `wal_records_delta`, `wal_fpi_delta`
  - `diagnostic_sql` — pronto para colar no psql (top 20 queries ativas ordenadas por `xact_start`).
  - `wave = 11`

### Runbook por tipo de alerta

**🔴 CRITICAL — taxa absoluta ≥ 200 MB/min**
1. Executar `metadata.diagnostic_sql` e identificar sessão dominante.
2. Checar espaço em `pg_wal`: `SELECT pg_size_pretty(sum(size)) FROM pg_ls_waldir();`
3. Se causa for migração/backfill legítimo: monitorar e considerar `SET LOCAL synchronous_commit = off` na transação (com aval).
4. Se runaway (query travada gerando WAL sem sentido): `pg_terminate_backend(pid)`.
5. Verificar Onda 10 imediatamente — replication lag tende a escalar em minutos.

**🟠 HIGH — taxa absoluta ≥ 50 MB/min**
1. Rodar `diagnostic_sql`; identificar padrão (bulk write, REINDEX, VACUUM FULL, replicação lógica em catch-up).
2. Correlacionar com deploys recentes ou jobs agendados.
3. Se sustentado por >30min, escalar para CRITICAL manual.

**🟠 HIGH — pico ≥ 3× baseline**
1. Confirmar se é evento único (spike) ou início de tendência: consultar as 6 últimas rodadas em `wal_rate_snapshots`.
2. Se coincide com janela ETL/relatórios noturnos → considerar elevar `warn_mb_per_min` só para esse cron horário, ou desabilitar o alerta na janela.
3. Se orgânico e recorrente → revisar índices redundantes com `scan_duplicate_indexes` (Onda 6) e FKs sem cascade (Onda 5) — cada índice extra amplifica WAL em UPDATE/DELETE.

### Ajuste de thresholds
Chamar cron manualmente com override: `SELECT public.scan_wal_generation_rate(80, 300, 4.0);` para ambientes write-heavy legítimos (ex.: fase de migração inicial de dados).

---

## Onda 12 — Saúde de checkpoints (checkpoint tuning)

### `public.scan_checkpoint_health(warn_requested_pct=25, crit_requested_pct=50, warn_ckpt_per_min=0.4, crit_ckpt_per_min=1.0, warn_maxwritten_rate=1.0)`
- Persiste snapshots de `pg_stat_checkpointer` (PG17+) e `pg_stat_bgwriter` em `public.checkpoint_snapshots` (retenção 24h).
- Métricas derivadas entre snapshots:
  - **% requested** = `num_requested / (num_timed + num_requested)` — indica `max_wal_size` insuficiente.
  - **checkpoints/min** — se alto, `checkpoint_timeout` está curto.
  - **maxwritten_clean/min** do bgwriter — se >0, `bgwriter_lru_maxpages` está pequeno.
  - **avg write_time** por checkpoint (I/O saturado).
- Alertas HIGH/CRITICAL com **sugestões prontas** de tuning (max_wal_size, checkpoint_timeout, bgwriter_lru_maxpages).
- Ignora rodadas após `pg_stat_reset_shared`.
- Cron: `scan-checkpoint-health-5min`.

### Runbook — checkpoints muito frequentes
1. Se `requested_pct` alto → `ALTER SYSTEM SET max_wal_size = '8GB'; SELECT pg_reload_conf();`
2. Se `checkpoints_per_min` alto e maioria "timed" → aumentar `checkpoint_timeout` (10-15min).
3. Se `maxwritten_per_min` > 1 → aumentar `bgwriter_lru_maxpages` (100 → 500) e/ou reduzir `bgwriter_delay` (200ms → 100ms).
4. Avaliar `checkpoint_completion_target` (recomendado 0.9 no PG17+) para diluir I/O.
5. Correlacionar com Onda 11 (WAL rate) — checkpoints altos + WAL alto = workload write-heavy legítimo, tuning ainda vale.

---

## Onda 13 — Tabelas sem PK / REPLICA IDENTITY insuficiente

### Objetivo
Detectar tabelas que quebram silenciosamente **replicação lógica**, **Supabase Realtime** e **CDC (Debezium)**. Sem PK ou identity adequada, `UPDATE/DELETE` não propaga, slots incham (correlato com Onda 10) e queries degradam para full-scan.

### Assinatura
```sql
public.scan_tables_without_pk(
  min_rows_critical bigint DEFAULT 1000000,
  allowlist         text[] DEFAULT ARRAY['schema_migrations','ar_internal_metadata']
) RETURNS TABLE(table_name, finding, severity, estimated_rows, replica_identity, in_publication)
```
`STABLE`, `SECURITY DEFINER`, `search_path = public, pg_catalog`, EXECUTE só `service_role`.

### Findings detectados

| Finding | Condição | Severidade base |
|---|---|---|
| `no_primary_key` | Tabela sem `indisprimary` | HIGH (→ CRITICAL se em publication ou >1M rows) |
| `replica_identity_nothing` | `relreplident='n'` | **CRITICAL sempre** (quebra logical replication) |
| `replica_identity_default_no_pk` | `relreplident='d'` sem PK | CRITICAL (Realtime perde UPDATE/DELETE) |
| `replica_identity_using_dropped_index` | `indisreplident=true` e `indisvalid=false` | HIGH (→ CRITICAL se em publication) |

### Filtros aplicados (falsos positivos evitados)
- `relkind IN ('r','p')` — só tabelas reais e raízes particionadas
- `relpersistence = 'p'` — exclui unlogged/temp
- `NOT relispartition` — partições filhas herdam do pai
- `allowlist` — audit append-only, tabelas legadas

### Frequência
Cron `scan-tables-without-pk-daily` → `15 5 * * *`. Diário é suficiente: schema muda raramente.

### Alerta em `system_alerts`
- `alert_type = 'db_missing_pk_or_replica_identity'`
- `entity_id = <table_name>` → dedupe 24h por tabela
- `metadata`: `table_name`, `finding`, `estimated_rows`, `replica_identity`, `in_publication`, `fix_sql`, `wave=13`

### Runbook por finding

**🔴 `replica_identity_nothing`** (mais grave)
1. Confirmar impacto: `SELECT * FROM pg_publication_tables WHERE tablename = '<t>';`
2. Preferencial: `ALTER TABLE public.<t> REPLICA IDENTITY USING INDEX <t>_pkey;`
3. Fallback (custo alto em WAL): `ALTER TABLE public.<t> REPLICA IDENTITY FULL;`
4. Verificar Onda 10 — slot lógico provavelmente cresceu.

**🔴 `no_primary_key` / `replica_identity_default_no_pk`**
1. Executar `metadata.fix_sql` (já traz `ADD CONSTRAINT ... PRIMARY KEY`).
2. Em tabela grande (>10M): criar unique index CONCURRENTLY primeiro, depois `ALTER TABLE ... ADD PRIMARY KEY USING INDEX`.
3. Se coluna `id` não existe, adicionar via `ADD COLUMN id uuid DEFAULT gen_random_uuid()` (fix_sql já contempla).

**🟠 `replica_identity_using_dropped_index`**
1. `REINDEX TABLE public.<t>;` — se apenas invalidação temporária.
2. Se índice foi DROPADO: `ALTER TABLE public.<t> REPLICA IDENTITY USING INDEX <valid_pk_or_unique_idx>;`

### Correlações
- **Onda 10 (replication lag)** → tabelas listadas aqui são causa provável de WAL bloat em slots.
- **Onda 11 (WAL rate)** → `REPLICA IDENTITY FULL` amplifica WAL; preferir `USING INDEX`.

> Warnings 0028 (SECURITY DEFINER) permanecem na allowlist arquitetural — funções DBA nunca são expostas ao PostgREST.

---

## Onda 14 — Temp file spills (work_mem insuficiente)

### Objetivo
Detectar cedo quando sorts/hashes começam a estourar `work_mem` e escrever em disco — causa comum de queries 10-100x mais lentas sem log evidente. Correlato com Onda 11 (WAL) e slow queries.

### Assinatura
```sql
public.scan_temp_file_usage(
  warn_mb_per_min    numeric DEFAULT 10,
  crit_mb_per_min    numeric DEFAULT 100,
  warn_files_per_min numeric DEFAULT 5,
  crit_files_per_min numeric DEFAULT 30
) RETURNS void
```
`SECURITY DEFINER`, EXECUTE só `service_role`. Persiste em `public.temp_file_snapshots` (retenção 24h, RLS admin-only).

### Thresholds

| Sinal | Severidade | Condição |
|---|---|---|
| Volume alto | **CRITICAL** | `mb_per_min ≥ 100` ou `files_per_min ≥ 30` |
| Volume moderado | **HIGH** | `mb_per_min ≥ 10` ou `files_per_min ≥ 5` |
| Stats reset | Ignorado | `stats_reset` mudou entre snapshots |
| Sem baseline | Ignorado | Primeira execução |

### Frequência
Cron `scan-temp-file-usage-10min` → `*/10 * * * *`. Dedupe 24h por `entity_id = datname`.

### Alerta em `system_alerts`
- `alert_type = 'db_temp_file_spill'`
- `metadata`: `mb_per_min`, `files_per_min`, `temp_bytes_delta`, `diagnostic_sql` (top 20 em `pg_stat_statements` por `temp_blks_written`), `suggested_action`, `wave = 14`

### Runbook
1. Executar `metadata.diagnostic_sql` — identifica queries que mais escreveram em disco.
2. Para queries de relatório/OLAP: `SET LOCAL work_mem = '64MB'` na sessão ou via `ALTER ROLE <role> SET work_mem = '32MB'`.
3. Para queries transacionais spillando: sinal de índice ausente — analisar `EXPLAIN (ANALYZE, BUFFERS)`, adicionar índice que elimine o Sort.
4. Correlacionar com Onda 11 — spills geram WAL indireto via re-execução; com Onda 12 — checkpoints podem espremer I/O disponível para temp files.
5. Nunca aumentar `work_mem` globalmente sem calcular `work_mem × max_connections × hash_mem_multiplier` — risco de OOM.
