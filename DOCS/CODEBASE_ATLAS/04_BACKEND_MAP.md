# 04. Backend Map (Supabase / Postgres)

**Totais:** 123 tabelas em `public` · 206 funções de domínio · 281 FKs · 90 funções `SECURITY DEFINER`.

## Tabelas por domínio

Legenda: **T** = tem `tenant_id` · **O** = tem `organization_id` · **S** = tem `status` · **Pol** = nº de policies RLS.

### 🔐 Auth / RBAC
| Tabela | Propósito | T/O/S | Pol |
|---|---|---|---|
| `user_roles` | Papéis (`app_role`) por usuário. **Nunca colocar role em `profiles`.** | -/-/- | 2 |
| `role_permissions` | Papel → permissão granular | -/-/- | 2 |
| `permissions` | Catálogo de permissões | -/-/- | 2 |
| `profiles` | Perfil do usuário (org/tenant padrão) | T/-/- | 6 |
| `mfa_settings` | Config MFA | -/-/- | 1 |
| `webauthn_credentials` / `webauthn_challenges` | Passkeys | -/-/- | 4/3 |
| `sso_configurations` | SSO por tenant | T/-/- | 1 |
| `scim_provisioning_log` | Log SCIM | T/-/S | 1 |
| `password_reset_requests` | Reset de senha | -/-/S | 5 |
| `account_lockouts` / `login_attempts` | Bloqueio e histórico | -/-/- | 2/2 |

### 🏢 Multi-tenant
| Tabela | Propósito | T/O/S |
|---|---|---|
| `organizations` | Grupo econômico (raiz) | -/-/- |
| `tenants` | Empresa / CNPJ | -/O/S |
| `user_tenants` | Vínculo N:N usuário↔tenant | T/-/- |
| `user_organizations` | Vínculo usuário↔organização | -/O/- |

### 🛒 Compras / Cotações / Pedidos
`solicitacoes` (T/O/S, 6 pol) · `cotacoes` (T/O/S, 3) · `pedidos` (T/O/S, 4) · `pedido_itens` (T, 3) · `devolucoes` / `devolucao_itens` (T/S, 3/3) · `receiving_checklists` (T/S, 3) · `repurchase_suggestions` (T/S, 2) · `spot_pedidos` / `spot_sessions` (S/-, 2/1) · `categorias` (T/O, 5) · `category_strategies` (T/O, 3) · `produtos` (T/O, 4) · `produto_fornecedores` (T/O, 2) · `unspsc_codes` (T, 1) · `negotiation_analyses` (-, 2) · `cost_centers` (T, 2) · `licitacoes` (T/O/S, 3) · `licitacao_lances` (-, 1) · `licitacao_propostas` (T, 2) · `auction_bids` (T/S, 1).

### 💰 Financeiro / Pagamentos
`pagamentos` (T/O/S, 4 pol) · `payment_history` (T, 2) · `creditos_fornecedor` (T/S, 2) · `budget_transactions` (T, 2) · `budget_audit_logs` (-, 1) · `department_budgets` (T/O, 6) · `financial_audit_logs` (-, 1) · `currencies` / `exchange_rates` (-, 1) · `spend_forecasts` (T/O, 2) · `savings_tracker` (T, 1) · `aliquotas_tributarias` (O, 2).

### 🧾 Fiscal
`fiscal_documents` (T/O/S, 4) · `fiscal_events` (T/S, 1).

### ✅ Workflow / Aprovações
`approval_workflows` (T/O/S, 6) · `approval_rules` (T/O, 5) · `approval_steps` (T/O/S, 4) · `approval_history` (T, 3) · `approval_hierarchy` (T, 2) · `approval_delegations` (T/O, 6) — **com `EXCLUDE` constraint `btree_gist` sobre `tstzrange` para bloquear delegações sobrepostas** · `workflow_templates|nodes|edges` (T, 1 cada) · `workflow_instances` (T/S, 1) · `workflow_tasks` (T/S, 1) · `workflow_approvals` (T/S, 1) · `workflow_audit_log` / `workflow_logs` (T, 1 cada) · `workflow_sod_rules` (T, 1) · `penalty_escalation_config` (T, 3).

### 📦 Estoque
`estoque` (O, 2) · `estoque_movimentacoes` (O, 2).

### 🏭 Fornecedores
`fornecedores` (T/O/S, 3) · `fornecedor_categorias` (T, 1) · `contact_notes` (T, 5) · `supplier_documents` (T/S, 3) · `supplier_qualification_scores` (T, 3) · `supplier_bonifications` (T, 3) · `qualification_history` / `qualification_requirements` (-, 2/2).

### 📄 Contratos
`contracts` (T/O/S, 5) · `contract_items` (T, 3) · `contract_documents` (T, 3) · `contract_history` (T, 3) · `contract_penalties` (T/S, 3) · `order_contracts` (T, 3).

### 🎯 Sourcing
`sourcing_projects` (T/S, 1) · `sourcing_events` (T/O/S, 1) · `sourcing_event_lots|criteria|questions` (T, 1) · `sourcing_invitations` (T/S, 1) · `sourcing_responses` (+ items, answers) (T, 1) · `sourcing_awards` (T, 1) · `sourcing_pipeline` (T/O/S, 3).

### 📡 Observabilidade / Telemetria
`audit_logs` (T/O, 5) · `query_telemetry` (-, 2) · `telemetry_logs` (T, 2) · `dependency_health` / `dependency_health_history` (-, 2/2) · `system_alerts` (T, 1) · `dashboard_filter_favorites` (O, 10) · `dashboard_layouts` (-, 3) · `user_filter_preferences` / `user_tour_preferences` (-, 4/4).

### 🔒 Segurança
`security_logs` (-, 2) · `geo_access_logs` / `geo_settings` (-, 2/2) · `allowed_countries` / `blocked_countries` / `blocked_ips` / `ip_whitelist` (2 cada) · `rate_limit_logs` (-, 2) · `active_sessions` (T, 7).

### 🔌 Integrações
`erp_connections` / `erp_field_mappings` / `erp_sync_log` (T, 1 cada; log com S) · `integration_outbox` (T/S, 3) · `punchout_catalogs` / `punchout_sessions` (T/S sessions, 1/1) · `webhook_events` (S, 1) — idempotência.

### 🔔 Notificações
`notifications` (T, 4) · `notification_preferences` (-, 1) · `push_subscriptions` (-, 1).

## Funções SQL (agrupadas)

### Helpers RLS (SECURITY DEFINER)
| Função | Uso |
|---|---|
| `has_role(user_id, role)` | ~111 policies |
| `tenant_in_my_group(tenant_id)` | ~77 policies |
| `tenants_in_my_group()` | lista tenants do grupo |
| `current_tenant_id()` | tenant do JWT/sessão |
| `get_my_organization()` | organization_id do usuário |
| `get_user_grupo_id()`, `get_user_role()`, `has_permission()`, `user_belongs_to_tenant()` | Helpers de contexto |

`EXECUTE` revogado de `PUBLIC/anon/authenticated`; concedido apenas onde necessário.

### Scanners DBA (observabilidade proativa)
`scan_dangerous_statements`, `scan_duplicate_indexes`, `scan_fk_without_cascade`, `scan_long_running_transactions`, `scan_partition_candidates`, `scan_sequence_exhaustion`, `scan_table_bloat`, `scan_unused_indexes` — cada um agendado via `pg_cron` para gerar alertas em `system_alerts` (ver doc 09).

### Watchdogs
`cron_watchdog()`, `pg_activity_watchdog()`, `alert_on_outbox_dead()`, `check_telemetry_alerts()`, `check_escalation()`.

### Limpezas (`cleanup_old_*`, candidatas a cron)
`cleanup_expired_challenges`, `cleanup_old_audit_logs`, `cleanup_old_geo_access_logs`, `cleanup_old_integration_outbox`, `cleanup_old_login_attempts`, `cleanup_old_query_telemetry`, `cleanup_old_rate_limit_logs`, `cleanup_old_security_logs`, `cleanup_old_system_alerts`, `cleanup_old_telemetry(_logs)`, `cleanup_old_webhook_events`.

### RPCs de negócio
`generate_sequential_number`, `check_budget_availability`, `check_workflow_sod`, `get_pedidos_kpis`, `get_solicitacoes_kpis`, `check_rate_limit`, `log_security_event`, `log_login_attempt`.

## Triggers destacados

| Tabela | Trigger | Efeito |
|---|---|---|
| `audit_logs` | `tr_enforce_audit_integrity` (BEFORE INSERT) | Impede burla de audit trail |
| | `sanitize_audit_metadata_trigger` (BEFORE INSERT) | Redige campos sensíveis |
| `pagamentos` | `audit_pagamentos_trigger` (AFTER) | Grava audit |
| | `sync_budget_payment_trigger` (AFTER I/U) | Realiza gasto no orçamento |
| | `trg_validate_pagamento_status` (BEFORE UPDATE) | Valida máquina de estados |
| `pedidos` | `trg_auto_create_pagamento_on_delivery` | Cria linha em `pagamentos` |
| | `trg_auto_penalty_on_late_delivery` | 0,5%/dia, cap 20% |
| | `trg_auto_update_supplier_score` | Atualiza score do fornecedor |
| | `trg_pedido_budget_sync` | Reserva orçamento |
| Normalizações | `normalize_email_lowercase`, `normalize_cnpj_digits` (módulo 11), `normalize_phone_br` (E.164) | Em tabelas críticas |

> **Nota de dívida técnica:** vários triggers têm nomes duplicados (`trg_*` e nome sem prefixo) chamando a mesma função — provável legado de migrações. Revisar `pg_trigger.tgenabled` para evitar double-fire.

## pg_cron

O usuário `sandbox_exec` não tem `USAGE` no schema `cron`. A lista real de `jobname/schedule/command` está no painel do Cloud (Database → Cron Jobs). Jobs conhecidos por convenção e implantação:

| Nome | Cron | Efeito |
|---|---|---|
| `alert-dispatcher-1min` | `* * * * *` | Envia `system_alerts` HIGH/CRITICAL ao Slack |
| `scan-unused-indexes-daily` | `15 3 * * *` | Detecta índices >10MB sem scans |
| `scan-table-bloat-6h` | a cada 6h | Dead tuples >20% em tabelas hot |
| `scan-sequence-exhaustion-daily` | `0 4 * * *` | Overflow de sequences int/bigint |
| `scan-fk-without-cascade-weekly` | seg 05:00 UTC | FKs sem CASCADE/RESTRICT explícito |
| `scan-duplicate-indexes-weekly` | ter 05:30 UTC | Índices redundantes |
| `scan-partition-candidates-weekly` | qua 06:00 UTC | Tabelas >10GB candidatas a partitioning |
| `scan-long-running-transactions-10min` | a cada 10min | Transações idle > 10min, active > 30min |
| `check-approval-escalations` | horário | Escalona aprovações vencidas |
| `check-sla-alerts`, `check-cotacao-followup`, `check-expiry-alerts` | horário | Alertas de SLA/vencimento |
| `weekly-report`, `weekly-summary-report` | semanal | Resumos executivos |
| `process-outbox` | contínuo | Worker do outbox pattern |
| `cleanup_old_*` | diários | Retenção de logs |

Ver `DOCS/AUDITORIA_BACKEND.md` e `DOCS/MELHORIAS_PENDENTES.md` para histórico das implantações.
