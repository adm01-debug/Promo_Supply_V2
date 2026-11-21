# public.repurchase_suggestions

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `produto_id` | `uuid` | sim |  |  |  |
| 3 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 4 | `ultimo_pedido_id` | `uuid` | sim |  |  |  |
| 5 | `quantidade_sugerida` | `integer` | não | `1` |  |  |
| 6 | `preco_estimado` | `numeric` | sim | `0` |  |  |
| 7 | `frequencia_dias` | `integer` | sim |  |  |  |
| 8 | `proxima_compra_estimada` | `date` | sim |  |  |  |
| 9 | `confianca_score` | `numeric` | sim | `0` |  |  |
| 10 | `status` | `text` | não | `'sugerido'::text` |  |  |
| 11 | `descartado_motivo` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `tenant_id` | `uuid` | não | `current_tenant_id()` |  |  |
| 15 | `pim_product_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| repurchase_suggestions_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) NOT VALID` | NO ACTION | NO ACTION | não |
| repurchase_suggestions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| repurchase_suggestions_produto_id_fkey | FOREIGN KEY | `FOREIGN KEY (produto_id) REFERENCES produtos(id) NOT VALID` | NO ACTION | NO ACTION | não |
| repurchase_suggestions_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |
| repurchase_suggestions_ultimo_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (ultimo_pedido_id) REFERENCES pedidos(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_repurchase_suggestions_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_repurchase_suggestions_fornecedor_id ON public.repurchase_suggestions USING btree (fornecedor_id)` |
| idx_repurchase_suggestions_produto_id | btree | produto_id | não | sim |  | `CREATE INDEX idx_repurchase_suggestions_produto_id ON public.repurchase_suggestions USING btree (produto_id)` |
| idx_repurchase_suggestions_tenant_status | btree | tenant_id, status, proxima_compra_estimada | não | sim |  | `CREATE INDEX idx_repurchase_suggestions_tenant_status ON public.repurchase_suggestions USING btree (tenant_id, status, proxima_compra_estimada)` |
| idx_repurchase_suggestions_ultimo_pedido_id | btree | ultimo_pedido_id | não | sim |  | `CREATE INDEX idx_repurchase_suggestions_ultimo_pedido_id ON public.repurchase_suggestions USING btree (ultimo_pedido_id)` |
| repurchase_suggestions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX repurchase_suggestions_pkey ON public.repurchase_suggestions USING btree (id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage repurchase suggestions wi`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `Users can view repurchase suggestions within tenant`

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
| update_repurchase_suggestions_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
