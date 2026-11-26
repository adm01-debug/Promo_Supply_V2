# public.workflow_approvals

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
| 2 | `instance_id` | `uuid` | não |  |  |  |
| 3 | `node_id` | `uuid` | não |  |  |  |
| 4 | `tenant_id` | `uuid` | não |  |  |  |
| 5 | `approver_id` | `uuid` | sim |  |  |  |
| 6 | `role_required` | `app_role` | sim |  |  |  |
| 7 | `status` | `text` | não | `'pending'::text` |  |  |
| 8 | `comment` | `text` | sim |  |  |  |
| 9 | `decided_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_approvals_approver_id_fkey | FOREIGN KEY | `FOREIGN KEY (approver_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| workflow_approvals_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_approvals_node_id_fkey | FOREIGN KEY | `FOREIGN KEY (node_id) REFERENCES workflow_nodes(id)` | NO ACTION | NO ACTION | sim |
| workflow_approvals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_approvals_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_approvals_approver_id | btree | approver_id | não | sim |  | `CREATE INDEX idx_workflow_approvals_approver_id ON public.workflow_approvals USING btree (approver_id)` |
| idx_workflow_approvals_instance_node_approver | btree | instance_id, node_id, approver_id | não | sim |  | `CREATE INDEX idx_workflow_approvals_instance_node_approver ON public.workflow_approvals USING btree (instance_id, node_id, approver_id)` |
| idx_workflow_approvals_node_id | btree | node_id | não | sim |  | `CREATE INDEX idx_workflow_approvals_node_id ON public.workflow_approvals USING btree (node_id)` |
| idx_workflow_approvals_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_approvals_tenant_id ON public.workflow_approvals USING btree (tenant_id)` |
| workflow_approvals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_approvals_pkey ON public.workflow_approvals USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_workflow_approvals`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |

### `workflow_approvals_escrita_gestao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `workflow_approvals_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |


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
