# public.produtos

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
| 2 | `codigo` | `text` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `unidade` | `text` | não | `'un'::text` |  |  |
| 6 | `categoria_id` | `uuid` | sim |  |  |  |
| 7 | `preco_medio` | `numeric(12,2)` | sim | `0` |  |  |
| 8 | `estoque_minimo` | `integer` | sim | `0` |  |  |
| 9 | `ativo` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `preco_referencia` | `numeric` | sim | `0` |  |  |
| 13 | `ultimo_preco` | `numeric` | sim | `0` |  |  |
| 14 | `fornecedor_preferencial_id` | `uuid` | sim |  |  |  |
| 15 | `imagem_url` | `text` | sim |  |  |  |
| 16 | `tags` | `text[]` | sim | `'{}'::text[]` |  |  |
| 17 | `created_by` | `uuid` | sim |  |  |  |
| 18 | `codigo_unspsc` | `text` | sim |  |  |  |
| 19 | `codigo_cnae` | `text` | sim |  |  |  |
| 20 | `codigo_ncm` | `text` | sim |  |  |  |
| 21 | `organization_id` | `uuid` | sim |  |  |  |
| 22 | `tenant_id` | `uuid` | não |  |  |  |
| 23 | `tipo_produto` | `tipo_produto_enum` | sim | `'fabricado'::tipo_produto_enum` |  |  |
| 24 | `lead_time_dias` | `integer` | sim | `0` |  |  |
| 25 | `localizacao_coleta` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| produtos_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| produtos_codigo_key | UNIQUE | `UNIQUE (codigo)` |  |  | sim |
| produtos_fornecedor_preferencial_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_preferencial_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| produtos_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| produtos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| produtos_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.estoque | estoque_produto_id_fkey | produto_id | CASCADE |
| public.pedido_itens | pedido_itens_produto_id_fkey | produto_id | NO ACTION |
| public.produto_fornecedores | produto_fornecedores_produto_id_fkey | produto_id | CASCADE |
| public.repurchase_suggestions | repurchase_suggestions_produto_id_fkey | produto_id | NO ACTION |
| public.solicitacoes | solicitacoes_produto_id_fkey | produto_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_produtos_categoria | btree | categoria_id | não | sim |  | `CREATE INDEX idx_produtos_categoria ON public.produtos USING btree (categoria_id)` |
| idx_produtos_cnae | btree | codigo_cnae | não | sim |  | `CREATE INDEX idx_produtos_cnae ON public.produtos USING btree (codigo_cnae)` |
| idx_produtos_fornecedor_preferencial_id | btree | fornecedor_preferencial_id | não | sim |  | `CREATE INDEX idx_produtos_fornecedor_preferencial_id ON public.produtos USING btree (fornecedor_preferencial_id)` |
| idx_produtos_org_ativo_nome | btree | organization_id, ativo, nome | não | sim |  | `CREATE INDEX idx_produtos_org_ativo_nome ON public.produtos USING btree (organization_id, ativo, nome)` |
| idx_produtos_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_produtos_tenant ON public.produtos USING btree (tenant_id)` |
| idx_produtos_unspsc | btree | codigo_unspsc | não | sim |  | `CREATE INDEX idx_produtos_unspsc ON public.produtos USING btree (codigo_unspsc)` |
| produtos_codigo_key | btree | codigo | sim | sim |  | `CREATE UNIQUE INDEX produtos_codigo_key ON public.produtos USING btree (codigo)` |
| produtos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX produtos_pkey ON public.produtos USING btree (id)` |


## Policies (RLS)

### `Admin coordinator can manage produtos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `Buyers coordinators admins can manage products`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `tenant_isolation_produtos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| update_produtos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
