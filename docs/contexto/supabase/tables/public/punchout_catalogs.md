# public.punchout_catalogs

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
| 3 | `fornecedor_id` | `uuid` | não |  |  |  |
| 4 | `protocol` | `text` | não |  |  |  |
| 5 | `setup_url` | `text` | não |  |  |  |
| 6 | `identity` | `text` | não |  |  |  |
| 7 | `shared_secret_encrypted` | `text` | não |  |  |  |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `last_test_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `last_test_status` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| punchout_catalogs_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| punchout_catalogs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| punchout_catalogs_protocol_check | CHECK | `CHECK (protocol = ANY (ARRAY['cxml'::text, 'oci'::text]))` |  |  | sim |
| punchout_catalogs_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.punchout_sessions | punchout_sessions_catalog_id_fkey | catalog_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_punchout_catalogs_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_punchout_catalogs_fornecedor_id ON public.punchout_catalogs USING btree (fornecedor_id)` |
| idx_punchout_catalogs_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_punchout_catalogs_tenant ON public.punchout_catalogs USING btree (tenant_id)` |
| punchout_catalogs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX punchout_catalogs_pkey ON public.punchout_catalogs USING btree (id)` |


## Policies (RLS)

### `Admins and coordinators manage PunchOut catalogs within tenant`

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
| update_punchout_catalogs_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
