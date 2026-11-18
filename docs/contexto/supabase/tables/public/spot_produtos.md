# public.spot_produtos

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
| 2 | `reference` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `type_code_legacy` | `text` | sim |  |  |  |
| 6 | `type_code_new` | `text` | sim |  |  |  |
| 7 | `category_name` | `text` | sim |  |  |  |
| 8 | `catalogs` | `text[]` | não | `'{}'::text[]` |  |  |
| 9 | `brand` | `text` | sim |  |  |  |
| 10 | `country_of_origin` | `text` | sim |  |  |  |
| 11 | `main_image_url` | `text` | sim |  |  |  |
| 12 | `currency` | `text` | não | `'BRL'::text` |  |  |
| 13 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_produtos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| spot_produtos_reference_key | UNIQUE | `UNIQUE (reference)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spot_produtos_catalogs | gin | catalogs | não | sim |  | `CREATE INDEX idx_spot_produtos_catalogs ON public.spot_produtos USING gin (catalogs)` |
| idx_spot_produtos_name | gin |  | não | sim |  | `CREATE INDEX idx_spot_produtos_name ON public.spot_produtos USING gin (to_tsvector('portuguese'::regconfig, name))` |
| idx_spot_produtos_type_legacy | btree | type_code_legacy | não | sim |  | `CREATE INDEX idx_spot_produtos_type_legacy ON public.spot_produtos USING btree (type_code_legacy)` |
| idx_spot_produtos_type_new | btree | type_code_new | não | sim |  | `CREATE INDEX idx_spot_produtos_type_new ON public.spot_produtos USING btree (type_code_new)` |
| spot_produtos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_produtos_pkey ON public.spot_produtos USING btree (id)` |
| spot_produtos_reference_key | btree | reference | sim | sim |  | `CREATE UNIQUE INDEX spot_produtos_reference_key ON public.spot_produtos USING btree (reference)` |


## Policies (RLS)

### `Allowed roles can view spot produtos`

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
| trg_spot_produtos_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
