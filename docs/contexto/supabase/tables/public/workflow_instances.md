# public.workflow_instances

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
| 2 | `template_id` | `uuid` | não |  |  |  |
| 3 | `tenant_id` | `uuid` | não |  |  |  |
| 4 | `entity_type` | `text` | não |  |  |  |
| 5 | `entity_id` | `uuid` | não |  |  |  |
| 6 | `status` | `workflow_status` | não | `'pending'::workflow_status` |  |  |
| 7 | `current_node_id` | `uuid` | sim |  |  |  |
| 8 | `context` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 9 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_instances_current_node_id_fkey | FOREIGN KEY | `FOREIGN KEY (current_node_id) REFERENCES workflow_nodes(id)` | NO ACTION | NO ACTION | sim |
| workflow_instances_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_instances_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES workflow_templates(id)` | NO ACTION | NO ACTION | sim |
| workflow_instances_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.workflow_approvals | workflow_approvals_instance_id_fkey | instance_id | CASCADE |
| public.workflow_audit_log | workflow_audit_log_instance_id_fkey | instance_id | SET NULL |
| public.workflow_logs | workflow_logs_instance_id_fkey | instance_id | CASCADE |
| public.workflow_tasks | workflow_tasks_instance_id_fkey | instance_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_instances_current_node_id | btree | current_node_id | não | sim |  | `CREATE INDEX idx_workflow_instances_current_node_id ON public.workflow_instances USING btree (current_node_id)` |
| idx_workflow_instances_entity | btree | entity_type, entity_id | não | sim |  | `CREATE INDEX idx_workflow_instances_entity ON public.workflow_instances USING btree (entity_type, entity_id)` |
| idx_workflow_instances_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_workflow_instances_template_id ON public.workflow_instances USING btree (template_id)` |
| idx_workflow_instances_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_instances_tenant_id ON public.workflow_instances USING btree (tenant_id)` |
| workflow_instances_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_instances_pkey ON public.workflow_instances USING btree (id)` |


## Policies (RLS)

### `Tenant isolation for workflow_instances`

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
