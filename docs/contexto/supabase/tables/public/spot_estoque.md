# public.spot_estoque

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
| 3 | `product_reference` | `text` | sim |  |  |  |
| 4 | `quantity` | `integer` | não | `0` |  |  |
| 5 | `incoming_quantity` | `integer` | sim |  |  |  |
| 6 | `incoming_date` | `date` | sim |  |  |  |
| 7 | `synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_estoque_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| spot_estoque_sku_key | UNIQUE | `UNIQUE (sku)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spot_estoque_product_ref | btree | product_reference | não | sim |  | `CREATE INDEX idx_spot_estoque_product_ref ON public.spot_estoque USING btree (product_reference)` |
| spot_estoque_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_estoque_pkey ON public.spot_estoque USING btree (id)` |
| spot_estoque_sku_key | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX spot_estoque_sku_key ON public.spot_estoque USING btree (sku)` |


## Policies (RLS)

### `Allowed roles can view spot estoque`

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
| trg_spot_estoque_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
