# public.dependency_health_history

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
| 2 | `payload` | `jsonb` | não |  |  |  |
| 3 | `drift_count` | `integer` | não | `0` |  |  |
| 4 | `barrel_imports` | `integer` | não | `0` |  |  |
| 5 | `generated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dependency_health_history_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| dependency_health_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dependency_health_history_generated_at_idx | btree | generated_at | não | sim |  | `CREATE INDEX dependency_health_history_generated_at_idx ON public.dependency_health_history USING btree (generated_at DESC)` |
| dependency_health_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dependency_health_history_pkey ON public.dependency_health_history USING btree (id)` |
| idx_dependency_health_history_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_dependency_health_history_created_by ON public.dependency_health_history USING btree (created_by)` |


## Policies (RLS)

### `authenticated_read_dependency_health_history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(auth.uid() IS NOT NULL)` |
| WITH CHECK |  |

### `dependency_health_history_insert_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
