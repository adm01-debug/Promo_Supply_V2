# public.query_telemetry

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
| 2 | `operation` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | sim |  |  |  |
| 4 | `rpc_name` | `text` | sim |  |  |  |
| 5 | `duration_ms` | `integer` | não | `0` |  |  |
| 6 | `record_count` | `integer` | sim |  |  |  |
| 7 | `query_limit` | `integer` | sim |  |  |  |
| 8 | `query_offset` | `integer` | sim |  |  |  |
| 9 | `count_mode` | `text` | sim |  |  |  |
| 10 | `severity` | `text` | não | `'normal'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `user_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| query_telemetry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_query_telemetry_created_at | brin | created_at | não | sim |  | `CREATE INDEX brin_query_telemetry_created_at ON public.query_telemetry USING brin (created_at) WITH (pages_per_range='32')` |
| idx_query_telemetry_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_query_telemetry_created_at ON public.query_telemetry USING btree (created_at DESC)` |
| idx_query_telemetry_severity | btree | severity | não | sim |  | `CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry USING btree (severity)` |
| idx_query_telemetry_table | btree | table_name | não | sim |  | `CREATE INDEX idx_query_telemetry_table ON public.query_telemetry USING btree (table_name)` |
| query_telemetry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX query_telemetry_pkey ON public.query_telemetry USING btree (id)` |


## Policies (RLS)

### `Admins can manage telemetry`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |

### `Authenticated users can insert own telemetry`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = auth.uid())` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trig_cleanup_telemetry | AFTER | INSERT | STATEMENT | enabled | public.cleanup_old_telemetry |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
