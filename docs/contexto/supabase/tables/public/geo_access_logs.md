# public.geo_access_logs

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
| 3 | `country_code` | `text` | sim |  |  |  |
| 4 | `country_name` | `text` | sim |  |  |  |
| 5 | `blocked` | `boolean` | não | `false` |  |  |
| 6 | `user_agent` | `text` | sim |  |  |  |
| 7 | `endpoint` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_access_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_geo_access_logs_created | brin | created_at | não | sim |  | `CREATE INDEX brin_geo_access_logs_created ON public.geo_access_logs USING brin (created_at)` |
| geo_access_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_access_logs_pkey ON public.geo_access_logs USING btree (id)` |
| idx_geo_logs_country | btree | country_code | não | sim |  | `CREATE INDEX idx_geo_logs_country ON public.geo_access_logs USING btree (country_code)` |
| idx_geo_logs_created | btree | created_at | não | sim |  | `CREATE INDEX idx_geo_logs_created ON public.geo_access_logs USING btree (created_at DESC)` |


## Policies (RLS)

### `Admins can view geo access logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Authenticated can insert geo access logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
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
