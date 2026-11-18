# public.audit_logs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `user_email` | `text` | sim |  |  |  |
| 4 | `user_name` | `text` | sim |  |  |  |
| 5 | `action_type` | `audit_action_type` | não |  |  |  |
| 6 | `entity_type` | `audit_entity_type` | não |  |  |  |
| 7 | `entity_id` | `text` | sim |  |  |  |
| 8 | `entity_description` | `text` | sim |  |  |  |
| 9 | `old_values` | `jsonb` | sim |  |  |  |
| 10 | `new_values` | `jsonb` | sim |  |  |  |
| 11 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 12 | `ip_address` | `text` | sim |  |  |  |
| 13 | `user_agent` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `organization_id` | `uuid` | sim |  |  |  |
| 16 | `tenant_id` | `uuid` | não |  |  |  |
| 17 | `sequencia` | `bigint` | não | `0` |  | Posicao na cadeia de integridade. Preenchida pelo trigger z_audit_logs_hash; o DEFAULT 0 e sentinela e nunca persiste. |
| 18 | `hash_anterior` | `text` | não | `'PENDENTE'::text` |  | Hash do registro anterior da cadeia (GENESIS no primeiro). Preenchida pelo trigger z_audit_logs_hash; o DEFAULT e sentinela e nunca persiste. |
| 19 | `registro_hash` | `text` | não | `'PENDENTE'::text` |  | SHA-256 do conteudo canonico + hash_anterior. Preenchida pelo trigger z_audit_logs_hash; o DEFAULT e sentinela e nunca persiste. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_logs_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |
| audit_logs_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| audit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_logs_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id, created_at)` |
| audit_logs_sequencia_uidx | btree | sequencia | sim | sim |  | `CREATE UNIQUE INDEX audit_logs_sequencia_uidx ON public.audit_logs USING btree (sequencia)` |
| idx_audit_logs_action_type | btree | action_type | não | sim |  | `CREATE INDEX idx_audit_logs_action_type ON public.audit_logs USING btree (action_type)` |
| idx_audit_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC)` |
| idx_audit_logs_entity_id | btree | entity_id | não | sim |  | `CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs USING btree (entity_id)` |
| idx_audit_logs_entity_type | btree | entity_type | não | sim |  | `CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type)` |
| idx_audit_logs_entity_type_id | btree | entity_type, entity_id | não | sim |  | `CREATE INDEX idx_audit_logs_entity_type_id ON public.audit_logs USING btree (entity_type, entity_id)` |
| idx_audit_logs_org_created | btree | organization_id, created_at | não | sim |  | `CREATE INDEX idx_audit_logs_org_created ON public.audit_logs USING btree (organization_id, created_at DESC)` |
| idx_audit_logs_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_audit_logs_tenant ON public.audit_logs USING btree (tenant_id)` |
| idx_audit_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id)` |


## Policies (RLS)

### `Admins can view all audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `authenticated_insert_audit_logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (auth.uid() IS NOT NULL))` |

### `tenant_isolation_audit_logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| tr_enforce_audit_integrity | BEFORE | INSERT | ROW | enabled | public.enforce_audit_integrity |
| trg_sanitize_audit_metadata | BEFORE | INSERT | ROW | enabled | public.sanitize_audit_metadata |
| z_audit_logs_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_logs_bloquear_alteracao |
| z_audit_logs_hash | BEFORE | INSERT | ROW | enabled | public.audit_logs_encadear_hash |
| z_audit_logs_no_truncate | BEFORE | TRUNCATE | STATEMENT | enabled | public.audit_logs_bloquear_truncate |


## Grants

| role | privilégios |
|---|---|
| anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER |
| authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, UPDATE |
