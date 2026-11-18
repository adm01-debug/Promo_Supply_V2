# public.savings_tracker

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
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `project_id` | `uuid` | sim |  |  |  |
| 4 | `title` | `text` | não |  |  |  |
| 5 | `type` | `saving_type` | não | `'negotiated'::saving_type` |  |  |
| 6 | `baseline_value` | `numeric(15,2)` | não |  |  |  |
| 7 | `negotiated_value` | `numeric(15,2)` | não |  |  |  |
| 8 | `actual_saving` | `numeric(15,2)` | sim |  |  |  |
| 9 | `currency` | `character(3)` | sim | `'BRL'::bpchar` |  |  |
| 10 | `validated_by_finance` | `boolean` | sim | `false` |  |  |
| 11 | `finance_notes` | `text` | sim |  |  |  |
| 12 | `realized_date` | `date` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| savings_tracker_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| savings_tracker_project_id_fkey | FOREIGN KEY | `FOREIGN KEY (project_id) REFERENCES sourcing_projects(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| savings_tracker_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_savings_tracker_project_id | btree | project_id | não | sim |  | `CREATE INDEX idx_savings_tracker_project_id ON public.savings_tracker USING btree (project_id)` |
| idx_savings_tracker_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_savings_tracker_tenant_id ON public.savings_tracker USING btree (tenant_id)` |
| savings_tracker_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX savings_tracker_pkey ON public.savings_tracker USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_savings_tracker`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_savings_tracker_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
