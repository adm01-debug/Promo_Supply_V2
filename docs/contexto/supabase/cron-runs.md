# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 1 · cleanup-health-scan-runs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 02:00:00 | succeeded | 0.04 | DELETE 96 |
| 2026-11-21 02:00:00 | succeeded | 0.03 | DELETE 19 |
| 2026-11-20 02:00:00 | succeeded | 0.03 | DELETE 0 |


## 2 · cleanup-system-alerts

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 02:10:00 | succeeded | 0.01 | DELETE 0 |
| 2026-11-21 02:10:00 | succeeded | 0.04 | DELETE 0 |
| 2026-11-20 02:10:00 | succeeded | 0.05 | DELETE 0 |


## 5 · cleanup-rate-limit-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 11:45:00 | succeeded | 0.03 | DELETE 0 |
| 2026-11-22 10:45:00 | succeeded | 0.04 | DELETE 0 |
| 2026-11-22 09:45:00 | succeeded | 0.04 | DELETE 0 |


## 10 · weekly-vacuum-analyze

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 04:00:00 | succeeded | 0.24 | ANALYZE |


## 11 · reset-pg-stat-statements

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-16 05:00:00 | succeeded | 0.01 | 1 row |


## 14 · cleanup-checkpoint-snapshots

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 03:30:00 | succeeded | 0.03 | DELETE 0 |


## 16 · cleanup-integration-outbox-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 03:30:00 | succeeded | 0.02 | 1 row |
| 2026-11-21 03:30:00 | succeeded | 0.01 | 1 row |
| 2026-11-20 03:30:00 | succeeded | 0.05 | 1 row |


## 17 · lgpd_retention_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 03:15:00 | succeeded | 0.12 | 1 row |
| 2026-11-21 03:15:00 | succeeded | 0.15 | 1 row |
| 2026-11-20 03:15:00 | succeeded | 0.11 | 1 row |


## 18 · outbox-worker-1min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:16:00 | succeeded | 0.02 | 1 row |
| 2026-11-22 12:15:00 | succeeded | 0.02 | 1 row |
| 2026-11-22 12:14:00 | succeeded | 0.06 | 1 row |


## 19 · refresh-mv-dashboard-kpis

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:15:00 | succeeded | 0.19 | 1 row |
| 2026-11-22 12:00:00 | succeeded | 0.19 | 1 row |
| 2026-11-22 11:45:00 | succeeded | 0.21 | 1 row |


## 24 · xbz-sync-watchdog-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:15:00 | succeeded | 0.03 | 1 row |
| 2026-11-22 11:15:00 | succeeded | 0.24 | 1 row |
| 2026-11-22 10:15:00 | succeeded | 0.22 | 1 row |


## 31 · spot-api-sync-catalog

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 03:10:00 | succeeded | 0.01 | 1 row |
| 2026-11-21 03:10:00 | succeeded | 0.01 | 1 row |
| 2026-11-20 03:10:00 | succeeded | 0.01 | 1 row |


## 32 · spot-api-sync-customization

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-16 03:40:00 | succeeded | 0.02 | 1 row |


## 110 · limpa-historico-cron-semanal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 04:17:00 | succeeded | 0.41 | DELETE 11717 |


## 111 · scan-particoes-semanal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 04:45:00 | succeeded | 0.42 | 0 rows |


## 112 · xbz-sync-pedidos-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:00:00 | succeeded | 0.06 | 1 row |
| 2026-11-22 11:30:00 | succeeded | 0.01 | 1 row |
| 2026-11-22 11:00:00 | succeeded | 0.03 | 1 row |


## 113 · alert-dispatcher-1min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:16:00 | succeeded | 0.01 | 1 row |
| 2026-11-22 12:15:00 | succeeded | 0.03 | 1 row |
| 2026-11-22 12:14:00 | succeeded | 0.06 | 1 row |


## 114 · approval-escalation-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:15:00 | succeeded | 0.04 | 1 row |
| 2026-11-22 12:00:00 | succeeded | 0.07 | 1 row |
| 2026-11-22 11:45:00 | succeeded | 0.03 | 1 row |


## 115 · contract-expiry-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 07:00:00 | succeeded | 0.04 | 1 row |


## 116 · cotacao-followup-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:00:00 | succeeded | 0.07 | 1 row |


## 117 · expiry-alerts-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 10:00:00 | succeeded | 0.02 | 1 row |


## 118 · sla-alerts-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:00:00 | succeeded | 0.08 | 1 row |
| 2026-11-22 11:30:00 | succeeded | 0.02 | 1 row |
| 2026-11-22 11:00:00 | succeeded | 0.02 | 1 row |


## 119 · weekly-procurement-report

_nenhum_


## 120 · weekly-summary-report-job

_nenhum_


## 121 · spot-api-sync-orders-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:00:00 | succeeded | 0.07 | 1 row |
| 2026-11-22 11:30:00 | succeeded | 0.01 | 1 row |
| 2026-11-22 11:00:00 | succeeded | 0.01 | 1 row |


## 122 · spot-api-sync-stock

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:00:00 | succeeded | 0.07 | 1 row |
| 2026-11-22 11:40:00 | succeeded | 0.01 | 1 row |
| 2026-11-22 11:20:00 | succeeded | 0.01 | 1 row |


## 123 · cron-watchdog-15min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-22 12:15:00 | succeeded | 0.13 | 1 row |
| 2026-11-22 12:00:00 | succeeded | 0.39 | 1 row |
