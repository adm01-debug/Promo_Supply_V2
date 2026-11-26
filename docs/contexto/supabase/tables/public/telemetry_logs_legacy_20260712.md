# public.telemetry_logs_legacy_20260712

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 3 | `level` | `log_level` | não |  |  |  |
| 4 | `message` | `text` | não |  |  |  |
| 5 | `context` | `jsonb` | sim |  |  |  |
| 6 | `request_id` | `uuid` | sim |  |  |  |
| 7 | `user_id` | `uuid` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `url` | `text` | sim |  |  |  |
| 10 | `client_ip` | `text` | sim |  |  |  |
| 11 | `tenant_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| telemetry_logs_legacy_20260712_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| telemetry_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_telemetry_logs_legacy_created | brin | created_at | não | sim |  | `CREATE INDEX brin_telemetry_logs_legacy_created ON public.telemetry_logs_legacy_20260712 USING brin (created_at)` |
| idx_telemetry_logs_legacy_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_telemetry_logs_legacy_created_at ON public.telemetry_logs_legacy_20260712 USING btree (created_at DESC)` |
| idx_telemetry_logs_legacy_level | btree | level | não | sim |  | `CREATE INDEX idx_telemetry_logs_legacy_level ON public.telemetry_logs_legacy_20260712 USING btree (level)` |
| idx_telemetry_logs_legacy_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_telemetry_logs_legacy_user_id ON public.telemetry_logs_legacy_20260712 USING btree (user_id)` |
| telemetry_logs_legacy_20260712_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX telemetry_logs_legacy_20260712_pkey ON public.telemetry_logs_legacy_20260712 USING btree (id)` |


## Policies (RLS)

### `Admins can view telemetry logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text))))` |
| WITH CHECK |  |

### `admin_read_partition`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) AND tenant_in_my_group(tenant_id))` |
| WITH CHECK |  |

### `admins_read_legacy_telemetry`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `authenticated_insert_telemetry_logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

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
