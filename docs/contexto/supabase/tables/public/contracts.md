# public.contracts

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.supplier_compliance_summary |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `contract_number` | `text` | não |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `supplier_id` | `text` | não |  |  |  |
| 6 | `supplier_name` | `text` | não |  |  |  |
| 7 | `contract_type` | `text` | não | `'service'::text` |  |  |
| 8 | `status` | `text` | não | `'draft'::text` |  |  |
| 9 | `start_date` | `date` | não |  |  |  |
| 10 | `end_date` | `date` | não |  |  |  |
| 11 | `total_value` | `numeric(15,2)` | não | `0` |  |  |
| 12 | `payment_terms` | `text` | sim |  |  |  |
| 13 | `renewal_type` | `text` | sim | `'manual'::text` |  |  |
| 14 | `renewal_notice_days` | `integer` | sim | `30` |  |  |
| 15 | `created_by` | `uuid` | sim |  |  |  |
| 16 | `approved_by` | `uuid` | sim |  |  |  |
| 17 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `sla_delivery_days` | `integer` | sim | `30` |  |  |
| 21 | `penalty_rate_per_day` | `numeric` | sim | `0.5` |  |  |
| 22 | `penalty_cap_percent` | `numeric` | sim | `20` |  |  |
| 23 | `min_quality_score` | `numeric` | sim | `3.0` |  |  |
| 24 | `quality_penalty_percent` | `numeric` | sim | `10` |  |  |
| 25 | `return_policy` | `text` | sim | `'Itens fora do padrão serão devolvidos com nota de devolução e desconto aplicado no próximo pagamento.'::text` |  |  |
| 26 | `min_supplier_score` | `numeric` | sim | `3.0` |  |  |
| 27 | `auto_block_below_score` | `boolean` | sim | `true` |  |  |
| 28 | `penalty_clauses` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 29 | `organization_id` | `uuid` | sim |  |  |  |
| 30 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |
| 31 | `currency` | `character(3)` | não | `'BRL'::bpchar` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contracts_currency_fkey | FOREIGN KEY | `FOREIGN KEY (currency) REFERENCES currencies(code) NOT VALID` | NO ACTION | NO ACTION | não |
| contracts_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| contracts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contracts_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contract_documents | contract_documents_contract_id_fkey | contract_id | CASCADE |
| public.contract_history | contract_history_contract_id_fkey | contract_id | CASCADE |
| public.contract_items | contract_items_contract_id_fkey | contract_id | CASCADE |
| public.contract_penalties | contract_penalties_contract_id_fkey | contract_id | CASCADE |
| public.order_contracts | order_contracts_contract_id_fkey | contract_id | CASCADE |
| public.penalty_escalation_config | penalty_escalation_config_contract_id_fkey | contract_id | CASCADE |
| public.receiving_checklists | receiving_checklists_contract_id_fkey | contract_id | NO ACTION |
| public.supplier_bonifications | supplier_bonifications_contract_id_fkey | contract_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contracts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contracts_pkey ON public.contracts USING btree (id)` |
| idx_contracts_currency | btree | currency | não | sim |  | `CREATE INDEX idx_contracts_currency ON public.contracts USING btree (currency)` |
| idx_contracts_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_contracts_organization_id ON public.contracts USING btree (organization_id)` |
| idx_contracts_supplier_created | btree | supplier_id, created_at | não | sim |  | `CREATE INDEX idx_contracts_supplier_created ON public.contracts USING btree (supplier_id, created_at DESC)` |
| idx_contracts_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_contracts_tenant_id ON public.contracts USING btree (tenant_id)` |
| uq_contracts_tenant_contract_number | btree | tenant_id, contract_number | sim | sim |  | `CREATE UNIQUE INDEX uq_contracts_tenant_contract_number ON public.contracts USING btree (tenant_id, contract_number)` |


## Policies (RLS)

### `Admin coordinator finance can manage contracts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `Admins can delete contracts`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Role-restricted contract access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK |  |

### `buyer_le_contracts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'buyer'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_contracts`

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
| trg_update_contracts_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
