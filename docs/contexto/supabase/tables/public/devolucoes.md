# public.devolucoes

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
| 3 | `pedido_id` | `uuid` | sim |  |  |  |
| 4 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 5 | `solicitante_id` | `uuid` | sim |  |  |  |
| 6 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 7 | `tipo` | `text` | não | `'devolucao'::text` |  |  |
| 8 | `motivo` | `text` | não | `'defeito'::text` |  |  |
| 9 | `motivo_detalhe` | `text` | sim |  |  |  |
| 10 | `valor_total` | `numeric` | não | `0` |  |  |
| 11 | `data_solicitacao` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `data_aprovacao` | `timestamp with time zone` | sim |  |  |  |
| 13 | `data_envio` | `timestamp with time zone` | sim |  |  |  |
| 14 | `data_recebimento_fornecedor` | `timestamp with time zone` | sim |  |  |  |
| 15 | `aprovador_id` | `uuid` | sim |  |  |  |
| 16 | `codigo_rastreamento` | `text` | sim |  |  |  |
| 17 | `transportadora` | `text` | sim |  |  |  |
| 18 | `nf_devolucao` | `text` | sim |  |  |  |
| 19 | `resolucao` | `text` | sim | `'credito'::text` |  |  |
| 20 | `observacoes` | `text` | sim |  |  |  |
| 21 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 23 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| devolucoes_aprovador_id_fkey | FOREIGN KEY | `FOREIGN KEY (aprovador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| devolucoes_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| devolucoes_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| devolucoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| devolucoes_solicitante_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitante_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| devolucoes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.creditos_fornecedor | creditos_fornecedor_devolucao_id_fkey | devolucao_id | SET NULL |
| public.devolucao_itens | devolucao_itens_devolucao_id_fkey | devolucao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| devolucoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX devolucoes_pkey ON public.devolucoes USING btree (id)` |
| idx_devolucoes_fornecedor | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_devolucoes_fornecedor ON public.devolucoes USING btree (fornecedor_id)` |
| idx_devolucoes_pedido | btree | pedido_id | não | sim |  | `CREATE INDEX idx_devolucoes_pedido ON public.devolucoes USING btree (pedido_id)` |
| idx_devolucoes_status | btree | status | não | sim |  | `CREATE INDEX idx_devolucoes_status ON public.devolucoes USING btree (status)` |
| idx_devolucoes_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_devolucoes_tenant_id ON public.devolucoes USING btree (tenant_id)` |
| uq_devolucoes_tenant_numero | btree | tenant_id, numero | sim | sim |  | `CREATE UNIQUE INDEX uq_devolucoes_tenant_numero ON public.devolucoes USING btree (tenant_id, numero)` |


## Policies (RLS)

### `Buyers coordinators admins can manage returns`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `Finance can view returns`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'finance'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_devolucoes`

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
| set_devolucoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
