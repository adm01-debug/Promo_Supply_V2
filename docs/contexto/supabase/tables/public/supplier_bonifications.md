# public.supplier_bonifications

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
| usada por views | public.supplier_compliance_summary |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `fornecedor_id` | `uuid` | não |  |  |  |
| 3 | `contract_id` | `uuid` | sim |  |  |  |
| 4 | `bonification_type` | `text` | não | `'discount'::text` |  |  |
| 5 | `value_percent` | `numeric` | sim | `0` |  |  |
| 6 | `reason` | `text` | não |  |  |  |
| 7 | `period_start` | `date` | não | `CURRENT_DATE` |  |  |
| 8 | `period_end` | `date` | sim |  |  |  |
| 9 | `compliance_rate` | `numeric` | sim | `100` |  |  |
| 10 | `on_time_deliveries` | `integer` | sim | `0` |  |  |
| 11 | `total_deliveries` | `integer` | sim | `0` |  |  |
| 12 | `is_active` | `boolean` | não | `true` |  |  |
| 13 | `granted_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_bonifications_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id)` | NO ACTION | NO ACTION | sim |
| supplier_bonifications_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| supplier_bonifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_bonifications_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_bonifications_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_supplier_bonifications_contract_id ON public.supplier_bonifications USING btree (contract_id)` |
| idx_supplier_bonifications_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_supplier_bonifications_fornecedor_id ON public.supplier_bonifications USING btree (fornecedor_id)` |
| idx_supplier_bonifications_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_supplier_bonifications_tenant_id ON public.supplier_bonifications USING btree (tenant_id)` |
| supplier_bonifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_bonifications_pkey ON public.supplier_bonifications USING btree (id)` |


## Policies (RLS)

### `Admins coordinators can manage bonifications`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `Role-restricted bonifications select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_supplier_bonifications`

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
