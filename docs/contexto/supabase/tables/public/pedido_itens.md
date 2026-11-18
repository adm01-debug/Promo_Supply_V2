# public.pedido_itens

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
| 2 | `pedido_id` | `uuid` | sim |  |  |  |
| 3 | `produto_id` | `uuid` | sim |  |  |  |
| 4 | `descricao` | `text` | não |  |  |  |
| 5 | `quantidade` | `integer` | não | `1` |  |  |
| 6 | `unidade` | `text` | sim | `'un'::text` |  |  |
| 7 | `valor_unitario` | `numeric(12,2)` | não |  |  |  |
| 8 | `valor_total` | `numeric(12,2)` | não |  |  |  |
| 9 | `quantidade_recebida` | `integer` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `tenant_id` | `uuid` | não |  |  |  |
| 12 | `unspsc_code` | `text` | sim |  |  |  |
| 13 | `status_producao` | `status_producao_enum` | sim | `'pendente'::status_producao_enum` |  |  |
| 14 | `data_previsao_producao` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pedido_itens_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pedido_itens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pedido_itens_produto_id_fkey | FOREIGN KEY | `FOREIGN KEY (produto_id) REFERENCES produtos(id)` | NO ACTION | NO ACTION | sim |
| pedido_itens_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| pedido_itens_unspsc_code_fkey | FOREIGN KEY | `FOREIGN KEY (unspsc_code) REFERENCES unspsc_codes(code)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.devolucao_itens | devolucao_itens_pedido_item_id_fkey | pedido_item_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pedido_itens_pedido_id | btree | pedido_id | não | sim |  | `CREATE INDEX idx_pedido_itens_pedido_id ON public.pedido_itens USING btree (pedido_id)` |
| idx_pedido_itens_produto_id | btree | produto_id | não | sim |  | `CREATE INDEX idx_pedido_itens_produto_id ON public.pedido_itens USING btree (produto_id)` |
| idx_pedido_itens_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_pedido_itens_tenant ON public.pedido_itens USING btree (tenant_id)` |
| idx_pedido_itens_unspsc | btree | unspsc_code | não | sim |  | `CREATE INDEX idx_pedido_itens_unspsc ON public.pedido_itens USING btree (unspsc_code)` |
| pedido_itens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pedido_itens_pkey ON public.pedido_itens USING btree (id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage order items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `Role-restricted order items access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_pedido_itens`

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


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
