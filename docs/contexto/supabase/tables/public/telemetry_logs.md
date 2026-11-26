# public.telemetry_logs

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
| telemetry_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_telemetry_logs_created | brin | created_at | não | sim |  | `CREATE INDEX brin_telemetry_logs_created ON public.telemetry_logs USING brin (created_at)` |
| idx_telemetry_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_telemetry_logs_created_at ON public.telemetry_logs USING btree (created_at DESC)` |
| idx_telemetry_logs_level | btree | level | não | sim |  | `CREATE INDEX idx_telemetry_logs_level ON public.telemetry_logs USING btree (level)` |
| idx_telemetry_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_telemetry_logs_user_id ON public.telemetry_logs USING btree (user_id)` |
| telemetry_logs_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX telemetry_logs_pkey ON public.telemetry_logs USING btree (id, created_at)` |


## Policies (RLS)

### `Admins can view telemetry logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text))))` |
| WITH CHECK |  |

### `authenticated_insert_telemetry_logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

### `tenant_isolation_telemetry_logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) OR (tenant_id = get_user_grupo_id()))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) OR (tenant_id = get_user_grupo_id()))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| trigger_check_telemetry_alerts | AFTER | INSERT | ROW | enabled | public.check_telemetry_alerts |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
