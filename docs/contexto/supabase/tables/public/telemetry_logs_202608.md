# public.telemetry_logs_202608

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
| telemetry_logs_202608_pkey | PRIMARY KEY | `PRIMARY KEY (id, created_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| telemetry_logs_202608_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX telemetry_logs_202608_created_at_idx ON public.telemetry_logs_202608 USING btree (created_at DESC)` |
| telemetry_logs_202608_created_at_idx1 | brin | created_at | não | sim |  | `CREATE INDEX telemetry_logs_202608_created_at_idx1 ON public.telemetry_logs_202608 USING brin (created_at)` |
| telemetry_logs_202608_level_idx | btree | level | não | sim |  | `CREATE INDEX telemetry_logs_202608_level_idx ON public.telemetry_logs_202608 USING btree (level)` |
| telemetry_logs_202608_pkey | btree | id, created_at | sim | sim |  | `CREATE UNIQUE INDEX telemetry_logs_202608_pkey ON public.telemetry_logs_202608 USING btree (id, created_at)` |
| telemetry_logs_202608_user_id_idx | btree | user_id | não | sim |  | `CREATE INDEX telemetry_logs_202608_user_id_idx ON public.telemetry_logs_202608 USING btree (user_id)` |


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

### `tenant_isolation_telemetry_logs_202608`

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
| anon | INSERT, MAINTAIN, SELECT |
| authenticated | INSERT, MAINTAIN, SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
