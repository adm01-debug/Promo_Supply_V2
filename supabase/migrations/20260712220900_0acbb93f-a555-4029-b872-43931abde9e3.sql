
-- Onda 58: drop de índices duplicados (preserva UNIQUE/PK e nome canônico)
DROP INDEX IF EXISTS public.idx_account_lockouts_email;
DROP INDEX IF EXISTS public.idx_blocked_ips_ip;
DROP INDEX IF EXISTS public.idx_contracts_tenant;
DROP INDEX IF EXISTS public.idx_cost_centers_tenant;
DROP INDEX IF EXISTS public.idx_pedidos_org;
DROP INDEX IF EXISTS public.idx_punchout_sessions_cookie;
DROP INDEX IF EXISTS public.idx_solicitacoes_org;
DROP INDEX IF EXISTS public.idx_telemetry_logs_created;
DROP INDEX IF EXISTS public.idx_tenants_slug;
DROP INDEX IF EXISTS public.idx_ufp_user_scope;
DROP INDEX IF EXISTS public.idx_webauthn_credentials_credential_id;
