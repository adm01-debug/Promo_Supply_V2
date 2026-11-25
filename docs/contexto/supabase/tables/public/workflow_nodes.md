# public.workflow_nodes

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
| 2 | `template_id` | `uuid` | não |  |  |  |
| 3 | `tenant_id` | `uuid` | não |  |  |  |
| 4 | `type` | `workflow_node_type` | não |  |  |  |
| 5 | `label` | `text` | não |  |  |  |
| 6 | `config` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `position_x` | `integer` | não | `0` |  |  |
| 8 | `position_y` | `integer` | não | `0` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_nodes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_nodes_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_nodes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.workflow_approvals | workflow_approvals_node_id_fkey | node_id | NO ACTION |
| public.workflow_edges | workflow_edges_source_node_id_fkey | source_node_id | CASCADE |
| public.workflow_edges | workflow_edges_target_node_id_fkey | target_node_id | CASCADE |
| public.workflow_instances | workflow_instances_current_node_id_fkey | current_node_id | NO ACTION |
| public.workflow_logs | workflow_logs_node_id_fkey | node_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_nodes_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_workflow_nodes_template_id ON public.workflow_nodes USING btree (template_id)` |
| idx_workflow_nodes_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_nodes_tenant_id ON public.workflow_nodes USING btree (tenant_id)` |
| workflow_nodes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_nodes_pkey ON public.workflow_nodes USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_workflow_nodes`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |

### `workflow_nodes_escrita_gestao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `workflow_nodes_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
