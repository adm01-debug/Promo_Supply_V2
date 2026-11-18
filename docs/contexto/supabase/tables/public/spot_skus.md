# public.spot_skus

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
| 2 | `sku` | `text` | não |  |  |  |
| 3 | `product_reference` | `text` | não |  |  |  |
| 4 | `color_code` | `text` | sim |  |  |  |
| 5 | `color_name` | `text` | sim |  |  |  |
| 6 | `color_hex` | `text` | sim |  |  |  |
| 7 | `size` | `text` | sim |  |  |  |
| 8 | `capacity` | `text` | sim |  |  |  |
| 9 | `your_price` | `numeric` | sim |  |  |  |
| 10 | `handling_costs` | `numeric` | sim |  |  |  |
| 11 | `price_tiers` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 12 | `table_codes_options` | `text` | sim |  |  |  |
| 13 | `print_area` | `text` | sim |  |  |  |
| 14 | `no_replenishment` | `boolean` | não | `false` |  |  |
| 15 | `image_url` | `text` | sim |  |  |  |
| 16 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 17 | `synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_skus_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| spot_skus_sku_key | UNIQUE | `UNIQUE (sku)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spot_skus_product_ref | btree | product_reference | não | sim |  | `CREATE INDEX idx_spot_skus_product_ref ON public.spot_skus USING btree (product_reference)` |
| spot_skus_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_skus_pkey ON public.spot_skus USING btree (id)` |
| spot_skus_sku_key | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX spot_skus_sku_key ON public.spot_skus USING btree (sku)` |


## Policies (RLS)

### `Allowed roles can view spot skus`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_spot_skus_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
