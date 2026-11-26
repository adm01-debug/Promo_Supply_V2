# public.xbz_produto_fiscal

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
| 5 | `ncm` | `text` | sim |  |  |  |
| 6 | `preco_venda` | `numeric` | sim |  |  |  |
| 7 | `preco_base_calculo` | `numeric` | sim |  |  |  |
| 8 | `percentual_ipi` | `numeric` | sim |  |  |  |
| 9 | `valor_ipi` | `numeric` | sim |  |  |  |
| 10 | `valor_st` | `numeric` | sim |  |  |  |
| 11 | `valor_mva` | `numeric` | sim |  |  |  |
| 12 | `notas_calculo` | `text` | sim |  |  |  |
| 13 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `last_synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| xbz_produto_fiscal_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| xbz_produto_fiscal_tenant_id_produto_id_key | UNIQUE | `UNIQUE (tenant_id, produto_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| xbz_produto_fiscal_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_produto_fiscal_pkey ON public.xbz_produto_fiscal USING btree (id)` |
| xbz_produto_fiscal_tenant_id_produto_id_key | btree | tenant_id, produto_id | sim | sim |  | `CREATE UNIQUE INDEX xbz_produto_fiscal_tenant_id_produto_id_key ON public.xbz_produto_fiscal USING btree (tenant_id, produto_id)` |


## Policies (RLS)

### `xbz_produto_fiscal_group_read`

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
| trg_xbz_produto_fiscal_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
