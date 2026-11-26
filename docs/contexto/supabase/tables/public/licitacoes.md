# public.licitacoes

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
| 2 | `numero` | `text` | não |  |  |  |
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `modalidade` | `text` | não | `'pregao'::text` |  |  |
| 6 | `tipo` | `text` | não | `'menor_preco'::text` |  |  |
| 7 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 8 | `data_publicacao` | `timestamp with time zone` | sim |  |  |  |
| 9 | `data_abertura` | `timestamp with time zone` | sim |  |  |  |
| 10 | `data_encerramento` | `timestamp with time zone` | sim |  |  |  |
| 11 | `valor_estimado` | `numeric` | sim | `0` |  |  |
| 12 | `valor_vencedor` | `numeric` | sim |  |  |  |
| 13 | `fornecedor_vencedor_id` | `uuid` | sim |  |  |  |
| 14 | `objeto` | `text` | sim |  |  |  |
| 15 | `edital_url` | `text` | sim |  |  |  |
| 16 | `documentos_exigidos` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 17 | `criterios_avaliacao` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 18 | `observacoes` | `text` | sim |  |  |  |
| 19 | `responsavel_id` | `uuid` | sim |  |  |  |
| 20 | `created_by` | `uuid` | sim |  |  |  |
| 21 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 23 | `lance_minimo_decremento` | `numeric(15,2)` | sim | `0.01` |  |  |
| 24 | `is_live` | `boolean` | sim | `false` |  |  |
| 25 | `current_best_bid` | `numeric(15,2)` | sim |  |  |  |
| 26 | `organization_id` | `uuid` | sim |  |  |  |
| 27 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| licitacoes_fornecedor_vencedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_vencedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| licitacoes_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| licitacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| licitacoes_responsavel_id_fkey | FOREIGN KEY | `FOREIGN KEY (responsavel_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| licitacoes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.licitacao_lances | licitacao_lances_licitacao_id_fkey | licitacao_id | CASCADE |
| public.licitacao_propostas | licitacao_propostas_licitacao_id_fkey | licitacao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_licitacoes_fornecedor_vencedor_id | btree | fornecedor_vencedor_id | não | sim |  | `CREATE INDEX idx_licitacoes_fornecedor_vencedor_id ON public.licitacoes USING btree (fornecedor_vencedor_id)` |
| idx_licitacoes_modalidade | btree | modalidade | não | sim |  | `CREATE INDEX idx_licitacoes_modalidade ON public.licitacoes USING btree (modalidade)` |
| idx_licitacoes_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_licitacoes_organization_id ON public.licitacoes USING btree (organization_id)` |
| idx_licitacoes_status | btree | status | não | sim |  | `CREATE INDEX idx_licitacoes_status ON public.licitacoes USING btree (status)` |
| idx_licitacoes_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_licitacoes_tenant_id ON public.licitacoes USING btree (tenant_id)` |
| licitacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX licitacoes_pkey ON public.licitacoes USING btree (id)` |
| uq_licitacoes_tenant_numero | btree | tenant_id, numero | sim | sim |  | `CREATE UNIQUE INDEX uq_licitacoes_tenant_numero ON public.licitacoes USING btree (tenant_id, numero)` |


## Policies (RLS)

### `Admins and coordinators can manage licitacoes`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `licitacoes_select_comprador`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'buyer'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_licitacoes`

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
| update_licitacoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
