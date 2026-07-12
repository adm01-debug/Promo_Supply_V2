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

### `public.scan_wal_generation_rate(warn_mb_per_min=50, crit_mb_per_min=200, spike_multiplier=3.0)`
- Persiste snapshots de `pg_stat_wal` em `public.wal_rate_snapshots` (retenção 24h).
- Calcula MB/min desde o snapshot anterior e compara com **baseline móvel** (média das últimas 12 amostras das 2h).
- Escala:
  - **CRITICAL** → taxa ≥ 200 MB/min (absoluto).
  - **HIGH** → taxa ≥ 50 MB/min, ou pico ≥ 3× o baseline.
- Ignora rodadas após reset de estatísticas (`pg_stat_reset_shared('wal')`).
- Cron: `scan-wal-generation-rate-5min` (a cada 5min).

### Runbook
1. Consultar `system_alerts` do tipo `db_wal_generation_rate` → executar `metadata.diagnostic_sql` para ver queries ativas.
2. Suspeitos típicos: bulk `UPDATE`/`INSERT`, `VACUUM FULL`, `REINDEX`, migrações grandes, replicação lógica em catch-up.
3. Se pico for legítimo (ex: janela ETL noturna), agendar exceção temporária ou elevar `warn_mb_per_min` na chamada do cron.
4. Se sustentado, revisar índices redundantes (write amplification) — cruzar com `scan_duplicate_indexes` (Onda 6).

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

> Warnings 0028 (SECURITY DEFINER) permanecem na allowlist arquitetural — funções DBA nunca são expostas ao PostgREST.
