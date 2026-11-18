# public.workflow_templates

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
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `trigger_type` | `text` | não |  |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `version` | `integer` | não | `1` |  |  |
| 8 | `config` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflow_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflow_templates_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.workflow_edges | workflow_edges_template_id_fkey | template_id | CASCADE |
| public.workflow_instances | workflow_instances_template_id_fkey | template_id | NO ACTION |
| public.workflow_nodes | workflow_nodes_template_id_fkey | template_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflow_templates_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_workflow_templates_tenant_id ON public.workflow_templates USING btree (tenant_id)` |
| workflow_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflow_templates_pkey ON public.workflow_templates USING btree (id)` |


## Policies (RLS)

### `Tenant isolation for workflow_templates`

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
