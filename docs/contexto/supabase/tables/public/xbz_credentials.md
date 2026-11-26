# public.xbz_credentials

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
| 3 | `label` | `text` | sim |  |  |  |
| 4 | `portal_user_enc` | `text` | sim |  |  |  |
| 5 | `portal_password_enc` | `text` | sim |  |  |  |
| 6 | `cnpj` | `text` | sim |  |  |  |
| 7 | `api_token_enc` | `text` | sim |  |  |  |
| 8 | `pessoa_id` | `integer` | sim |  |  |  |
| 9 | `razao_social` | `text` | sim |  |  |  |
| 10 | `permissions` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 11 | `is_active` | `boolean` | não | `true` |  |  |
| 12 | `last_login_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `last_login_ok` | `boolean` | sim |  |  |  |
| 14 | `last_error` | `text` | sim |  |  |  |
| 15 | `created_by` | `uuid` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| xbz_credentials_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| xbz_credentials_tenant_id_key | UNIQUE | `UNIQUE (tenant_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| xbz_credentials_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_credentials_pkey ON public.xbz_credentials USING btree (id)` |
| xbz_credentials_tenant_id_key | btree | tenant_id | sim | sim |  | `CREATE UNIQUE INDEX xbz_credentials_tenant_id_key ON public.xbz_credentials USING btree (tenant_id)` |


## Policies (RLS)

### `xbz_credentials_admin_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| trg_xbz_credentials_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
