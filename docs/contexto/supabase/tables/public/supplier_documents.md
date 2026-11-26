# public.supplier_documents

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
| 2 | `fornecedor_id` | `uuid` | não |  |  |  |
| 3 | `requirement_id` | `uuid` | não |  |  |  |
| 4 | `file_name` | `text` | não |  |  |  |
| 5 | `file_url` | `text` | não |  |  |  |
| 6 | `file_size` | `integer` | sim |  |  |  |
| 7 | `file_type` | `text` | sim |  |  |  |
| 8 | `issue_date` | `date` | sim |  |  |  |
| 9 | `expiry_date` | `date` | sim |  |  |  |
| 10 | `status` | `text` | não | `'pending'::text` |  |  |
| 11 | `rejection_reason` | `text` | sim |  |  |  |
| 12 | `reviewed_by` | `uuid` | sim |  |  |  |
| 13 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `uploaded_by` | `uuid` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_documents_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| supplier_documents_fornecedor_id_requirement_id_key | UNIQUE | `UNIQUE (fornecedor_id, requirement_id)` |  |  | sim |
| supplier_documents_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_documents_requirement_id_fkey | FOREIGN KEY | `FOREIGN KEY (requirement_id) REFERENCES qualification_requirements(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| supplier_documents_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_documents_requirement_id | btree | requirement_id | não | sim |  | `CREATE INDEX idx_supplier_documents_requirement_id ON public.supplier_documents USING btree (requirement_id)` |
| idx_supplier_documents_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_supplier_documents_tenant_id ON public.supplier_documents USING btree (tenant_id)` |
| supplier_documents_fornecedor_id_requirement_id_key | btree | fornecedor_id, requirement_id | sim | sim |  | `CREATE UNIQUE INDEX supplier_documents_fornecedor_id_requirement_id_key ON public.supplier_documents USING btree (fornecedor_id, requirement_id)` |
| supplier_documents_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_documents_pkey ON public.supplier_documents USING btree (id)` |


## Policies (RLS)

### `Admin coordinator buyer can manage supplier documents`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `Role-restricted supplier document select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK |  |

### `tenant_isolation_supplier_documents`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| recalculate_qualification_on_document_change | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trigger_recalculate_qualification_score |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
