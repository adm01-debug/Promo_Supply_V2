# public.department_budgets

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `centro_custo` | `text` | não |  |  |  |
| 3 | `departamento` | `text` | não |  |  |  |
| 4 | `ano` | `integer` | não | `EXTRACT(year FROM CURRENT_DATE)` |  |  |
| 5 | `mes` | `integer` | sim |  |  |  |
| 6 | `valor_total` | `numeric` | não | `0` |  |  |
| 7 | `valor_comprometido` | `numeric` | não | `0` |  |  |
| 8 | `valor_utilizado` | `numeric` | não | `0` |  |  |
| 9 | `created_by` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `cost_center_id` | `uuid` | sim |  |  |  |
| 13 | `organization_id` | `uuid` | sim |  |  |  |
| 14 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| department_budgets_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)` | NO ACTION | NO ACTION | sim |
| department_budgets_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| department_budgets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| department_budgets_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.budget_audit_logs | budget_audit_logs_budget_id_fkey | budget_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| department_budgets_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX department_budgets_pkey ON public.department_budgets USING btree (id)` |
| idx_department_budgets_cost_center | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_department_budgets_cost_center ON public.department_budgets USING btree (cost_center_id)` |
| idx_department_budgets_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_department_budgets_tenant_id ON public.department_budgets USING btree (tenant_id)` |
| idx_dept_budgets_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_dept_budgets_org ON public.department_budgets USING btree (organization_id)` |
| idx_unique_budget_period | btree | cost_center_id, ano | sim | sim |  | `CREATE UNIQUE INDEX idx_unique_budget_period ON public.department_budgets USING btree (cost_center_id, ano, COALESCE(mes, 0))` |


## Policies (RLS)

### `Admin and coordinator can manage budgets`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `Finance can manage budgets`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'finance'::app_role)` |
| WITH CHECK | `has_role(auth.uid(), 'finance'::app_role)` |

### `Role-restricted budget access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `Users can view their organization budgets`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `tenant_isolation_department_budgets`

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
| trigger_log_budget_changes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_budget_changes |
| update_department_budgets_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
