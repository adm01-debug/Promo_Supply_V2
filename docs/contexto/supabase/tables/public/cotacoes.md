# public.cotacoes

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `numero` | `text` | não |  |  |  |
| 3 | `solicitacao_id` | `uuid` | sim |  |  |  |
| 4 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 5 | `valor_unitario` | `numeric(12,2)` | não |  |  |  |
| 6 | `quantidade` | `integer` | não | `1` |  |  |
| 7 | `valor_total` | `numeric(12,2)` | não |  |  |  |
| 8 | `valor_frete` | `numeric(12,2)` | sim | `0` |  |  |
| 9 | `desconto_percentual` | `numeric(5,2)` | sim | `0` |  |  |
| 10 | `prazo_entrega` | `integer` | não | `7` |  |  |
| 11 | `validade_proposta` | `date` | sim |  |  |  |
| 12 | `condicao_pagamento` | `text` | sim |  |  |  |
| 13 | `status` | `text` | não | `'pendente'::text` |  |  |
| 14 | `selecionada` | `boolean` | sim | `false` |  |  |
| 15 | `score_preco` | `numeric(5,2)` | sim | `0` |  |  |
| 16 | `score_prazo` | `numeric(5,2)` | sim | `0` |  |  |
| 17 | `score_qualidade` | `numeric(5,2)` | sim | `0` |  |  |
| 18 | `score_total` | `numeric(5,2)` | sim | `0` |  |  |
| 19 | `observacoes` | `text` | sim |  |  |  |
| 20 | `anexos` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 21 | `avaliador_id` | `uuid` | sim |  |  |  |
| 22 | `data_avaliacao` | `timestamp with time zone` | sim |  |  |  |
| 23 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 24 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 25 | `moeda` | `text` | sim | `'BRL'::text` |  |  |
| 26 | `taxa_conversao` | `numeric` | sim | `1.0` |  |  |
| 27 | `organization_id` | `uuid` | sim |  |  |  |
| 28 | `justificativa_selecao` | `text` | sim |  |  |  |
| 29 | `tenant_id` | `uuid` | não |  |  |  |
| 30 | `currency` | `character(3)` | não | `'BRL'::bpchar` |  |  |
| 31 | `last_follow_up_at` | `timestamp with time zone` | sim |  |  |  |
| 32 | `follow_up_status` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cotacoes_avaliador_id_fkey | FOREIGN KEY | `FOREIGN KEY (avaliador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| cotacoes_currency_fkey | FOREIGN KEY | `FOREIGN KEY (currency) REFERENCES currencies(code) NOT VALID` | NO ACTION | NO ACTION | não |
| cotacoes_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| cotacoes_numero_key | UNIQUE | `UNIQUE (numero)` |  |  | sim |
| cotacoes_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| cotacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cotacoes_solicitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| cotacoes_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'analisando'::text, 'aprovada'::text, 'rejeitada'::text, 'expirada'::text]))` |  |  | sim |
| cotacoes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.negotiation_analyses | negotiation_analyses_cotacao_id_fkey | cotacao_id | NO ACTION |
| public.pedidos | pedidos_cotacao_id_fkey | cotacao_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cotacoes_numero_key | btree | numero | sim | sim |  | `CREATE UNIQUE INDEX cotacoes_numero_key ON public.cotacoes USING btree (numero)` |
| cotacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cotacoes_pkey ON public.cotacoes USING btree (id)` |
| idx_cotacoes_avaliador_id | btree | avaliador_id | não | sim |  | `CREATE INDEX idx_cotacoes_avaliador_id ON public.cotacoes USING btree (avaliador_id)` |
| idx_cotacoes_currency | btree | currency | não | sim |  | `CREATE INDEX idx_cotacoes_currency ON public.cotacoes USING btree (currency)` |
| idx_cotacoes_dashboard | btree | status, created_at | não | sim |  | `CREATE INDEX idx_cotacoes_dashboard ON public.cotacoes USING btree (status, created_at)` |
| idx_cotacoes_follow_up_status | btree | follow_up_status | não | sim |  | `CREATE INDEX idx_cotacoes_follow_up_status ON public.cotacoes USING btree (follow_up_status)` |
| idx_cotacoes_fornecedor | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_cotacoes_fornecedor ON public.cotacoes USING btree (fornecedor_id)` |
| idx_cotacoes_fornecedor_created | btree | fornecedor_id, created_at | não | sim |  | `CREATE INDEX idx_cotacoes_fornecedor_created ON public.cotacoes USING btree (fornecedor_id, created_at DESC)` |
| idx_cotacoes_org_status | btree | organization_id, status | não | sim |  | `CREATE INDEX idx_cotacoes_org_status ON public.cotacoes USING btree (organization_id, status)` |
| idx_cotacoes_solicitacao | btree | solicitacao_id | não | sim |  | `CREATE INDEX idx_cotacoes_solicitacao ON public.cotacoes USING btree (solicitacao_id)` |
| idx_cotacoes_solicitacao_fornecedor | btree | solicitacao_id, fornecedor_id | não | sim |  | `CREATE INDEX idx_cotacoes_solicitacao_fornecedor ON public.cotacoes USING btree (solicitacao_id, fornecedor_id)` |
| idx_cotacoes_status | btree | status | não | sim |  | `CREATE INDEX idx_cotacoes_status ON public.cotacoes USING btree (status)` |
| idx_cotacoes_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_cotacoes_tenant ON public.cotacoes USING btree (tenant_id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage quotations`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `Role-restricted quotation access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK |  |

### `tenant_isolation_cotacoes`

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
| tr_log_cotacao_selection | AFTER | UPDATE | ROW | enabled | public.log_cotacao_action |
| trg_auto_transition_on_cotacao_approval | AFTER | UPDATE | ROW | enabled | public.auto_transition_solicitacao_on_cotacao_approval |
| trg_calculate_cotacao_scores | BEFORE | INSERT OR UPDATE | ROW | enabled | public.calculate_cotacao_scores |
| trg_cotacao_approved_status | AFTER | UPDATE | ROW | enabled | public.trg_cotacao_approved_transition |
| trg_recalculate_all_cotacoes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.recalculate_all_solicitacao_cotacoes |
| trg_update_cotacoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_validate_cotacao_status | BEFORE | UPDATE | ROW | enabled | public.validate_cotacao_status_transition |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
