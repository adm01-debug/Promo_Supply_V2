# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-25 11:13 UTC

- **functions** alterado (3): `public.get_my_organization()`, `public.has_role(_user_id uuid, _role app_role)`, `public.tenant_in_my_group(_tenant_id uuid)`
- **lints** adicionado (4): `policy_auth_fn_not_wrapped:public.category_strategies.category_strategies_escrita_admin_coord`, `policy_auth_fn_not_wrapped:public.category_strategies.tenant_isolation`, `policy_auth_fn_not_wrapped:public.notifications.Users can delete their own notifications`, `policy_auth_fn_not_wrapped:public.notifications.tenant_isolation_notifications`
- **migrations** adicionado (322): `20250102000000_compras_production`, `20251216162747_c7d5b816-cc67-4a20-8eac-aeda17c1db98`, `20251216163227_7109e99a-58a4-48de-8bce-f05daa6d8de3`, `20251216163235_f88e3e2e-dbcc-4c94-825f-ba624bdf9699`, `20251216175601_09bef357-a53c-430f-a804-87ffa2032908`, `20251220142204_16a9bb4a-ce42-4aaf-9de3-10f0ad0e2343`, `20251220145628_690ef073-d843-45ed-95d3-7b3158d2a0e9`, `20251220181110_c3da115e-7cad-4dc4-b147-3b888d4c332e`, `20251231120356_3ae6d121-b315-421d-a18c-f2155c8f692f`, `20251231124623_0e87b288-4dd1-4c9f-a749-9521063fc8e9`, `20251231124632_ea8bac6c-d56e-4396-8c99-c1eb772c63c6`, `20251231131007_37368865-d1b2-49cf-b292-2d7eefd5842f`, `20251231131344_91120ebc-5790-48f7-8136-586a54120751`, `20251231132431_1b93121d-151b-4729-a7b4-31449aa836e9`, `20260107172217_de06dea9-cebf-4340-afb0-58240cc1305f`, `20260108121914_c65220f2-3087-4c98-8977-516da335701e`, `20260108121940_53728049-5423-4b02-bbf0-c7933111258a`, `20260108200215_37789714-fc43-4f82-bf80-ec23f5221216`, `20260111025047_ef19eb03-bc15-4917-87a8-f230df328ef2`, `20260305235141_fb0a94fe-0f86-4435-b5ef-211b31315d40`, `20260305235259_6352128a-66c0-4236-b4ef-0533ffe26b4a`, `20260306002711_53c14912-5d65-4bbb-bc3e-d9bca734770b`, `20260314200210_522a5d31-0ebd-4623-a88a-386d4b76b4df`, `20260314200709_bea0cf6c-6af4-4936-a667-9edc8d986d7b`, `20260314201406_4a72b2f1-149a-4a09-a5f5-1f29b5ac9eb4`, `20260314201641_3ab6905f-02a0-4547-8557-94be6328f16e`, `20260315143051_bc8cf5e2-b51a-4c11-8f01-e3a59649063e`, `20260315150226_a87f820e-b073-45d2-8637-5fbb0dc5fbb9`, `20260315150651_927a71bc-ebad-480f-b1c4-efe83c949cc4`, `20260315151013_dfff8719-f695-4626-98f6-1380350d5d9a`, `20260315151408_8ffa629b-ebf8-41cd-a770-8b0d78746e04`, `20260315151901_0b81998e-797d-4956-96dd-95829ea06c24`, `20260315164635_39bb111c-4995-4b60-ab28-3f83a84b78e2`, `20260315173730_7339fd92-4c67-404b-8051-3157db7a50bc`, `20260315223230_eeba531f-0b98-4764-b2a4-213d214e6494`, `20260315223242_169684f3-beec-4caa-9566-70e5fadf7676`, `20260317185335_36f3a1e4-58fc-4edd-9d74-2716b579b366`, `20260317192813_fdf8b9ee-e383-42f2-9b2c-ed0b62e83734`, `20260317200943_0aa56f87-1df6-402d-8e21-1621b37baeb0`, `20260317201619_b1fdf364-9772-43d4-a769-7e51c33cc5eb` … (+282)
- **policies (RLS)** adicionado (3): `public.category_strategies.category_strategies_escrita_admin_coord`, `public.notifications.Users can delete their own notifications`, `public.notifications.notificacoes_thread_followup_cotacao`
- **policies (RLS)** alterado (2): `public.category_strategies.tenant_isolation`, `public.notifications.tenant_isolation_notifications`

## 2026-11-24 22:11 UTC

- **functions** alterado (1): `public._invoke_edge_function(_name text)`

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

