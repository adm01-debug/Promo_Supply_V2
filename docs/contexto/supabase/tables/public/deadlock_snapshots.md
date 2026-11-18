# public.deadlock_snapshots

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
| 1 | `id` | `bigint` | não | `nextval('deadlock_snapshots_id_seq'::regclass)` |  |  |
| 2 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `datname` | `text` | não |  |  |  |
| 4 | `deadlocks` | `bigint` | não |  |  |  |
| 5 | `conflicts` | `bigint` | não |  |  |  |
| 6 | `temp_files` | `bigint` | não |  |  |  |
| 7 | `stats_reset` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| deadlock_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| deadlock_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX deadlock_snapshots_pkey ON public.deadlock_snapshots USING btree (id)` |
| idx_deadlock_snapshots_captured_at_brin | brin | captured_at | não | sim |  | `CREATE INDEX idx_deadlock_snapshots_captured_at_brin ON public.deadlock_snapshots USING brin (captured_at)` |


## Policies (RLS)

### `Admins can view deadlock snapshots`

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
