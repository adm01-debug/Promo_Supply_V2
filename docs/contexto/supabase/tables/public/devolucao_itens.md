# public.devolucao_itens

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
| 2 | `devolucao_id` | `uuid` | não |  |  |  |
| 3 | `pedido_item_id` | `uuid` | sim |  |  |  |
| 4 | `descricao` | `text` | não |  |  |  |
| 5 | `quantidade` | `integer` | não | `1` |  |  |
| 6 | `quantidade_aceita` | `integer` | sim |  |  |  |
| 7 | `valor_unitario` | `numeric` | não | `0` |  |  |
| 8 | `valor_total` | `numeric` | não | `0` |  |  |
| 9 | `motivo` | `text` | não | `'defeito'::text` |  |  |
| 10 | `estado_item` | `text` | sim | `'pendente'::text` |  |  |
| 11 | `fotos` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| devolucao_itens_devolucao_id_fkey | FOREIGN KEY | `FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| devolucao_itens_pedido_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_item_id) REFERENCES pedido_itens(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| devolucao_itens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| devolucao_itens_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| devolucao_itens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX devolucao_itens_pkey ON public.devolucao_itens USING btree (id)` |
| idx_devolucao_itens_devolucao | btree | devolucao_id | não | sim |  | `CREATE INDEX idx_devolucao_itens_devolucao ON public.devolucao_itens USING btree (devolucao_id)` |
| idx_devolucao_itens_pedido_item_id | btree | pedido_item_id | não | sim |  | `CREATE INDEX idx_devolucao_itens_pedido_item_id ON public.devolucao_itens USING btree (pedido_item_id)` |
| idx_devolucao_itens_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_devolucao_itens_tenant_id ON public.devolucao_itens USING btree (tenant_id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage return items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `Finance can view return items`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'finance'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_devolucao_itens`

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
