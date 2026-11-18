# public.temp_file_snapshots

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
| 1 | `id` | `bigint` | não | `nextval('temp_file_snapshots_id_seq'::regclass)` |  |  |
| 2 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `datname` | `text` | não |  |  |  |
| 4 | `temp_files` | `bigint` | não |  |  |  |
| 5 | `temp_bytes` | `bigint` | não |  |  |  |
| 6 | `stats_reset` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| temp_file_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_temp_file_snapshots_captured_at | btree | captured_at | não | sim |  | `CREATE INDEX idx_temp_file_snapshots_captured_at ON public.temp_file_snapshots USING btree (captured_at DESC)` |
| temp_file_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX temp_file_snapshots_pkey ON public.temp_file_snapshots USING btree (id)` |


## Policies (RLS)

### `admin_read_temp_file_snapshots`

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
