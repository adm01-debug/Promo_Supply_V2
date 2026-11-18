# public.user_tenants

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
| 1 | `user_id` | `uuid` | não |  |  |  |
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `role` | `app_role` | não | `'viewer'::app_role` |  |  |
| 4 | `is_default` | `boolean` | não | `false` |  |  |
| 5 | `joined_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_tenants_pkey | PRIMARY KEY | `PRIMARY KEY (user_id, tenant_id)` |  |  | sim |
| user_tenants_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_tenants_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID` | CASCADE | NO ACTION | não |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_tenants_one_default | btree | user_id | sim | sim | `(is_default = true)` | `CREATE UNIQUE INDEX idx_user_tenants_one_default ON public.user_tenants USING btree (user_id) WHERE (is_default = true)` |
| idx_user_tenants_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_user_tenants_tenant_id ON public.user_tenants USING btree (tenant_id)` |
| idx_user_tenants_user | btree | user_id | não | sim |  | `CREATE INDEX idx_user_tenants_user ON public.user_tenants USING btree (user_id)` |
| user_tenants_pkey | btree | user_id, tenant_id | sim | sim |  | `CREATE UNIQUE INDEX user_tenants_pkey ON public.user_tenants USING btree (user_id, tenant_id)` |


## Policies (RLS)

### `user_tenants own rows`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
