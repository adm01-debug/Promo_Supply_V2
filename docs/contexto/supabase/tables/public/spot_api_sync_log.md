# public.spot_api_sync_log

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `endpoint` | `text` | não |  |  |  |
| 3 | `action` | `text` | sim |  |  |  |
| 4 | `status` | `text` | não | `'success'::text` |  |  |
| 5 | `error_code` | `text` | sim |  |  |  |
| 6 | `error_message` | `text` | sim |  |  |  |
| 7 | `records_processed` | `integer` | não | `0` |  |  |
| 8 | `duration_ms` | `integer` | sim |  |  |  |
| 9 | `called_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_api_sync_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spot_sync_log_endpoint_day | btree | endpoint, called_at | não | sim |  | `CREATE INDEX idx_spot_sync_log_endpoint_day ON public.spot_api_sync_log USING btree (endpoint, called_at DESC)` |
| spot_api_sync_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_api_sync_log_pkey ON public.spot_api_sync_log USING btree (id)` |


## Policies (RLS)

### `Allowed roles can view spot sync log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
