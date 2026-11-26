# public.xbz_pedidos

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
| 3 | `pedido_numero` | `text` | não |  |  |  |
| 4 | `ordem_de_compra` | `text` | sim |  |  |  |
| 5 | `pessoa_id` | `integer` | sim |  |  |  |
| 6 | `pessoa_razao_social` | `text` | sim |  |  |  |
| 7 | `data_emissao` | `timestamp with time zone` | sim |  |  |  |
| 8 | `id_status` | `integer` | sim |  |  |  |
| 9 | `status_logistico` | `text` | sim |  |  |  |
| 10 | `id_lote_debito_status` | `integer` | sim |  |  |  |
| 11 | `lote_debito_status_cliente` | `text` | sim |  |  |  |
| 12 | `pago` | `boolean` | não | `false` |  |  |
| 13 | `data_pagamento` | `timestamp with time zone` | sim |  |  |  |
| 14 | `data_status_lote_debito` | `timestamp with time zone` | sim |  |  |  |
| 15 | `lote_debito_status1_data` | `timestamp with time zone` | sim |  |  |  |
| 16 | `lote_debito_status2_data` | `timestamp with time zone` | sim |  |  |  |
| 17 | `lote_debito_status3_data` | `timestamp with time zone` | sim |  |  |  |
| 18 | `valor_produtos` | `numeric` | sim |  |  |  |
| 19 | `valor_impostos_taxas` | `numeric` | sim |  |  |  |
| 20 | `valor_total` | `numeric` | sim |  |  |  |
| 21 | `quantidade` | `integer` | sim |  |  |  |
| 22 | `produto_codigo_xbz` | `text` | sim |  |  |  |
| 23 | `produto_nome` | `text` | sim |  |  |  |
| 24 | `nota_fiscal` | `text` | sim |  |  |  |
| 25 | `entrega_tipo_nome` | `text` | sim |  |  |  |
| 26 | `transportadora_nome` | `text` | sim |  |  |  |
| 27 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 28 | `last_synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 29 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 30 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| xbz_pedidos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| xbz_pedidos_tenant_id_pedido_numero_key | UNIQUE | `UNIQUE (tenant_id, pedido_numero)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_xbz_pedidos_emissao | btree | tenant_id, data_emissao | não | sim |  | `CREATE INDEX idx_xbz_pedidos_emissao ON public.xbz_pedidos USING btree (tenant_id, data_emissao DESC)` |
| idx_xbz_pedidos_pagamento | btree | tenant_id, id_lote_debito_status | não | sim |  | `CREATE INDEX idx_xbz_pedidos_pagamento ON public.xbz_pedidos USING btree (tenant_id, id_lote_debito_status)` |
| xbz_pedidos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_pedidos_pkey ON public.xbz_pedidos USING btree (id)` |
| xbz_pedidos_tenant_id_pedido_numero_key | btree | tenant_id, pedido_numero | sim | sim |  | `CREATE UNIQUE INDEX xbz_pedidos_tenant_id_pedido_numero_key ON public.xbz_pedidos USING btree (tenant_id, pedido_numero)` |


## Policies (RLS)

### `xbz_pedidos_group_read`

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
| trg_xbz_pedidos_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
