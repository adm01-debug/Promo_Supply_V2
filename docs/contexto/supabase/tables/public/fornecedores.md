# public.fornecedores

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
| usada por views | public.supplier_compliance_summary |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `codigo` | `text` | não |  |  |  |
| 3 | `razao_social` | `text` | não |  |  |  |
| 4 | `nome_fantasia` | `text` | sim |  |  |  |
| 5 | `cnpj` | `text` | sim |  |  |  |
| 6 | `email` | `text` | sim |  |  |  |
| 7 | `telefone` | `text` | sim |  |  |  |
| 8 | `endereco` | `text` | sim |  |  |  |
| 9 | `cidade` | `text` | sim |  |  |  |
| 10 | `estado` | `text` | sim |  |  |  |
| 11 | `cep` | `text` | sim |  |  |  |
| 12 | `website` | `text` | sim |  |  |  |
| 13 | `tipo` | `text` | não | `'nacional'::text` |  |  |
| 14 | `segmento` | `text` | sim |  |  |  |
| 15 | `avaliacao` | `numeric(3,2)` | sim | `0` |  |  |
| 16 | `prazo_medio_entrega` | `integer` | sim | `7` |  |  |
| 17 | `condicoes_pagamento` | `text` | sim |  |  |  |
| 18 | `integrado_api` | `boolean` | sim | `false` |  |  |
| 19 | `api_endpoint` | `text` | sim |  |  |  |
| 20 | `status` | `text` | não | `'ativo'::text` |  |  |
| 21 | `observacoes` | `text` | sim |  |  |  |
| 22 | `created_by` | `uuid` | sim |  |  |  |
| 23 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 24 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 25 | `limite_credito` | `numeric` | sim |  |  |  |
| 26 | `saldo_comprometido` | `numeric` | sim | `0` |  |  |
| 27 | `organization_id` | `uuid` | sim |  |  |  |
| 28 | `tenant_id` | `uuid` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fornecedores_avaliacao_check | CHECK | `CHECK (avaliacao >= 0::numeric AND avaliacao <= 5::numeric)` |  |  | sim |
| fornecedores_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| fornecedores_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| fornecedores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| fornecedores_status_check | CHECK | `CHECK (status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'bloqueado'::text, 'pendente'::text]))` |  |  | sim |
| fornecedores_telefone_e164_chk | CHECK | `CHECK (telefone IS NULL OR telefone ~ '^\+[1-9]\d{9,14}$'::text) NOT VALID` |  |  | não |
| fornecedores_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |
| fornecedores_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['nacional'::text, 'internacional'::text, 'local'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.auction_bids | auction_bids_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.contact_notes | contact_notes_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.cotacoes | cotacoes_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.creditos_fornecedor | creditos_fornecedor_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.devolucoes | devolucoes_fornecedor_id_fkey | fornecedor_id | SET NULL |
| public.fiscal_documents | fiscal_documents_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.fornecedor_categorias | fornecedor_categorias_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.licitacao_lances | licitacao_lances_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.licitacao_propostas | licitacao_propostas_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.licitacoes | licitacoes_fornecedor_vencedor_id_fkey | fornecedor_vencedor_id | NO ACTION |
| public.pagamentos | pagamentos_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.pedidos | pedidos_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.produto_fornecedores | produto_fornecedores_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.produtos | produtos_fornecedor_preferencial_id_fkey | fornecedor_preferencial_id | NO ACTION |
| public.punchout_catalogs | punchout_catalogs_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.qualification_history | qualification_history_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.receiving_checklists | receiving_checklists_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.repurchase_suggestions | repurchase_suggestions_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.solicitacoes | solicitacoes_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.sourcing_awards | sourcing_awards_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.sourcing_invitations | sourcing_invitations_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.sourcing_responses | sourcing_responses_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.supplier_bonifications | supplier_bonifications_fornecedor_id_fkey | fornecedor_id | NO ACTION |
| public.supplier_documents | supplier_documents_fornecedor_id_fkey | fornecedor_id | CASCADE |
| public.supplier_qualification_scores | supplier_qualification_scores_fornecedor_id_fkey | fornecedor_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fornecedores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fornecedores_pkey ON public.fornecedores USING btree (id)` |
| idx_fornecedores_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_fornecedores_created_by ON public.fornecedores USING btree (created_by)` |
| idx_fornecedores_email_lower | btree |  | não | sim | `(email IS NOT NULL)` | `CREATE INDEX idx_fornecedores_email_lower ON public.fornecedores USING btree (lower(email)) WHERE (email IS NOT NULL)` |
| idx_fornecedores_org_status_razao | btree | organization_id, status, razao_social | não | sim |  | `CREATE INDEX idx_fornecedores_org_status_razao ON public.fornecedores USING btree (organization_id, status, razao_social)` |
| idx_fornecedores_razao_lower | btree |  | não | sim | `(status = 'ativo'::text)` | `CREATE INDEX idx_fornecedores_razao_lower ON public.fornecedores USING btree (lower(razao_social)) WHERE (status = 'ativo'::text)` |
| idx_fornecedores_razao_social | btree | razao_social | não | sim |  | `CREATE INDEX idx_fornecedores_razao_social ON public.fornecedores USING btree (razao_social)` |
| idx_fornecedores_status | btree | status | não | sim |  | `CREATE INDEX idx_fornecedores_status ON public.fornecedores USING btree (status)` |
| idx_fornecedores_telefone | btree | telefone | não | sim | `(telefone IS NOT NULL)` | `CREATE INDEX idx_fornecedores_telefone ON public.fornecedores USING btree (telefone) WHERE (telefone IS NOT NULL)` |
| idx_fornecedores_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_fornecedores_tenant ON public.fornecedores USING btree (tenant_id)` |
| idx_fornecedores_tipo | btree | tipo | não | sim |  | `CREATE INDEX idx_fornecedores_tipo ON public.fornecedores USING btree (tipo)` |
| uq_fornecedores_tenant_cnpj | btree | tenant_id, cnpj | sim | sim | `(cnpj IS NOT NULL)` | `CREATE UNIQUE INDEX uq_fornecedores_tenant_cnpj ON public.fornecedores USING btree (tenant_id, cnpj) WHERE (cnpj IS NOT NULL)` |
| uq_fornecedores_tenant_codigo | btree | tenant_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX uq_fornecedores_tenant_codigo ON public.fornecedores USING btree (tenant_id, codigo)` |


## Policies (RLS)

### `Buyers coordinators admins can manage suppliers`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `Role-restricted supplier access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK |  |

### `tenant_isolation_fornecedores`

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
| trg_auto_block_low_score | AFTER | UPDATE | ROW | enabled | public.auto_block_low_score_supplier |
| trg_normalize_cnpj | BEFORE | INSERT OR UPDATE | ROW | enabled | public.normalize_cnpj_digits |
| trg_normalize_email | BEFORE | INSERT OR UPDATE | ROW | enabled | public.normalize_email_lowercase |
| trg_normalize_phone_fornecedores | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_normalize_phone |
| trg_update_fornecedores_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_validate_cnpj | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_fornecedores_validate_cnpj |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
