# public.table_size_snapshots

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
| 2 | `schema_name` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `total_bytes` | `bigint` | não |  |  |  |
| 5 | `table_bytes` | `bigint` | não |  |  |  |
| 6 | `index_bytes` | `bigint` | não |  |  |  |
| 7 | `toast_bytes` | `bigint` | não | `0` |  |  |
| 8 | `row_estimate` | `bigint` | não | `0` |  |  |
| 9 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| table_size_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_table_size_snapshots_captured | brin | captured_at | não | sim |  | `CREATE INDEX brin_table_size_snapshots_captured ON public.table_size_snapshots USING brin (captured_at)` |
| idx_table_size_snapshots_captured | btree | schema_name, table_name, captured_at | não | sim |  | `CREATE INDEX idx_table_size_snapshots_captured ON public.table_size_snapshots USING btree (schema_name, table_name, captured_at DESC)` |
| table_size_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX table_size_snapshots_pkey ON public.table_size_snapshots USING btree (id)` |


## Policies (RLS)

### `admins_read_table_size_snapshots`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
