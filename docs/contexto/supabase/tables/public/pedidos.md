# public.pedidos

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.mv_dashboard_kpis |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `numero` | `text` | não |  |  |  |
| 3 | `solicitacao_id` | `uuid` | sim |  |  |  |
| 4 | `cotacao_id` | `uuid` | sim |  |  |  |
| 5 | `fornecedor_id` | `uuid` | não |  |  |  |
| 6 | `valor_total` | `numeric(12,2)` | não |  |  |  |
| 7 | `valor_frete` | `numeric(12,2)` | sim | `0` |  |  |
| 8 | `desconto` | `numeric(12,2)` | sim | `0` |  |  |
| 9 | `status` | `text` | não | `'pendente'::text` |  |  |
| 10 | `data_emissao` | `date` | não | `CURRENT_DATE` |  |  |
| 11 | `data_previsao` | `date` | sim |  |  |  |
| 12 | `data_entrega` | `date` | sim |  |  |  |
| 13 | `codigo_rastreamento` | `text` | sim |  |  |  |
| 14 | `transportadora` | `text` | sim |  |  |  |
| 15 | `endereco_entrega` | `text` | sim |  |  |  |
| 16 | `condicao_pagamento` | `text` | sim |  |  |  |
| 17 | `observacoes` | `text` | sim |  |  |  |
| 18 | `comprador_id` | `uuid` | sim |  |  |  |
| 19 | `aprovador_id` | `uuid` | sim |  |  |  |
| 20 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `moeda` | `text` | sim | `'BRL'::text` |  |  |
| 23 | `taxa_conversao` | `numeric` | sim | `1.0` |  |  |
| 24 | `organization_id` | `uuid` | sim |  |  |  |
| 25 | `tenant_id` | `uuid` | não |  |  |  |
| 26 | `currency` | `character(3)` | não | `'BRL'::bpchar` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pedidos_aprovador_id_fkey | FOREIGN KEY | `FOREIGN KEY (aprovador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| pedidos_comprador_id_fkey | FOREIGN KEY | `FOREIGN KEY (comprador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| pedidos_cotacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id)` | NO ACTION | NO ACTION | sim |
| pedidos_currency_fkey | FOREIGN KEY | `FOREIGN KEY (currency) REFERENCES currencies(code) NOT VALID` | NO ACTION | NO ACTION | não |
| pedidos_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| pedidos_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| pedidos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pedidos_solicitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id)` | NO ACTION | NO ACTION | sim |
| pedidos_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'enviado'::text, 'em_transito'::text, 'entregue'::text, 'parcial'::text, 'cancelado'::text]))` |  |  | sim |
| pedidos_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contract_penalties | contract_penalties_pedido_id_fkey | pedido_id | NO ACTION |
| public.devolucoes | devolucoes_pedido_id_fkey | pedido_id | SET NULL |
| public.fiscal_documents | fiscal_documents_pedido_id_fkey | pedido_id | NO ACTION |
| public.pagamentos | pagamentos_pedido_id_fkey | pedido_id | NO ACTION |
| public.pedido_itens | pedido_itens_pedido_id_fkey | pedido_id | CASCADE |
| public.receiving_checklists | receiving_checklists_pedido_id_fkey | pedido_id | CASCADE |
| public.repurchase_suggestions | repurchase_suggestions_ultimo_pedido_id_fkey | ultimo_pedido_id | NO ACTION |
| public.sourcing_awards | sourcing_awards_pedido_id_fkey | pedido_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pedidos_aprovador_id | btree | aprovador_id | não | sim |  | `CREATE INDEX idx_pedidos_aprovador_id ON public.pedidos USING btree (aprovador_id)` |
| idx_pedidos_comprador_id | btree | comprador_id | não | sim |  | `CREATE INDEX idx_pedidos_comprador_id ON public.pedidos USING btree (comprador_id)` |
| idx_pedidos_cotacao_id | btree | cotacao_id | não | sim |  | `CREATE INDEX idx_pedidos_cotacao_id ON public.pedidos USING btree (cotacao_id)` |
| idx_pedidos_currency | btree | currency | não | sim |  | `CREATE INDEX idx_pedidos_currency ON public.pedidos USING btree (currency)` |
| idx_pedidos_dashboard | btree | status, data_emissao | não | sim |  | `CREATE INDEX idx_pedidos_dashboard ON public.pedidos USING btree (status, data_emissao)` |
| idx_pedidos_data | btree | data_emissao | não | sim |  | `CREATE INDEX idx_pedidos_data ON public.pedidos USING btree (data_emissao DESC)` |
| idx_pedidos_fornecedor_created | btree | fornecedor_id, created_at | não | sim |  | `CREATE INDEX idx_pedidos_fornecedor_created ON public.pedidos USING btree (fornecedor_id, created_at DESC)` |
| idx_pedidos_org_status_created | btree | organization_id, status, created_at | não | sim |  | `CREATE INDEX idx_pedidos_org_status_created ON public.pedidos USING btree (organization_id, status, created_at DESC)` |
| idx_pedidos_solicitacao_id | btree | solicitacao_id | não | sim |  | `CREATE INDEX idx_pedidos_solicitacao_id ON public.pedidos USING btree (solicitacao_id)` |
| idx_pedidos_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_pedidos_tenant ON public.pedidos USING btree (tenant_id)` |
| idx_pedidos_tenant_status | btree | tenant_id, status | não | sim |  | `CREATE INDEX idx_pedidos_tenant_status ON public.pedidos USING btree (tenant_id, status)` |
| pedidos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pedidos_pkey ON public.pedidos USING btree (id)` |
| uq_pedidos_tenant_numero | btree | tenant_id, numero | sim | sim |  | `CREATE UNIQUE INDEX uq_pedidos_tenant_numero ON public.pedidos USING btree (tenant_id, numero)` |


## Policies (RLS)

### `Buyers coordinators admins can manage orders`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `Role-restricted order access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK |  |

### `tenant_isolation_pedidos`

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
| a1_guard_pedido_exige_solicitacao_aprovada | BEFORE | INSERT | ROW | enabled | public.guard_pedido_exige_solicitacao_aprovada |
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| trg_auto_create_pagamento_on_delivery | AFTER | UPDATE | ROW | enabled | public.auto_create_pagamento_on_delivery |
| trg_auto_penalty_on_late_delivery | AFTER | UPDATE | ROW | enabled | public.auto_calculate_delivery_penalty |
| trg_auto_update_supplier_score | AFTER | UPDATE | ROW | enabled | public.auto_update_supplier_score_on_delivery |
| trg_pedido_budget_sync | AFTER | INSERT OR UPDATE | ROW | enabled | public.handle_pedido_budget_realization |
| trg_pedido_created_status | AFTER | INSERT | ROW | enabled | public.auto_transition_solicitacao_on_pedido_created |
| trg_pedido_entregue_status | AFTER | UPDATE | ROW | enabled | public.trg_pedido_entregue_transition |
| trg_update_pedidos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_update_saldo_on_pedido | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trigger_update_saldo_on_pedido |
| validate_pedido_status | BEFORE | UPDATE | ROW | enabled | public.validate_pedido_status_transition |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
