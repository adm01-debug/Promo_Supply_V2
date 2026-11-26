# public.contract_penalties

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
| 2 | `contract_id` | `uuid` | não |  |  |  |
| 3 | `pedido_id` | `uuid` | sim |  |  |  |
| 4 | `penalty_type` | `text` | não | `'delivery_delay'::text` |  |  |
| 5 | `description` | `text` | não |  |  |  |
| 6 | `days_late` | `integer` | sim | `0` |  |  |
| 7 | `penalty_percent` | `numeric` | sim | `0` |  |  |
| 8 | `penalty_value` | `numeric` | não | `0` |  |  |
| 9 | `applied_to_payment` | `boolean` | sim | `false` |  |  |
| 10 | `pagamento_id` | `uuid` | sim |  |  |  |
| 11 | `status` | `text` | não | `'pending'::text` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contract_penalties_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contract_penalties_pagamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id)` | NO ACTION | NO ACTION | sim |
| contract_penalties_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id)` | NO ACTION | NO ACTION | sim |
| contract_penalties_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contract_penalties_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contract_penalties_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contract_penalties_pkey ON public.contract_penalties USING btree (id)` |
| idx_contract_penalties_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_contract_penalties_contract_id ON public.contract_penalties USING btree (contract_id)` |
| idx_contract_penalties_pagamento_id | btree | pagamento_id | não | sim |  | `CREATE INDEX idx_contract_penalties_pagamento_id ON public.contract_penalties USING btree (pagamento_id)` |
| idx_contract_penalties_pedido_id | btree | pedido_id | não | sim |  | `CREATE INDEX idx_contract_penalties_pedido_id ON public.contract_penalties USING btree (pedido_id)` |
| idx_contract_penalties_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_contract_penalties_tenant_id ON public.contract_penalties USING btree (tenant_id)` |


## Policies (RLS)

### `Admin coordinator finance can manage contract penalties`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |

### `Role-restricted contract penalties select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_contract_penalties`

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
| trg_apply_penalty_escalation | BEFORE | INSERT | ROW | enabled | public.apply_penalty_escalation |
| trg_update_contract_penalties_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
