# public.cost_centers

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `code` | `text` | sim |  |  |  |
| 4 | `is_active` | `boolean` | sim | `true` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `manager_id` | `uuid` | sim |  |  |  |
| 8 | `parent_id` | `uuid` | sim |  |  |  |
| 9 | `department` | `text` | sim |  |  |  |
| 10 | `total_budget` | `numeric(15,2)` | sim | `0` |  |  |
| 11 | `committed_amount` | `numeric(15,2)` | sim | `0` |  |  |
| 12 | `used_amount` | `numeric(15,2)` | sim | `0` |  |  |
| 13 | `approval_threshold` | `numeric(15,2)` | sim | `0` |  |  |
| 14 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cost_centers_manager_id_fkey | FOREIGN KEY | `FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| cost_centers_parent_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id) REFERENCES cost_centers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| cost_centers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cost_centers_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_hierarchy | approval_hierarchy_cost_center_id_fkey | cost_center_id | NO ACTION |
| public.approval_rules | approval_rules_cost_center_id_fkey | cost_center_id | NO ACTION |
| public.budget_transactions | budget_transactions_cost_center_id_fkey | cost_center_id | CASCADE |
| public.cost_centers | cost_centers_parent_id_fkey | parent_id | SET NULL |
| public.department_budgets | department_budgets_cost_center_id_fkey | cost_center_id | NO ACTION |
| public.pagamentos | pagamentos_cost_center_id_fkey | cost_center_id | NO ACTION |
| public.solicitacoes | solicitacoes_cost_center_id_fkey | cost_center_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cost_centers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cost_centers_pkey ON public.cost_centers USING btree (id)` |
| idx_cost_centers_manager | btree | manager_id | não | sim |  | `CREATE INDEX idx_cost_centers_manager ON public.cost_centers USING btree (manager_id)` |
| idx_cost_centers_parent | btree | parent_id | não | sim |  | `CREATE INDEX idx_cost_centers_parent ON public.cost_centers USING btree (parent_id)` |
| idx_cost_centers_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_cost_centers_tenant_id ON public.cost_centers USING btree (tenant_id)` |
| uq_cost_centers_tenant_code | btree | tenant_id, code | sim | sim |  | `CREATE UNIQUE INDEX uq_cost_centers_tenant_code ON public.cost_centers USING btree (tenant_id, code)` |


## Policies (RLS)

### `Apenas administradores podem inserir centros de custo`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |

### `cost_centers_escrita_admin_coord`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `cost_centers_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_cost_centers`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
