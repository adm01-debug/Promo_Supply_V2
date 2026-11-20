# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

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

