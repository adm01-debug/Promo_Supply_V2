# public.receiving_checklists

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
| 2 | `pedido_id` | `uuid` | não |  |  |  |
| 3 | `fornecedor_id` | `uuid` | não |  |  |  |
| 4 | `contract_id` | `uuid` | sim |  |  |  |
| 5 | `inspector_id` | `uuid` | sim |  |  |  |
| 6 | `inspection_date` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `packaging_score` | `integer` | não | `5` |  |  |
| 8 | `conformity_score` | `integer` | não | `5` |  |  |
| 9 | `quantity_score` | `integer` | não | `5` |  |  |
| 10 | `documentation_score` | `integer` | não | `5` |  |  |
| 11 | `overall_score` | `numeric` | não | `5` |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `defects_found` | `text` | sim |  |  |  |
| 14 | `photos_urls` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 15 | `status` | `text` | não | `'approved'::text` |  |  |
| 16 | `rejection_reason` | `text` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| receiving_checklists_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id)` | NO ACTION | NO ACTION | sim |
| receiving_checklists_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| receiving_checklists_inspector_id_fkey | FOREIGN KEY | `FOREIGN KEY (inspector_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| receiving_checklists_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| receiving_checklists_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| receiving_checklists_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_receiving_checklists_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_receiving_checklists_contract_id ON public.receiving_checklists USING btree (contract_id)` |
| idx_receiving_checklists_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_receiving_checklists_fornecedor_id ON public.receiving_checklists USING btree (fornecedor_id)` |
| idx_receiving_checklists_pedido_id | btree | pedido_id | não | sim |  | `CREATE INDEX idx_receiving_checklists_pedido_id ON public.receiving_checklists USING btree (pedido_id)` |
| idx_receiving_checklists_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_receiving_checklists_tenant_id ON public.receiving_checklists USING btree (tenant_id)` |
| receiving_checklists_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX receiving_checklists_pkey ON public.receiving_checklists USING btree (id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage checklists`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `Role-restricted checklists select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_receiving_checklists`

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
| trg_calc_checklist_score | BEFORE | INSERT OR UPDATE | ROW | enabled | public.calc_checklist_overall_score |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
