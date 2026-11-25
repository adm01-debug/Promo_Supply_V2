# public.workflow_edges

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
| 4 | `source_node_id` | `uuid` | não |  |  |  |
| 5 | `target_node_id` | `uuid` | não |  |  |  |
| 6 | `condition_expression` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_edges_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_edges_source_node_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_node_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_edges_target_node_id_fkey | FOREIGN KEY | `FOREIGN KEY (target_node_id) REFERENCES workflow_nodes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_edges_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflow_edges_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_edges_source_node_id | btree | source_node_id | não | sim |  | `CREATE INDEX idx_workflow_edges_source_node_id ON public.workflow_edges USING btree (source_node_id)` |
| idx_workflow_edges_source_target | btree | source_node_id, target_node_id | não | sim |  | `CREATE INDEX idx_workflow_edges_source_target ON public.workflow_edges USING btree (source_node_id, target_node_id)` |
| idx_workflow_edges_target_node_id | btree | target_node_id | não | sim |  | `CREATE INDEX idx_workflow_edges_target_node_id ON public.workflow_edges USING btree (target_node_id)` |
| idx_workflow_edges_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_workflow_edges_template_id ON public.workflow_edges USING btree (template_id)` |
| idx_workflow_edges_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_edges_tenant_id ON public.workflow_edges USING btree (tenant_id)` |
| workflow_edges_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_edges_pkey ON public.workflow_edges USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_workflow_edges`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |

### `workflow_edges_escrita_gestao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `workflow_edges_select_grupo`

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
