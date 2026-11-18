# public.erp_connections

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
| 3 | `erp_type` | `text` | não |  |  |  |
| 4 | `base_url` | `text` | não |  |  |  |
| 5 | `auth_type` | `text` | não |  |  |  |
| 6 | `credentials_encrypted` | `text` | não |  |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `last_sync_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `settings` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| erp_connections_auth_type_check | CHECK | `CHECK (auth_type = ANY (ARRAY['basic'::text, 'oauth2'::text, 'apikey'::text, 'token'::text]))` |  |  | sim |
| erp_connections_erp_type_check | CHECK | `CHECK (erp_type = ANY (ARRAY['sap_s4'::text, 'totvs_protheus'::text, 'totvs_datasul'::text, 'oracle_ebs'::text, 'custom'::text]))` |  |  | sim |
| erp_connections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| erp_connections_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.erp_field_mappings | erp_field_mappings_connection_id_fkey | connection_id | CASCADE |
| public.erp_sync_log | erp_sync_log_connection_id_fkey | connection_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| erp_connections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX erp_connections_pkey ON public.erp_connections USING btree (id)` |
| idx_erp_connections_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_erp_connections_tenant ON public.erp_connections USING btree (tenant_id)` |


## Policies (RLS)

### `Admins and coordinators manage ERP connections within tenant`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_erp_connections_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
