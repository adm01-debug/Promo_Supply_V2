# public.workflow_audit_log

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
| 3 | `instance_id` | `uuid` | sim |  |  |  |
| 4 | `task_id` | `uuid` | sim |  |  |  |
| 5 | `event_type` | `text` | não |  |  |  |
| 6 | `actor_id` | `uuid` | sim |  |  |  |
| 7 | `old_state` | `jsonb` | sim |  |  |  |
| 8 | `new_state` | `jsonb` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_audit_log_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| workflow_audit_log_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| workflow_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_audit_log_task_id_fkey | FOREIGN KEY | `FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| workflow_audit_log_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_audit_log_actor_id | btree | actor_id | não | sim |  | `CREATE INDEX idx_workflow_audit_log_actor_id ON public.workflow_audit_log USING btree (actor_id)` |
| idx_workflow_audit_log_instance_id | btree | instance_id | não | sim |  | `CREATE INDEX idx_workflow_audit_log_instance_id ON public.workflow_audit_log USING btree (instance_id)` |
| idx_workflow_audit_log_task_id | btree | task_id | não | sim |  | `CREATE INDEX idx_workflow_audit_log_task_id ON public.workflow_audit_log USING btree (task_id)` |
| idx_workflow_audit_log_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_audit_log_tenant_id ON public.workflow_audit_log USING btree (tenant_id)` |
| workflow_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_audit_log_pkey ON public.workflow_audit_log USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_workflow_audit_log`

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
