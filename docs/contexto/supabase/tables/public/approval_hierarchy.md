# public.approval_hierarchy

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `superior_id` | `uuid` | sim |  |  |  |
| 4 | `cost_center_id` | `uuid` | sim |  |  |  |
| 5 | `max_approval_amount` | `numeric(15,2)` | sim | `0` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| approval_hierarchy_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)` | NO ACTION | NO ACTION | sim |
| approval_hierarchy_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| approval_hierarchy_superior_id_fkey | FOREIGN KEY | `FOREIGN KEY (superior_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| approval_hierarchy_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| approval_hierarchy_user_id_cost_center_id_key | UNIQUE | `UNIQUE (user_id, cost_center_id)` |  |  | sim |
| approval_hierarchy_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| approval_hierarchy_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX approval_hierarchy_pkey ON public.approval_hierarchy USING btree (id)` |
| approval_hierarchy_user_id_cost_center_id_key | btree | user_id, cost_center_id | sim | sim |  | `CREATE UNIQUE INDEX approval_hierarchy_user_id_cost_center_id_key ON public.approval_hierarchy USING btree (user_id, cost_center_id)` |
| idx_approval_hierarchy_cost_center_id | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_approval_hierarchy_cost_center_id ON public.approval_hierarchy USING btree (cost_center_id)` |
| idx_approval_hierarchy_superior_id | btree | superior_id | não | sim |  | `CREATE INDEX idx_approval_hierarchy_superior_id ON public.approval_hierarchy USING btree (superior_id)` |
| idx_approval_hierarchy_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_approval_hierarchy_tenant_id ON public.approval_hierarchy USING btree (tenant_id)` |


## Policies (RLS)

### `approval_hierarchy_escrita_gestao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `approval_hierarchy_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_approval_hierarchy`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
