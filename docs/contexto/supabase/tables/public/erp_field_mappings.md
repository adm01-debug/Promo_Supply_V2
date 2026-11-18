# public.erp_field_mappings

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
| 2 | `connection_id` | `uuid` | não |  |  |  |
| 3 | `entity` | `text` | não |  |  |  |
| 4 | `source_field` | `text` | não |  |  |  |
| 5 | `target_field` | `text` | não |  |  |  |
| 6 | `transform_fn` | `text` | sim |  |  |  |
| 7 | `is_required` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| erp_field_mappings_connection_id_entity_source_field_key | UNIQUE | `UNIQUE (connection_id, entity, source_field)` |  |  | sim |
| erp_field_mappings_connection_id_fkey | FOREIGN KEY | `FOREIGN KEY (connection_id) REFERENCES erp_connections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| erp_field_mappings_entity_check | CHECK | `CHECK (entity = ANY (ARRAY['fornecedor'::text, 'pedido'::text, 'pagamento'::text, 'nota_fiscal'::text, 'solicitacao'::text]))` |  |  | sim |
| erp_field_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| erp_field_mappings_connection_id_entity_source_field_key | btree | connection_id, entity, source_field | sim | sim |  | `CREATE UNIQUE INDEX erp_field_mappings_connection_id_entity_source_field_key ON public.erp_field_mappings USING btree (connection_id, entity, source_field)` |
| erp_field_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX erp_field_mappings_pkey ON public.erp_field_mappings USING btree (id)` |


## Policies (RLS)

### `ERP field mappings are visible to tenant admins`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM erp_connections c   WHERE ((c.id = erp_field_mappings.connection_id) AND (c.tenant_id = current_tenant_id()))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
