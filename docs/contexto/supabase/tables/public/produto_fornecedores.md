# public.produto_fornecedores

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
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `organization_id` | `uuid` | sim |  |  |  |
| 4 | `produto_id` | `uuid` | não |  |  |  |
| 5 | `fornecedor_id` | `uuid` | não |  |  |  |
| 6 | `preco_custo` | `numeric(15,2)` | sim |  |  |  |
| 7 | `lead_time_estimado` | `integer` | sim |  |  |  |
| 8 | `codigo_no_fornecedor` | `text` | sim |  |  |  |
| 9 | `preferencial` | `boolean` | sim | `false` |  |  |
| 10 | `ultima_cotacao_id` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| produto_fornecedores_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| produto_fornecedores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| produto_fornecedores_produto_id_fkey | FOREIGN KEY | `FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| produto_fornecedores_produto_id_fornecedor_id_key | UNIQUE | `UNIQUE (produto_id, fornecedor_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_produto_fornecedores_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_produto_fornecedores_fornecedor_id ON public.produto_fornecedores USING btree (fornecedor_id)` |
| produto_fornecedores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX produto_fornecedores_pkey ON public.produto_fornecedores USING btree (id)` |
| produto_fornecedores_produto_id_fornecedor_id_key | btree | produto_id, fornecedor_id | sim | sim |  | `CREATE UNIQUE INDEX produto_fornecedores_produto_id_fornecedor_id_key ON public.produto_fornecedores USING btree (produto_id, fornecedor_id)` |


## Policies (RLS)

### `Users can view product suppliers within tenant`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM profiles p   WHERE ((p.user_id = auth.uid()) AND (p.tenant_id = produto_fornecedores.tenant_id))))` |
| WITH CHECK |  |

### `produto_fornecedores_escrita_papeis`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| update_produto_fornecedores_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
