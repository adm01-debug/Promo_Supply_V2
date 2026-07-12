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
