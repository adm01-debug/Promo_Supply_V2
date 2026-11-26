# public.audit_logs_202606

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
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


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_logs_202606_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |
| audit_logs_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| audit_logs_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| audit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_logs_202606_action_type_idx | btree | action_type | não | sim |  | `CREATE INDEX audit_logs_202606_action_type_idx ON public.audit_logs_202606 USING btree (action_type)` |
| audit_logs_202606_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX audit_logs_202606_created_at_idx ON public.audit_logs_202606 USING btree (created_at DESC)` |
| audit_logs_202606_entity_id_idx | btree | entity_id | não | sim |  | `CREATE INDEX audit_logs_202606_entity_id_idx ON public.audit_logs_202606 USING btree (entity_id)` |
| audit_logs_202606_entity_type_entity_id_idx | btree | entity_type, entity_id | não | sim |  | `CREATE INDEX audit_logs_202606_entity_type_entity_id_idx ON public.audit_logs_202606 USING btree (entity_type, entity_id)` |
| audit_logs_202606_entity_type_idx | btree | entity_type | não | sim |  | `CREATE INDEX audit_logs_202606_entity_type_idx ON public.audit_logs_202606 USING btree (entity_type)` |
| audit_logs_202606_organization_id_created_at_idx | btree | organization_id, created_at | não | sim |  | `CREATE INDEX audit_logs_202606_organization_id_created_at_idx ON public.audit_logs_202606 USING btree (organization_id, created_at DESC)` |
| audit_logs_202606_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX audit_logs_202606_pkey ON public.audit_logs_202606 USING btree (id, created_at)` |
| audit_logs_202606_tenant_id_idx | btree | tenant_id | não | sim |  | `CREATE INDEX audit_logs_202606_tenant_id_idx ON public.audit_logs_202606 USING btree (tenant_id)` |
| audit_logs_202606_user_id_idx | btree | user_id | não | sim |  | `CREATE INDEX audit_logs_202606_user_id_idx ON public.audit_logs_202606 USING btree (user_id)` |


## Policies (RLS)

### `admin_read_partition`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) AND tenant_in_my_group(tenant_id))` |
| WITH CHECK |  |

### `service_role_all_partition`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | INSERT, MAINTAIN, SELECT |
| authenticated | INSERT, MAINTAIN, SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
