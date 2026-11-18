# public.spot_customization_options

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
| 2 | `service_code` | `text` | não |  |  |  |
| 3 | `product_reference` | `text` | não |  |  |  |
| 4 | `component_id` | `text` | sim |  |  |  |
| 5 | `location_id` | `text` | sim |  |  |  |
| 6 | `table_code_option` | `text` | sim |  |  |  |
| 7 | `technique_code` | `text` | sim |  |  |  |
| 8 | `technique_name` | `text` | sim |  |  |  |
| 9 | `area` | `text` | sim |  |  |  |
| 10 | `max_colors` | `integer` | sim |  |  |  |
| 11 | `allow_full_color` | `boolean` | não | `false` |  |  |
| 12 | `is_default` | `boolean` | não | `false` |  |  |
| 13 | `hotspot` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `prices` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 15 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 16 | `synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_customization_options_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| spot_customization_options_service_code_key | UNIQUE | `UNIQUE (service_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spot_custom_default | btree | product_reference | não | sim | `is_default` | `CREATE INDEX idx_spot_custom_default ON public.spot_customization_options USING btree (product_reference) WHERE is_default` |
| idx_spot_custom_product_ref | btree | product_reference | não | sim |  | `CREATE INDEX idx_spot_custom_product_ref ON public.spot_customization_options USING btree (product_reference)` |
| spot_customization_options_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_customization_options_pkey ON public.spot_customization_options USING btree (id)` |
| spot_customization_options_service_code_key | btree | service_code | sim | sim |  | `CREATE UNIQUE INDEX spot_customization_options_service_code_key ON public.spot_customization_options USING btree (service_code)` |


## Policies (RLS)

### `Allowed roles can view spot customization`

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
| trg_spot_custom_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
