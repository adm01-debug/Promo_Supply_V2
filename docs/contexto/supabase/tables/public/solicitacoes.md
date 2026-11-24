# public.solicitacoes

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 9 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `numero` | `text` | não |  |  |  |
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `tipo` | `text` | não | `'material'::text` |  |  |
| 6 | `status` | `text` | não | `'pendente'::text` |  |  |
| 7 | `prioridade` | `text` | não | `'media'::text` |  |  |
| 8 | `valor_estimado` | `numeric(12,2)` | sim |  |  |  |
| 9 | `valor_aprovado` | `numeric(12,2)` | sim |  |  |  |
| 10 | `quantidade` | `integer` | não | `1` |  |  |
| 11 | `unidade` | `text` | sim | `'un'::text` |  |  |
| 12 | `data_necessidade` | `date` | sim |  |  |  |
| 13 | `data_aprovacao` | `timestamp with time zone` | sim |  |  |  |
| 14 | `data_conclusao` | `timestamp with time zone` | sim |  |  |  |
| 15 | `solicitante_id` | `uuid` | sim |  |  |  |
| 16 | `aprovador_id` | `uuid` | sim |  |  |  |
| 17 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 18 | `categoria_id` | `uuid` | sim |  |  |  |
| 19 | `departamento` | `text` | sim |  |  |  |
| 20 | `centro_custo` | `text` | sim |  |  |  |
| 21 | `justificativa` | `text` | sim |  |  |  |
| 22 | `observacoes` | `text` | sim |  |  |  |
| 23 | `anexos` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 24 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 25 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 26 | `organization_id` | `uuid` | sim |  |  |  |
| 27 | `cost_center_id` | `uuid` | sim |  |  |  |
| 28 | `tenant_id` | `uuid` | não |  |  |  |
| 29 | `produto_id` | `uuid` | sim |  |  |  |
| 30 | `pim_product_id` | `uuid` | sim |  |  |  |
| 31 | `pim_variant_id` | `uuid` | sim |  |  |  |
| 32 | `external_ref` | `text` | sim |  |  | Chave de idempotencia da origem externa (ex.: service_orders.id do Promo Design). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| solicitacoes_aprovador_id_fkey | FOREIGN KEY | `FOREIGN KEY (aprovador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_numero_key | UNIQUE | `UNIQUE (numero)` |  |  | sim |
| solicitacoes_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| solicitacoes_prioridade_check | CHECK | `CHECK (prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text, 'urgente'::text]))` |  |  | sim |
| solicitacoes_produto_id_fkey | FOREIGN KEY | `FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| solicitacoes_solicitante_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitante_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'em_cotacao'::text, 'aprovada'::text, 'rejeitada'::text, 'em_andamento'::text, 'concluida'::text, 'cancelada'::text]))` |  |  | sim |
| solicitacoes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['material'::text, 'servico'::text, 'equipamento'::text, 'urgente'::text, 'contrato'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_history | approval_history_solicitacao_id_fkey | solicitacao_id | SET NULL |
| public.approval_workflows | approval_workflows_solicitacao_id_fkey | solicitacao_id | CASCADE |
| public.cotacoes | cotacoes_solicitacao_id_fkey | solicitacao_id | CASCADE |
| public.negotiation_analyses | negotiation_analyses_solicitacao_id_fkey | solicitacao_id | NO ACTION |
| public.pedidos | pedidos_solicitacao_id_fkey | solicitacao_id | NO ACTION |
| public.punchout_sessions | punchout_sessions_created_solicitacao_id_fkey | created_solicitacao_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_solicitacoes_aprovador | btree | aprovador_id | não | sim |  | `CREATE INDEX idx_solicitacoes_aprovador ON public.solicitacoes USING btree (aprovador_id)` |
| idx_solicitacoes_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_solicitacoes_categoria_id ON public.solicitacoes USING btree (categoria_id)` |
| idx_solicitacoes_cost_center | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_solicitacoes_cost_center ON public.solicitacoes USING btree (cost_center_id)` |
| idx_solicitacoes_dashboard | btree | status, created_at | não | sim |  | `CREATE INDEX idx_solicitacoes_dashboard ON public.solicitacoes USING btree (status, created_at)` |
| idx_solicitacoes_data | btree | created_at | não | sim |  | `CREATE INDEX idx_solicitacoes_data ON public.solicitacoes USING btree (created_at DESC)` |
| idx_solicitacoes_external_ref | btree | external_ref | sim | sim | `(external_ref IS NOT NULL)` | `CREATE UNIQUE INDEX idx_solicitacoes_external_ref ON public.solicitacoes USING btree (external_ref) WHERE (external_ref IS NOT NULL)` |
| idx_solicitacoes_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_solicitacoes_fornecedor_id ON public.solicitacoes USING btree (fornecedor_id)` |
| idx_solicitacoes_org_status_created | btree | organization_id, status, created_at | não | sim |  | `CREATE INDEX idx_solicitacoes_org_status_created ON public.solicitacoes USING btree (organization_id, status, created_at DESC)` |
| idx_solicitacoes_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_solicitacoes_organization_id ON public.solicitacoes USING btree (organization_id)` |
| idx_solicitacoes_pim_product_id | btree | pim_product_id | não | sim |  | `CREATE INDEX idx_solicitacoes_pim_product_id ON public.solicitacoes USING btree (pim_product_id)` |
| idx_solicitacoes_produto_id | btree | produto_id | não | sim |  | `CREATE INDEX idx_solicitacoes_produto_id ON public.solicitacoes USING btree (produto_id)` |
| idx_solicitacoes_solicitante | btree | solicitante_id | não | sim |  | `CREATE INDEX idx_solicitacoes_solicitante ON public.solicitacoes USING btree (solicitante_id)` |
| idx_solicitacoes_status | btree | status | não | sim |  | `CREATE INDEX idx_solicitacoes_status ON public.solicitacoes USING btree (status)` |
| idx_solicitacoes_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_solicitacoes_tenant ON public.solicitacoes USING btree (tenant_id)` |
| idx_solicitacoes_tenant_priority | btree | tenant_id, prioridade | não | sim |  | `CREATE INDEX idx_solicitacoes_tenant_priority ON public.solicitacoes USING btree (tenant_id, prioridade)` |
| solicitacoes_numero_key | btree | numero | sim | sim |  | `CREATE UNIQUE INDEX solicitacoes_numero_key ON public.solicitacoes USING btree (numero)` |
| solicitacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX solicitacoes_pkey ON public.solicitacoes USING btree (id)` |


## Policies (RLS)

### `Only admins can delete requests`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Tenant isolation for solicitacoes`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT user_organizations.organization_id    FROM user_organizations   WHERE (user_organizations.user_id = auth.uid())))` |
| WITH CHECK |  |

### `Users can create requests`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(auth.uid() = solicitante_id)` |

### `Users can view their own requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = solicitante_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `solicitacoes_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `solicitacoes_update_admin_coord`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `solicitacoes_update_comprador_gera_ordem`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'buyer'::app_role) AND (status = 'aprovada'::text))` |
| WITH CHECK | `(has_role(auth.uid(), 'buyer'::app_role) AND (status = 'em_andamento'::text))` |

### `solicitacoes_update_proprias_nao_aprovadas`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((solicitante_id = auth.uid()) AND (status = ANY (ARRAY['pendente'::text, 'rejeitada'::text])))` |
| WITH CHECK | `((solicitante_id = auth.uid()) AND (status = ANY (ARRAY['pendente'::text, 'cancelada'::text])))` |

### `tenant_isolation_solicitacoes`

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
| a0_guard_solicitacao_escrita | BEFORE | INSERT OR UPDATE | ROW | enabled | public.guard_solicitacao_escrita |
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| trg_assign_numero_solicitacao | BEFORE | INSERT | ROW | enabled | public.assign_numero_solicitacao |
| trg_auto_approve_low_value | BEFORE | INSERT | ROW | enabled | public.auto_approve_low_value_solicitacao |
| trg_update_budget_on_solicitacao | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.update_budget_on_solicitacao_change |
| trg_update_solicitacoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_validate_solicitacao_status | BEFORE | UPDATE | ROW | enabled | public.validate_solicitacao_status_transition |
| validate_solicitacao_status | BEFORE | UPDATE | ROW | enabled | public.validate_solicitacao_status_transition |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
