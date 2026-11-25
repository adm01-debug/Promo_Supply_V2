# public.pagamentos

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `numero` | `text` | não |  |  |  |
| 3 | `pedido_id` | `uuid` | sim |  |  |  |
| 4 | `fornecedor_id` | `uuid` | não |  |  |  |
| 5 | `valor` | `numeric(12,2)` | não |  |  |  |
| 6 | `valor_pago` | `numeric(12,2)` | sim | `0` |  |  |
| 7 | `status` | `text` | não | `'pendente'::text` |  |  |
| 8 | `data_vencimento` | `date` | não |  |  |  |
| 9 | `data_pagamento` | `date` | sim |  |  |  |
| 10 | `forma_pagamento` | `text` | sim |  |  |  |
| 11 | `dados_bancarios` | `jsonb` | sim |  |  |  |
| 12 | `numero_nf` | `text` | sim |  |  |  |
| 13 | `chave_nf` | `text` | sim |  |  |  |
| 14 | `aprovador_id` | `uuid` | sim |  |  |  |
| 15 | `data_aprovacao` | `timestamp with time zone` | sim |  |  |  |
| 16 | `observacoes` | `text` | sim |  |  |  |
| 17 | `comprovante_url` | `text` | sim |  |  |  |
| 18 | `created_by` | `uuid` | sim |  |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `organization_id` | `uuid` | sim |  |  |  |
| 22 | `cost_center_id` | `uuid` | sim |  |  |  |
| 23 | `tenant_id` | `uuid` | não |  |  |  |
| 24 | `data_agendamento` | `date` | sim |  |  | Data escolhida pelo financeiro ao agendar o pagamento (status agendado). data_pagamento continua sendo a data efetiva do pagamento. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pagamentos_aprovador_id_fkey | FOREIGN KEY | `FOREIGN KEY (aprovador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| pagamentos_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)` | NO ACTION | NO ACTION | sim |
| pagamentos_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| pagamentos_forma_pagamento_check | CHECK | `CHECK (forma_pagamento = ANY (ARRAY['boleto'::text, 'pix'::text, 'transferencia'::text, 'cartao'::text, 'cheque'::text]))` |  |  | sim |
| pagamentos_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| pagamentos_numero_key | UNIQUE | `UNIQUE (numero)` |  |  | sim |
| pagamentos_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| pagamentos_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id)` | NO ACTION | NO ACTION | sim |
| pagamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pagamentos_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'agendado'::text, 'pago'::text, 'parcial'::text, 'cancelado'::text, 'atrasado'::text]))` |  |  | sim |
| pagamentos_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contract_penalties | contract_penalties_pagamento_id_fkey | pagamento_id | NO ACTION |
| public.creditos_fornecedor | creditos_fornecedor_utilizado_em_pagamento_id_fkey | utilizado_em_pagamento_id | SET NULL |
| public.payment_history | payment_history_pagamento_id_fkey | pagamento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pagamentos_aprovador_id | btree | aprovador_id | não | sim |  | `CREATE INDEX idx_pagamentos_aprovador_id ON public.pagamentos USING btree (aprovador_id)` |
| idx_pagamentos_cost_center_id | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_pagamentos_cost_center_id ON public.pagamentos USING btree (cost_center_id)` |
| idx_pagamentos_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_pagamentos_created_by ON public.pagamentos USING btree (created_by)` |
| idx_pagamentos_dashboard | btree | status, created_at | não | sim |  | `CREATE INDEX idx_pagamentos_dashboard ON public.pagamentos USING btree (status, created_at)` |
| idx_pagamentos_fornecedor | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_pagamentos_fornecedor ON public.pagamentos USING btree (fornecedor_id)` |
| idx_pagamentos_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_pagamentos_org ON public.pagamentos USING btree (organization_id)` |
| idx_pagamentos_org_status_due | btree | organization_id, status, data_vencimento | não | sim |  | `CREATE INDEX idx_pagamentos_org_status_due ON public.pagamentos USING btree (organization_id, status, data_vencimento)` |
| idx_pagamentos_pedido_id | btree | pedido_id | não | sim |  | `CREATE INDEX idx_pagamentos_pedido_id ON public.pagamentos USING btree (pedido_id)` |
| idx_pagamentos_status | btree | status | não | sim |  | `CREATE INDEX idx_pagamentos_status ON public.pagamentos USING btree (status)` |
| idx_pagamentos_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_pagamentos_tenant ON public.pagamentos USING btree (tenant_id)` |
| idx_pagamentos_vencimento | btree | data_vencimento | não | sim |  | `CREATE INDEX idx_pagamentos_vencimento ON public.pagamentos USING btree (data_vencimento)` |
| idx_pagamentos_vencimento_status | btree | data_vencimento, status | não | sim |  | `CREATE INDEX idx_pagamentos_vencimento_status ON public.pagamentos USING btree (data_vencimento, status)` |
| pagamentos_numero_key | btree | numero | sim | sim |  | `CREATE UNIQUE INDEX pagamentos_numero_key ON public.pagamentos USING btree (numero)` |
| pagamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pagamentos_pkey ON public.pagamentos USING btree (id)` |


## Policies (RLS)

### `Finance and admin can view payments`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK |  |

### `Finance can manage payments`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `pagamentos_select_comprador`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'buyer'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_pagamentos`

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
| trg_audit_pagamentos | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_pagamento_changes |
| trg_sync_budget_payment | AFTER | INSERT OR UPDATE | ROW | enabled | public.sync_budget_on_payment |
| trg_update_pagamentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_update_saldo_on_pagamento | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trigger_update_saldo_on_pagamento |
| trg_validate_pagamento_status | BEFORE | UPDATE | ROW | enabled | public.validate_pagamento_status_transition |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
