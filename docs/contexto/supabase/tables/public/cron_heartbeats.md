# public.cron_heartbeats

> Health monitoring for scheduled cron edge functions. Each job upserts a row after each run.

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
| 1 | `job_name` | `text` | não |  |  |  |
| 2 | `last_run_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `last_status` | `text` | não | `'unknown'::text` |  |  |
| 4 | `last_error` | `text` | sim |  |  |  |
| 5 | `run_count` | `bigint` | não | `0` |  |  |
| 6 | `success_count` | `bigint` | não | `0` |  |  |
| 7 | `error_count` | `bigint` | não | `0` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cron_heartbeats_last_status_check | CHECK | `CHECK (last_status = ANY (ARRAY['success'::text, 'error'::text, 'unknown'::text]))` |  |  | sim |
| cron_heartbeats_pkey | PRIMARY KEY | `PRIMARY KEY (job_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cron_heartbeats_pkey | btree | job_name | sim | sim |  | `CREATE UNIQUE INDEX cron_heartbeats_pkey ON public.cron_heartbeats USING btree (job_name)` |


## Policies (RLS)

### `Authenticated users can read cron heartbeats`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `Service role manages cron heartbeats`

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
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
