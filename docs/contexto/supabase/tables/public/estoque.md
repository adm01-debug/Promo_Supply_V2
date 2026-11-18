# public.estoque

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `produto_id` | `uuid` | não |  |  |  |
| 4 | `localizacao` | `text` | não | `'Geral'::text` |  |  |
| 5 | `quantidade_atual` | `numeric(15,3)` | não | `0` |  |  |
| 6 | `estoque_minimo` | `numeric(15,3)` | sim |  |  |  |
| 7 | `estoque_maximo` | `numeric(15,3)` | sim |  |  |  |
| 8 | `ponto_pedido` | `numeric(15,3)` | sim |  |  |  |
| 9 | `ultimo_inventario` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| estoque_organization_id_produto_id_localizacao_key | UNIQUE | `UNIQUE (organization_id, produto_id, localizacao)` |  |  | sim |
| estoque_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| estoque_produto_id_fkey | FOREIGN KEY | `FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.estoque_movimentacoes | estoque_movimentacoes_estoque_id_fkey | estoque_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| estoque_organization_id_produto_id_localizacao_key | btree | organization_id, produto_id, localizacao | sim | sim |  | `CREATE UNIQUE INDEX estoque_organization_id_produto_id_localizacao_key ON public.estoque USING btree (organization_id, produto_id, localizacao)` |
| estoque_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX estoque_pkey ON public.estoque USING btree (id)` |
| idx_estoque_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_estoque_org ON public.estoque USING btree (organization_id)` |
| idx_estoque_produto | btree | produto_id | não | sim |  | `CREATE INDEX idx_estoque_produto ON public.estoque USING btree (produto_id)` |


## Policies (RLS)

### `Estoque: ver da própria organização`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(organization_id = ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `estoque_delete_admin_coord`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK |  |

### `estoque_insert_papeis`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |

### `estoque_update_papeis`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |
| WITH CHECK | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trigger_set_estoque_timestamp | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
