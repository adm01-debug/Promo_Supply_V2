# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

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

