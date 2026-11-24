# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-24 21:12 UTC

- **functions** alterado (4): `public.get_cost_center_performance_report()`, `public.get_cost_center_performance_report(p_organization_id uuid)`, `public.get_user_grupo_id()`, `public.tenant_in_my_group(_tenant_id uuid)`

## 2026-11-24 17:12 UTC

- **functions** alterado (4): `public.tenant_in_my_group(_tenant_id uuid)`, `public.validate_cotacao_status_transition()`, `public.validate_pagamento_status_transition()`, `public.validate_pedido_status_transition()`
- **triggers** removido (1): `public.pedidos.trg_validate_pedido_status`

## 2026-11-24 16:14 UTC

- **functions** alterado (2): `public.find_approval_rule(p_valor numeric, p_categoria_id uuid)`, `public.tenant_in_my_group(_tenant_id uuid)`

## 2026-11-24 15:12 UTC

- **functions** adicionado (1): `public.assign_numero_solicitacao()`
- **functions** alterado (1): `public.generate_sequential_number(prefix text, table_name text)`
- **triggers** adicionado (1): `public.solicitacoes.trg_assign_numero_solicitacao`

## 2026-11-24 04:19 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_27`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_20`

## 2026-11-24 00:29 UTC

- **colunas** adicionado (1): `public.solicitacoes.external_ref`
- **functions** alterado (1): `public.validate_pagamento_status_transition()`
- **indexes** adicionado (1): `public.idx_solicitacoes_external_ref`

## 2026-11-23 22:12 UTC

- **functions** alterado (1): `public.generate_sequential_number(prefix text, table_name text)`

## 2026-11-23 20:12 UTC

- **functions** adicionado (1): `public.get_my_permissions()`
- **functions** alterado (3): `public.generate_sequential_number(prefix text, table_name text)`, `public.get_compras_sla_metrics(p_organization_id uuid, p_period text, p_category_id uuid, p_supplier_id uuid)`, `public.get_user_grupo_id()`

## 2026-11-23 12:31 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_26`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_19`

## 2026-11-22 19:10 UTC

- **functions** adicionado (1): `public.get_compras_sla_metrics(p_organization_id uuid, p_period text, p_category_id uuid, p_supplier_id uuid)`
- **functions** alterado (1): `public.get_user_grupo_id()`

## 2026-11-22 14:11 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_18`

## 2026-11-22 13:11 UTC

- **functions** alterado (2): `public.cron_watchdog()`, `public.resolve_stale_system_error_alerts()`
- **indexes** adicionado (1): `public.idx_solicitacoes_pim_product_id`

## 2026-11-22 12:16 UTC

- **colunas** adicionado (3): `public.cron_watchdog_seen.first_seen`, `public.cron_watchdog_seen.jobid`, `public.cron_watchdog_seen.jobname`
- **constraints** adicionado (1): `public.cron_watchdog_seen.cron_watchdog_seen_pkey`
- **cron jobs** adicionado (1): `123:cron-watchdog-15min`
- **functions** adicionado (1): `public.resolve_stale_system_error_alerts()`
- **functions** alterado (4): `public._invoke_xbz_sync()`, `public.check_telemetry_alerts()`, `public.cron_watchdog()`, `public.xbz_sync_watchdog()`
- **grants** adicionado (1): `public.cron_watchdog_seen:service_role`
- **indexes** adicionado (1): `public.cron_watchdog_seen_pkey`
- **lints** adicionado (1): `rls_no_policies:public.cron_watchdog_seen`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_25`
- **tabelas** adicionado (1): `public.cron_watchdog_seen`

## 2026-11-21 23:10 UTC

- **cron jobs** adicionado (2): `121:spot-api-sync-orders-30min`, `122:spot-api-sync-stock`
- **cron jobs** removido (1): `33:spot-api-sync-stock`
- **functions** alterado (1): `public._invoke_spot_sync(_action text)`

## 2026-11-21 19:09 UTC

- **colunas** adicionado (9): `public.estoque.pim_product_id`, `public.pedido_itens.codigo_fornecedor`, `public.pedido_itens.ipi_rate`, `public.pedido_itens.ncm`, `public.pedido_itens.pim_product_id`, `public.pedido_itens.pim_variant_id`, `public.repurchase_suggestions.pim_product_id`, `public.solicitacoes.pim_product_id`, `public.solicitacoes.pim_variant_id`
- **functions** alterado (1): `public._invoke_edge_function(_name text)`
- **indexes** adicionado (1): `public.idx_pedido_itens_pim_product_id`

## 2026-11-21 17:41 UTC

- **cron jobs** adicionado (8): `113:alert-dispatcher-1min`, `114:approval-escalation-check`, `115:contract-expiry-check`, `116:cotacao-followup-check`, `117:expiry-alerts-check`, `118:sla-alerts-check`, `119:weekly-procurement-report`, `120:weekly-summary-report-job`
- **functions** alterado (1): `public._invoke_edge_function(_name text)`

## 2026-11-21 16:12 UTC

- **functions** alterado (2): `public._invoke_edge_function(_name text)`, `public.cron_watchdog()`

## 2026-11-21 14:11 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_17`

## 2026-11-21 12:17 UTC

- **cron jobs** adicionado (1): `112:xbz-sync-pedidos-30min`
- **cron jobs** removido (1): `23:xbz-sync-pedidos-30min`
- **functions** alterado (1): `public._invoke_xbz_sync()`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_24`

## 2026-11-20 22:11 UTC

- **functions** alterado (1): `public.has_role(_user_id uuid, _role app_role)`

## 2026-11-20 18:15 UTC

- **migrations** adicionado (10): `20261117150000_religa_cadastro_de_usuarios`, `20261117160000_indices_nunca_aplicados`, `20261117162000_auditoria_preserva_autoria`, `20261117170000_corrige_alertas_sistema_e_agenda_scan_particoes`, `20261117180000_popula_etapas_dos_templates_de_workflow`, `20261117190000_remove_cleanup_old_audit_logs_quebrado`, `20261117200000_telemetria_retencao_unica_90_dias`, `20261117210000_audit_logs_append_only_hash_encadeado`, `20261117220000_audit_logs_hash_defaults`, `20261117230000_retencao_fonte_unica`

## 2026-11-20 17:10 UTC

- **functions** adicionado (1): `public.auto_transition_solicitacao_on_workflow_approved()`
- **migrations** adicionado (1): `20261120120000_fio2_workflow_approved_promove_solicitacao`
- **triggers** adicionado (1): `public.approval_workflows.trg_workflow_approved_promotes_solicitacao`

## 2026-11-20 04:14 UTC

- **realtime** removido (2): `supabase_realtime_messages_publication:realtime.messages_2026_11_15`, `supabase_realtime_messages_publication:realtime.messages_2026_11_16`

## 2026-11-20 00:45 UTC

- **realtime** adicionado (2): `supabase_realtime_messages_publication:realtime.messages_2026_11_22`, `supabase_realtime_messages_publication:realtime.messages_2026_11_23`

## 2026-11-19 12:17 UTC

- **lints** adicionado (1): `policy_auth_fn_not_wrapped:public.entity_versions.Authenticated can insert versions`
- **lints** removido (1): `policy_auth_fn_not_wrapped:public.entity_versions.Users can insert versions`
- **migrations** adicionado (1): `20261119000000_entity_versions_politicas_authenticated`
- **policies (RLS)** adicionado (2): `public.entity_versions.Authenticated can insert versions`, `public.entity_versions.Authenticated can view versions`
- **policies (RLS)** removido (2): `public.entity_versions.Users can insert versions`, `public.entity_versions.Users can view versions`

## 2026-11-18 19:10 UTC

- Snapshot inicial.

