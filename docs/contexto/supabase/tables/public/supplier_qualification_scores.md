# public.supplier_qualification_scores

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
| 3 | `overall_score` | `numeric(5,2)` | não | `0` |  |  |
| 4 | `document_score` | `numeric(5,2)` | não | `0` |  |  |
| 5 | `compliance_score` | `numeric(5,2)` | não | `0` |  |  |
| 6 | `expiry_score` | `numeric(5,2)` | não | `0` |  |  |
| 7 | `qualification_status` | `text` | não | `'pending'::text` |  |  |
| 8 | `last_calculated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `next_expiry_date` | `date` | sim |  |  |  |
| 10 | `documents_pending` | `integer` | sim | `0` |  |  |
| 11 | `documents_approved` | `integer` | sim | `0` |  |  |
| 12 | `documents_expired` | `integer` | sim | `0` |  |  |
| 13 | `documents_rejected` | `integer` | sim | `0` |  |  |
| 14 | `blocked_reason` | `text` | sim |  |  |  |
| 15 | `blocked_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `blocked_by` | `uuid` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_qualification_scores_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| supplier_qualification_scores_fornecedor_id_key | UNIQUE | `UNIQUE (fornecedor_id)` |  |  | sim |
| supplier_qualification_scores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_qualification_scores_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_qualification_scores_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_supplier_qualification_scores_tenant_id ON public.supplier_qualification_scores USING btree (tenant_id)` |
| supplier_qualification_scores_fornecedor_id_key | btree | fornecedor_id | sim | sim |  | `CREATE UNIQUE INDEX supplier_qualification_scores_fornecedor_id_key ON public.supplier_qualification_scores USING btree (fornecedor_id)` |
| supplier_qualification_scores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_qualification_scores_pkey ON public.supplier_qualification_scores USING btree (id)` |


## Policies (RLS)

### `Admins and coordinators can manage qualification scores`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `Role-restricted qualification scores select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_supplier_qualification_scores`

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
| a_fill_tenant_id_supplier | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_supplier |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
