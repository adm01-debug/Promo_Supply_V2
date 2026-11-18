# public.sourcing_pipeline

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
| 2 | `titulo` | `text` | não |  |  |  |
| 3 | `categoria_id` | `uuid` | sim |  |  |  |
| 4 | `status` | `text` | sim | `'identification'::text` |  |  |
| 5 | `baseline_value` | `numeric(15,2)` | sim |  |  |  |
| 6 | `target_saving_percent` | `numeric(5,2)` | sim |  |  |  |
| 7 | `estimated_saving_value` | `numeric(15,2)` | sim |  |  |  |
| 8 | `actual_saving_value` | `numeric(15,2)` | sim |  |  |  |
| 9 | `comprador_id` | `uuid` | sim |  |  |  |
| 10 | `start_date` | `date` | sim |  |  |  |
| 11 | `end_date` | `date` | sim |  |  |  |
| 12 | `organization_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_pipeline_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| sourcing_pipeline_comprador_id_fkey | FOREIGN KEY | `FOREIGN KEY (comprador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sourcing_pipeline_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| sourcing_pipeline_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_pipeline_status_check | CHECK | `CHECK (status = ANY (ARRAY['identification'::text, 'baseline'::text, 'strategy'::text, 'execution'::text, 'negotiation'::text, 'completed'::text, 'cancelled'::text]))` |  |  | sim |
| sourcing_pipeline_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pipeline_status | btree | status | não | sim |  | `CREATE INDEX idx_pipeline_status ON public.sourcing_pipeline USING btree (status)` |
| idx_sourcing_pipeline_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_sourcing_pipeline_categoria_id ON public.sourcing_pipeline USING btree (categoria_id)` |
| idx_sourcing_pipeline_comprador_id | btree | comprador_id | não | sim |  | `CREATE INDEX idx_sourcing_pipeline_comprador_id ON public.sourcing_pipeline USING btree (comprador_id)` |
| idx_sourcing_pipeline_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_sourcing_pipeline_organization_id ON public.sourcing_pipeline USING btree (organization_id)` |
| idx_sourcing_pipeline_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_pipeline_tenant_id ON public.sourcing_pipeline USING btree (tenant_id)` |
| sourcing_pipeline_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_pipeline_pkey ON public.sourcing_pipeline USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_sourcing_pipeline`

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
