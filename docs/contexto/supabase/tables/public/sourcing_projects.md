# public.sourcing_projects

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
| 3 | `title` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `category_id` | `uuid` | sim |  |  |  |
| 6 | `status` | `sourcing_project_status` | não | `'backlog'::sourcing_project_status` |  |  |
| 7 | `owner_id` | `uuid` | sim |  |  |  |
| 8 | `estimated_spend` | `numeric(15,2)` | sim |  |  |  |
| 9 | `target_saving_pct` | `numeric(5,2)` | sim |  |  |  |
| 10 | `start_date` | `date` | sim |  |  |  |
| 11 | `end_date` | `date` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_projects_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| sourcing_projects_owner_id_fkey | FOREIGN KEY | `FOREIGN KEY (owner_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sourcing_projects_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_projects_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.savings_tracker | savings_tracker_project_id_fkey | project_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_projects_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_sourcing_projects_category_id ON public.sourcing_projects USING btree (category_id)` |
| idx_sourcing_projects_owner_id | btree | owner_id | não | sim |  | `CREATE INDEX idx_sourcing_projects_owner_id ON public.sourcing_projects USING btree (owner_id)` |
| idx_sourcing_projects_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_projects_tenant_id ON public.sourcing_projects USING btree (tenant_id)` |
| sourcing_projects_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_projects_pkey ON public.sourcing_projects USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_sourcing_projects`

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
| update_sourcing_projects_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
