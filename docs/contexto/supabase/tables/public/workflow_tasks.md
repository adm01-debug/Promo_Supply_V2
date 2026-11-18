# public.workflow_tasks

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
| 3 | `instance_id` | `uuid` | não |  |  |  |
| 4 | `node_id` | `text` | não |  |  |  |
| 5 | `assigned_to_role` | `app_role` | sim |  |  |  |
| 6 | `assigned_to_user` | `uuid` | sim |  |  |  |
| 7 | `title` | `text` | não |  |  |  |
| 8 | `description` | `text` | sim |  |  |  |
| 9 | `status` | `text` | não | `'pending'::text` |  |  |
| 10 | `due_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `completed_by` | `uuid` | sim |  |  |  |
| 13 | `outcome` | `text` | sim |  |  |  |
| 14 | `comments` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_tasks_assigned_to_user_fkey | FOREIGN KEY | `FOREIGN KEY (assigned_to_user) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| workflow_tasks_completed_by_fkey | FOREIGN KEY | `FOREIGN KEY (completed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| workflow_tasks_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_tasks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_tasks_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]))` |  |  | sim |
| workflow_tasks_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.workflow_audit_log | workflow_audit_log_task_id_fkey | task_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_tasks_assigned_user | btree | assigned_to_user | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_workflow_tasks_assigned_user ON public.workflow_tasks USING btree (assigned_to_user) WHERE (status = 'pending'::text)` |
| idx_workflow_tasks_completed_by | btree | completed_by | não | sim |  | `CREATE INDEX idx_workflow_tasks_completed_by ON public.workflow_tasks USING btree (completed_by)` |
| idx_workflow_tasks_instance | btree | instance_id | não | sim |  | `CREATE INDEX idx_workflow_tasks_instance ON public.workflow_tasks USING btree (instance_id)` |
| idx_workflow_tasks_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_tasks_tenant_id ON public.workflow_tasks USING btree (tenant_id)` |
| workflow_tasks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_tasks_pkey ON public.workflow_tasks USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_workflow_tasks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
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
