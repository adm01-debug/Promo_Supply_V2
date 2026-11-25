# public.punchout_sessions

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
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `catalog_id` | `uuid` | não |  |  |  |
| 4 | `user_id` | `uuid` | não |  |  |  |
| 5 | `buyer_cookie` | `text` | não |  |  |  |
| 6 | `return_url` | `text` | não |  |  |  |
| 7 | `status` | `text` | não | `'opened'::text` |  |  |
| 8 | `raw_request_xml` | `text` | sim |  |  |  |
| 9 | `raw_response_xml` | `text` | sim |  |  |  |
| 10 | `cart_payload` | `jsonb` | sim |  |  |  |
| 11 | `created_solicitacao_id` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `closed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| punchout_sessions_buyer_cookie_key | UNIQUE | `UNIQUE (buyer_cookie)` |  |  | sim |
| punchout_sessions_catalog_id_fkey | FOREIGN KEY | `FOREIGN KEY (catalog_id) REFERENCES punchout_catalogs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| punchout_sessions_created_solicitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (created_solicitacao_id) REFERENCES solicitacoes(id)` | NO ACTION | NO ACTION | sim |
| punchout_sessions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| punchout_sessions_status_check | CHECK | `CHECK (status = ANY (ARRAY['opened'::text, 'completed'::text, 'cancelled'::text, 'error'::text]))` |  |  | sim |
| punchout_sessions_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| punchout_sessions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_punchout_sessions_catalog_id | btree | catalog_id | não | sim |  | `CREATE INDEX idx_punchout_sessions_catalog_id ON public.punchout_sessions USING btree (catalog_id)` |
| idx_punchout_sessions_created_solicitacao_id | btree | created_solicitacao_id | não | sim |  | `CREATE INDEX idx_punchout_sessions_created_solicitacao_id ON public.punchout_sessions USING btree (created_solicitacao_id)` |
| idx_punchout_sessions_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_punchout_sessions_tenant ON public.punchout_sessions USING btree (tenant_id)` |
| idx_punchout_sessions_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_punchout_sessions_user_id ON public.punchout_sessions USING btree (user_id)` |
| punchout_sessions_buyer_cookie_key | btree | buyer_cookie | sim | sim |  | `CREATE UNIQUE INDEX punchout_sessions_buyer_cookie_key ON public.punchout_sessions USING btree (buyer_cookie)` |
| punchout_sessions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX punchout_sessions_pkey ON public.punchout_sessions USING btree (id)` |


## Policies (RLS)

### `punchout_sessions_escrita_ordem`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `punchout_sessions_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_punchout_sessions`

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
