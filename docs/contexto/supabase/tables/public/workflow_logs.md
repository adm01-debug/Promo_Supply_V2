# public.workflow_logs

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
| 2 | `instance_id` | `uuid` | não |  |  |  |
| 3 | `tenant_id` | `uuid` | não |  |  |  |
| 4 | `node_id` | `uuid` | sim |  |  |  |
| 5 | `event_type` | `text` | não |  |  |  |
| 6 | `message` | `text` | sim |  |  |  |
| 7 | `details` | `jsonb` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_logs_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_logs_node_id_fkey | FOREIGN KEY | `FOREIGN KEY (node_id) REFERENCES workflow_nodes(id)` | NO ACTION | NO ACTION | sim |
| workflow_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_logs_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_logs_instance_id | btree | instance_id | não | sim |  | `CREATE INDEX idx_workflow_logs_instance_id ON public.workflow_logs USING btree (instance_id)` |
| idx_workflow_logs_instance_node | btree | instance_id, node_id | não | sim |  | `CREATE INDEX idx_workflow_logs_instance_node ON public.workflow_logs USING btree (instance_id, node_id)` |
| idx_workflow_logs_node_id | btree | node_id | não | sim |  | `CREATE INDEX idx_workflow_logs_node_id ON public.workflow_logs USING btree (node_id)` |
| idx_workflow_logs_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_logs_tenant_id ON public.workflow_logs USING btree (tenant_id)` |
| workflow_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_logs_pkey ON public.workflow_logs USING btree (id)` |


## Policies (RLS)

### `Tenant isolation for workflow_logs`

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
