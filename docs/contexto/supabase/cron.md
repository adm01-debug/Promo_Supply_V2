# Cron (pg_cron)

Horários em UTC. Execuções recentes em `cron-runs.md`.

| id | nome | schedule | ativo | database | usuário | comando |
|---|---|---|---|---|---|---|
| 1 | cleanup-health-scan-runs | `0 2 * * *` | sim | postgres | postgres | `DELETE FROM public.health_scan_runs WHERE started_at < NOW() - INTERVAL '7 days'` |
| 2 | cleanup-system-alerts | `10 2 * * *` | sim | postgres | postgres | `DELETE FROM public.system_alerts WHERE created_at < NOW() - INTERVAL '30 days'` |
| 5 | cleanup-rate-limit-logs | `45 * * * *` | sim | postgres | postgres | `DELETE FROM public.rate_limit_logs WHERE window_start < NOW() - INTERVAL '24 hours'` |
| 10 | weekly-vacuum-analyze | `0 4 * * 0` | sim | postgres | postgres | `ANALYZE public.health_scan_runs; ANALYZE public.system_alerts; ANALYZE public.telemetry_logs; ANALYZE public.fornecedores; ANALYZE public.pedidos; ANALYZE public.cotacoes` |
| 11 | reset-pg-stat-statements | `0 5 * * 1` | sim | postgres | postgres | `SELECT pg_stat_statements_reset()` |
| 14 | cleanup-checkpoint-snapshots | `30 3 * * 0` | sim | postgres | postgres | `DELETE FROM public.checkpoint_snapshots WHERE captured_at < NOW() - INTERVAL '30 days'` |
| 16 | cleanup-integration-outbox-daily | `30 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_old_integration_outbox();` |
| 17 | lgpd_retention_daily | `15 3 * * *` | sim | postgres | postgres | ` SELECT public.apply_lgpd_retention(); ` |
| 18 | outbox-worker-1min | `* * * * *` | sim | postgres | postgres | `SELECT public._invoke_edge_function('process-outbox');` |
| 19 | refresh-mv-dashboard-kpis | `*/15 * * * *` | sim | postgres | postgres | `SELECT public.refresh_mv_dashboard_kpis();` |
| 24 | xbz-sync-watchdog-hourly | `15 * * * *` | sim | postgres | postgres | `select public.xbz_sync_watchdog()` |
| 31 | spot-api-sync-catalog | `10 3 * * *` | sim | postgres | postgres | `SELECT public._invoke_spot_sync('syncCatalog');` |
| 32 | spot-api-sync-customization | `40 3 * * 1` | sim | postgres | postgres | `SELECT public._invoke_spot_sync('syncCustomization');` |
| 110 | limpa-historico-cron-semanal | `17 4 * * 0` | sim | postgres | postgres | `delete from cron.job_run_details where end_time < now() - interval '7 days'` |
| 111 | scan-particoes-semanal | `45 4 * * 0` | sim | postgres | postgres | `SELECT public.scan_partition_candidates(1.0)` |
| 112 | xbz-sync-pedidos-30min | `*/30 * * * *` | sim | postgres | postgres | `SELECT public._invoke_xbz_sync();` |
| 113 | alert-dispatcher-1min | `* * * * *` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('alert-dispatcher');` |
| 114 | approval-escalation-check | `*/15 * * * *` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('check-approval-escalations');` |
| 115 | contract-expiry-check | `0 7 * * *` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('check-expiry-alerts');` |
| 116 | cotacao-followup-check | `0 12 * * *` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('check-cotacao-followup');` |
| 117 | expiry-alerts-check | `0 10 * * *` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('check-expiry-alerts');` |
| 118 | sla-alerts-check | `*/30 * * * *` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('check-sla-alerts');` |
| 119 | weekly-procurement-report | `0 11 * * 1` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('weekly-report');` |
| 120 | weekly-summary-report-job | `0 8 * * 1` | sim | postgres | ci_snapshot | `SELECT public._invoke_edge_function('weekly-summary-report');` |
| 121 | spot-api-sync-orders-30min | `*/30 * * * *` | sim | postgres | postgres | `SELECT public._invoke_spot_sync('getOrders');` |
| 122 | spot-api-sync-stock | `*/20 * * * *` | sim | postgres | postgres | `SELECT public._invoke_spot_sync('syncStock');` |
