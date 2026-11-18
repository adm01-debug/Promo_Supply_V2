# public.checkpoint_snapshots

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
| 1 | `id` | `bigint` | não | `nextval('checkpoint_snapshots_id_seq'::regclass)` |  |  |
| 2 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `num_timed` | `bigint` | não |  |  |  |
| 4 | `num_requested` | `bigint` | não |  |  |  |
| 5 | `write_time_ms` | `double precision` | não |  |  |  |
| 6 | `sync_time_ms` | `double precision` | não |  |  |  |
| 7 | `buffers_written` | `bigint` | não |  |  |  |
| 8 | `bgw_buffers_clean` | `bigint` | não |  |  |  |
| 9 | `bgw_maxwritten` | `bigint` | não |  |  |  |
| 10 | `bgw_buffers_alloc` | `bigint` | não |  |  |  |
| 11 | `ckpt_stats_reset` | `timestamp with time zone` | sim |  |  |  |
| 12 | `bgw_stats_reset` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| checkpoint_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| checkpoint_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX checkpoint_snapshots_pkey ON public.checkpoint_snapshots USING btree (id)` |
| idx_checkpoint_snapshots_captured_at | btree | captured_at | não | sim |  | `CREATE INDEX idx_checkpoint_snapshots_captured_at ON public.checkpoint_snapshots USING btree (captured_at DESC)` |


## Policies (RLS)

### `ckpt_snapshots_admin_read`

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
