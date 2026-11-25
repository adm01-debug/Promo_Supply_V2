# public.fornecedor_categorias

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
| 2 | `fornecedor_id` | `uuid` | não |  |  |  |
| 3 | `categoria_id` | `uuid` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 5 | `tenant_id` | `uuid` | sim | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fornecedor_categorias_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| fornecedor_categorias_fornecedor_id_categoria_id_key | UNIQUE | `UNIQUE (fornecedor_id, categoria_id)` |  |  | sim |
| fornecedor_categorias_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| fornecedor_categorias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fornecedor_categorias_fornecedor_id_categoria_id_key | btree | fornecedor_id, categoria_id | sim | sim |  | `CREATE UNIQUE INDEX fornecedor_categorias_fornecedor_id_categoria_id_key ON public.fornecedor_categorias USING btree (fornecedor_id, categoria_id)` |
| fornecedor_categorias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fornecedor_categorias_pkey ON public.fornecedor_categorias USING btree (id)` |
| idx_fornecedor_categorias_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_fornecedor_categorias_categoria_id ON public.fornecedor_categorias USING btree (categoria_id)` |


## Policies (RLS)

### `fornecedor_categorias_escrita_gestao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `fornecedor_categorias_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_fornecedor_categorias`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
