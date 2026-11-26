# 08. Segurança e RLS

## Modelo de identidade

```text
auth.users
  └── profiles (1:1, dados públicos do usuário; tenant_id "padrão")
  └── user_roles (N: papéis app_role)
  └── user_organizations (N: vínculo à organização)
  └── user_tenants (N:N com tenants dentro da organização)
```

- **Roles (`app_role`):** `admin | coordinator | buyer | finance | viewer`.
- **Regra de ouro:** roles ficam em `user_roles`, nunca em `profiles`. Escalada de privilégio via `profiles.role` é impossível.

## Camadas de defesa

1. **JWT Supabase** — validado no client + em toda edge function via `getAuthUser`.
2. **RLS Postgres** — habilitada em **100% das tabelas `public`**.
3. **GRANTs explícitos** — toda tabela criada precisa de `GRANT` correspondente aos roles (`authenticated`, `service_role`); sem `GRANT`, RLS não basta.
4. **`SECURITY DEFINER` mínimo** — apenas em helpers auditados; `EXECUTE` revogado de `PUBLIC/anon/authenticated`.
5. **Rate limit** — RPC `check_rate_limit` chamada por `_shared/rate_limit.ts` em edges sensíveis.
6. **Idempotência de webhooks** — tabela `webhook_events` + `_shared/idempotency.ts`.
7. **Sanitização** — `DOMPurify` no frontend (`src/lib/security.ts`), redação de segredos no logger (`_shared/logger.ts`).

## Helpers RLS (SECURITY DEFINER)

| Função | O que faz |
|---|---|
| `has_role(_user_id uuid, _role app_role)` | `EXISTS` em `user_roles`. Base para ~111 policies. |
| `tenant_in_my_group(_tenant_id uuid)` | Verifica se `_tenant_id` pertence a alguma organização à qual o usuário pertence. Base para ~77 policies (isolamento multi-tenant). |
| `tenants_in_my_group()` | Lista de tenants acessíveis. |
| `current_tenant_id()` | Extrai `tenant_id` do JWT / sessão. |
| `get_my_organization()` | `organization_id` do usuário. |
| `user_belongs_to_tenant(uid, tenant_id)` | Checagem de vínculo direto. |
| `has_permission(module, action)` | Checagem granular via `role_permissions`. |

Uso típico em policy:
```sql
CREATE POLICY tenant_isolation_pedidos
  ON public.pedidos FOR ALL
  TO authenticated
  USING (tenant_in_my_group(tenant_id))
  WITH CHECK (tenant_in_my_group(tenant_id));
```

## Padrões de policy encontrados

- **Isolamento por tenant (dominante):** `USING/WITH CHECK: tenant_in_my_group(tenant_id)`.
- **Controle por papel:** em tabelas críticas (`pagamentos`, `pedidos`, `user_roles`) empilha `has_role(auth.uid(), 'admin'|'finance'|...)`.
- **Legado por organização:** algumas tabelas ainda têm policy antiga `organization_id = get_my_organization()` coexistindo com a nova baseada em `tenant_in_my_group` — defesa em profundidade, mas com dívida de simplificação.
- **`user_roles`:** apenas admin pode gerenciar todos; usuário comum só vê os próprios (`auth.uid() = user_id`).
- **Audit trail:** `audit_logs` visível a admin (todos) e a usuários da própria org; `enforce_audit_integrity` (trigger BEFORE INSERT) bloqueia burla.

## Constraints estruturais anti-race
- **`approval_delegations`**: `EXCLUDE USING gist ((delegante_id, tenant_id) WITH =, tstzrange(data_inicio, data_fim) WITH &&)` — bloqueia delegações sobrepostas no banco. Requer extensão `btree_gist`.

## Autenticação avançada
- **WebAuthn / Passkey**: edges `webauthn-register` / `webauthn-authenticate`, tabelas `webauthn_credentials` + `webauthn_challenges` (TTL 5min).
- **MFA**: `mfa_settings` + `useMFA`.
- **SSO / SCIM 2.0**: `sso_configurations` + edge `scim-v2` (Bearer SCIM comparado com SHA-256 constant-time).
- **Geo-restrição**: `allowed_countries`, `blocked_countries`, `blocked_ips`, `ip_whitelist`, `geo_access_logs`, edge middleware.
- **Account lockout**: `account_lockouts` + `useAccountLockout` (5 falhas em 15min bloqueia).
- **HIBP** (haveibeenpwned) — proteção de senha vazada configurada no Auth do Cloud.

## Storage
- Buckets: `fiscal-documents`, `comprovantes`, `documentos`.
- Path pattern: `{tenantId}/{userId}/...` (migrado do legado `{userId}/...` via edge `migrate-storage-paths`).
- RLS de `storage.objects` restringe leitura/escrita por owner + tenant.

## Auditoria proativa
- Edge `run-audit` varre `pg_policies` procurando policies fracas (ex.: `USING (true)` sem `tenant_id`).
- Trigger `audit_user_roles_changes` (função existe; confirmar attach) registra mudanças de papel.
- Trigger `sanitize_audit_metadata` remove PII de logs.

## Riscos conhecidos e mitigações
| Risco | Mitigação |
|---|---|
| Edges sem `verify_jwt` (`run-audit`, `system-simulation`, `process-invoice-idp`) | Restringir por rede/env; adicionar checagem manual no handler. |
| `external-db-bridge` sem allowlist | Adicionar `Zod` + allowlist de tabelas. |
| Triggers duplicados (double-fire) | Auditar `pg_trigger.tgenabled` e remover legados. |
| Cache `localStorage` cross-user | `PersistGate` usa `buster: user.id` → cache invalidado ao trocar. |
