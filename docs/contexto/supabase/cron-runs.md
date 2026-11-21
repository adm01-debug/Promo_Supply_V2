# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 1 · cleanup-health-scan-runs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 02:00:00 | succeeded | 0.03 | DELETE 19 |
| 2026-11-20 02:00:00 | succeeded | 0.03 | DELETE 0 |
| 2026-11-19 02:00:00 | succeeded | 0.02 | DELETE 0 |


## 2 · cleanup-system-alerts

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 02:10:00 | succeeded | 0.04 | DELETE 0 |
| 2026-11-20 02:10:00 | succeeded | 0.05 | DELETE 0 |
| 2026-11-19 02:10:00 | succeeded | 0.04 | DELETE 0 |


## 5 · cleanup-rate-limit-logs

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 17:45:00 | succeeded | 0.02 | DELETE 0 |
| 2026-11-21 16:45:00 | succeeded | 0.03 | DELETE 0 |
| 2026-11-21 15:45:00 | succeeded | 0.02 | DELETE 0 |


## 10 · weekly-vacuum-analyze

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-15 04:00:00 | succeeded | 0.17 | ANALYZE |


## 11 · reset-pg-stat-statements

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-16 05:00:00 | succeeded | 0.01 | 1 row |


## 14 · cleanup-checkpoint-snapshots

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-15 03:30:00 | succeeded | 0.03 | DELETE 0 |


## 16 · cleanup-integration-outbox-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 03:30:00 | succeeded | 0.01 | 1 row |
| 2026-11-20 03:30:00 | succeeded | 0.05 | 1 row |
| 2026-11-19 03:30:00 | succeeded | 0.04 | 1 row |


## 17 · lgpd_retention_daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 03:15:00 | succeeded | 0.15 | 1 row |
| 2026-11-20 03:15:00 | succeeded | 0.11 | 1 row |
| 2026-11-19 03:15:00 | succeeded | 0.08 | 1 row |


## 18 · outbox-worker-1min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:16:00 | succeeded | 0.03 | 1 row |
| 2026-11-21 18:15:00 | succeeded | 0.02 | 1 row |
| 2026-11-21 18:14:00 | succeeded | 0.02 | 1 row |


## 19 · refresh-mv-dashboard-kpis

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:15:00 | succeeded | 0.16 | 1 row |
| 2026-11-21 18:00:00 | succeeded | 0.11 | 1 row |
| 2026-11-21 17:45:00 | succeeded | 0.18 | 1 row |


## 24 · xbz-sync-watchdog-hourly

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:15:00 | succeeded | 1.01 | 1 row |
| 2026-11-21 17:15:00 | succeeded | 0.98 | 1 row |
| 2026-11-21 16:15:00 | succeeded | 0.49 | 1 row |


## 31 · spot-api-sync-catalog

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 03:10:00 | succeeded | 0.01 | 1 row |
| 2026-11-20 03:10:00 | succeeded | 0.01 | 1 row |
| 2026-11-19 03:10:00 | succeeded | 0.03 | 1 row |


## 32 · spot-api-sync-customization

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-16 03:40:00 | succeeded | 0.02 | 1 row |


## 33 · spot-api-sync-stock

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:15:00 | succeeded | 0.03 | 1 row |
| 2026-11-21 18:00:00 | succeeded | 0.00 | 1 row |
| 2026-11-21 17:45:00 | succeeded | 0.03 | 1 row |


## 110 · limpa-historico-cron-semanal

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-15 04:17:00 | succeeded | 0.32 | DELETE 95718 |


## 111 · scan-particoes-semanal

_nenhum_


## 112 · xbz-sync-pedidos-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:00:00 | succeeded | 0.01 | 1 row |
| 2026-11-21 17:30:00 | succeeded | 0.02 | 1 row |
| 2026-11-21 17:00:00 | succeeded | 0.01 | 1 row |


## 113 · alert-dispatcher-1min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:16:00 | succeeded | 0.03 | 1 row |
| 2026-11-21 18:15:00 | succeeded | 0.03 | 1 row |
| 2026-11-21 18:14:00 | succeeded | 0.03 | 1 row |


## 114 · approval-escalation-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:15:00 | succeeded | 0.03 | 1 row |
| 2026-11-21 18:00:00 | succeeded | 0.04 | 1 row |
| 2026-11-21 17:45:00 | failed | 0.00 | ERROR:  permission denied for function _invoke_edge_function  |


## 115 · contract-expiry-check

_nenhum_


## 116 · cotacao-followup-check

_nenhum_


## 117 · expiry-alerts-check

_nenhum_


## 118 · sla-alerts-check

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-21 18:00:00 | succeeded | 0.02 | 1 row |


## 119 · weekly-procurement-report

_nenhum_


## 120 · weekly-summary-report-job

_nenhum_
