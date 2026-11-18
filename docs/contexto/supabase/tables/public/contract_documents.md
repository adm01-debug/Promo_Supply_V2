# public.contract_documents

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `contract_id` | `uuid` | não |  |  |  |
| 3 | `file_name` | `text` | não |  |  |  |
| 4 | `file_url` | `text` | não |  |  |  |
| 5 | `file_type` | `text` | sim |  |  |  |
| 6 | `file_size` | `integer` | sim |  |  |  |
| 7 | `uploaded_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contract_documents_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contract_documents_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contract_documents_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contract_documents_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contract_documents_pkey ON public.contract_documents USING btree (id)` |
| idx_contract_documents_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_contract_documents_contract_id ON public.contract_documents USING btree (contract_id)` |
| idx_contract_documents_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_contract_documents_tenant_id ON public.contract_documents USING btree (tenant_id)` |


## Policies (RLS)

### `Admin coordinator finance can manage contract documents`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |

### `Role-restricted contract documents select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `buyer_le_contract_documents`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'buyer'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_contract_documents`

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


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
