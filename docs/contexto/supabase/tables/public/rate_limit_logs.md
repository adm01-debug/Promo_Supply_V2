# public.rate_limit_logs

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
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `endpoint` | `text` | não |  |  |  |
| 4 | `request_count` | `integer` | não | `1` |  |  |
| 5 | `window_start` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `blocked` | `boolean` | não | `false` |  |  |
| 7 | `user_id` | `uuid` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `retry_after` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rate_limit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| rate_limit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_rate_limit_logs_created | brin | created_at | não | sim |  | `CREATE INDEX brin_rate_limit_logs_created ON public.rate_limit_logs USING brin (created_at)` |
| idx_rate_limit_logs_created | btree | created_at | não | sim |  | `CREATE INDEX idx_rate_limit_logs_created ON public.rate_limit_logs USING btree (created_at DESC)` |
| idx_rate_limit_logs_ident_endpoint_window | btree | ip_address, endpoint, window_start | não | sim |  | `CREATE INDEX idx_rate_limit_logs_ident_endpoint_window ON public.rate_limit_logs USING btree (ip_address, endpoint, window_start DESC)` |
| idx_rate_limit_logs_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_rate_limit_logs_ip ON public.rate_limit_logs USING btree (ip_address)` |
| idx_rate_limit_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_rate_limit_logs_user_id ON public.rate_limit_logs USING btree (user_id)` |
| rate_limit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX rate_limit_logs_pkey ON public.rate_limit_logs USING btree (id)` |


## Policies (RLS)

### `Admins can view rate limit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Authenticated insert rate limit logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() IS NOT NULL)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
