# public.sso_configurations

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
| 3 | `protocol` | `text` | não |  |  |  |
| 4 | `idp_metadata_url` | `text` | sim |  |  |  |
| 5 | `email_domains` | `text[]` | não |  |  |  |
| 6 | `scim_token_hash` | `text` | sim |  |  |  |
| 7 | `scim_token_last4` | `character(1)` | sim |  |  |  |
| 8 | `default_role` | `app_role` | não | `'viewer'::app_role` |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sso_configurations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sso_configurations_protocol_check | CHECK | `CHECK (protocol = ANY (ARRAY['saml'::text, 'oidc'::text]))` |  |  | sim |
| sso_configurations_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sso_configurations_tenant_id_protocol_key | UNIQUE | `UNIQUE (tenant_id, protocol)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sso_email_domains | gin | email_domains | não | sim |  | `CREATE INDEX idx_sso_email_domains ON public.sso_configurations USING gin (email_domains)` |
| sso_configurations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sso_configurations_pkey ON public.sso_configurations USING btree (id)` |
| sso_configurations_tenant_id_protocol_key | btree | tenant_id, protocol | sim | sim |  | `CREATE UNIQUE INDEX sso_configurations_tenant_id_protocol_key ON public.sso_configurations USING btree (tenant_id, protocol)` |


## Policies (RLS)

### `SSO configurations isolated by tenant`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| update_sso_configurations_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
