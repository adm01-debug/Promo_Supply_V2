# public.xbz_produtos

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `produto_id` | `integer` | não |  |  |  |
| 4 | `sku` | `text` | sim |  |  |  |
| 5 | `codigo_composto` | `text` | sim |  |  |  |
| 6 | `codigo_amigavel` | `text` | sim |  |  |  |
| 7 | `nome` | `text` | sim |  |  |  |
| 8 | `cor_id` | `integer` | sim |  |  |  |
| 9 | `cor_nome` | `text` | sim |  |  |  |
| 10 | `preco` | `numeric` | sim |  |  |  |
| 11 | `preco_ipi` | `numeric` | sim |  |  |  |
| 12 | `quantidade_disponivel` | `integer` | sim |  |  |  |
| 13 | `disponivel` | `text` | sim |  |  |  |
| 14 | `venda_minima` | `integer` | sim |  |  |  |
| 15 | `multiplos` | `integer` | sim |  |  |  |
| 16 | `imagem_url` | `text` | sim |  |  |  |
| 17 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 18 | `last_synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| xbz_produtos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| xbz_produtos_tenant_id_produto_id_key | UNIQUE | `UNIQUE (tenant_id, produto_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_xbz_produtos_last_synced | btree | tenant_id, last_synced_at | não | sim |  | `CREATE INDEX idx_xbz_produtos_last_synced ON public.xbz_produtos USING btree (tenant_id, last_synced_at DESC)` |
| idx_xbz_produtos_nome_lower | btree | tenant_id | não | sim |  | `CREATE INDEX idx_xbz_produtos_nome_lower ON public.xbz_produtos USING btree (tenant_id, lower(nome))` |
| idx_xbz_produtos_sku | btree | tenant_id, sku | não | sim |  | `CREATE INDEX idx_xbz_produtos_sku ON public.xbz_produtos USING btree (tenant_id, sku)` |
| xbz_produtos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_produtos_pkey ON public.xbz_produtos USING btree (id)` |
| xbz_produtos_tenant_id_produto_id_key | btree | tenant_id, produto_id | sim | sim |  | `CREATE UNIQUE INDEX xbz_produtos_tenant_id_produto_id_key ON public.xbz_produtos USING btree (tenant_id, produto_id)` |


## Policies (RLS)

### `xbz_produtos_group_read`

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
| trg_xbz_produtos_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
