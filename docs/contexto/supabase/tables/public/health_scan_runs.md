# public.health_scan_runs

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
| 2 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 4 | `total_scanners` | `integer` | não | `0` |  |  |
| 5 | `ok_count` | `integer` | não | `0` |  |  |
| 6 | `failed_count` | `integer` | não | `0` |  |  |
| 7 | `duration_ms` | `integer` | sim |  |  |  |
| 8 | `results` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 9 | `scan_name` | `text` | sim |  |  |  |
| 10 | `scanner_name` | `text` | sim |  |  |  |
| 11 | `status` | `text` | sim |  |  |  |
| 12 | `details` | `jsonb` | sim |  |  |  |
| 13 | `findings` | `integer` | sim |  |  |  |
| 14 | `findings_count` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| health_scan_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| health_scan_runs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX health_scan_runs_pkey ON public.health_scan_runs USING btree (id)` |
| idx_health_scan_runs_scan_name_started | btree | scan_name, started_at | não | sim | `(scan_name IS NOT NULL)` | `CREATE INDEX idx_health_scan_runs_scan_name_started ON public.health_scan_runs USING btree (scan_name, started_at DESC) WHERE (scan_name IS NOT NULL)` |
| idx_health_scan_runs_started_at | btree | started_at | não | sim |  | `CREATE INDEX idx_health_scan_runs_started_at ON public.health_scan_runs USING btree (started_at DESC)` |


## Policies (RLS)

### `Admins can read health_scan_runs`

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
