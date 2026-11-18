# public.profiles

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `full_name` | `text` | sim |  |  |  |
| 4 | `email` | `text` | sim |  |  |  |
| 5 | `avatar_url` | `text` | sim |  |  |  |
| 6 | `department` | `text` | sim |  |  |  |
| 7 | `phone` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `current_organization_id` | `uuid` | sim |  |  |  |
| 11 | `tenant_id` | `uuid` | sim |  |  |  |
| 12 | `preferred_locale` | `text` | não | `'pt-BR'::text` |  |  |
| 13 | `empresa_default_id` | `uuid` | sim |  |  |  |
| 14 | `display_name` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| profiles_current_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (current_organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| profiles_empresa_default_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_default_id) REFERENCES tenants(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| profiles_phone_e164_chk | CHECK | `CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{9,14}$'::text) NOT VALID` |  |  | não |
| profiles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| profiles_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| profiles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| profiles_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.cost_centers | cost_centers_manager_id_fkey | manager_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_profiles_current_organization_id | btree | current_organization_id | não | sim |  | `CREATE INDEX idx_profiles_current_organization_id ON public.profiles USING btree (current_organization_id)` |
| idx_profiles_email_lower | btree |  | não | sim |  | `CREATE INDEX idx_profiles_email_lower ON public.profiles USING btree (lower(email))` |
| idx_profiles_empresa_default_id | btree | empresa_default_id | não | sim |  | `CREATE INDEX idx_profiles_empresa_default_id ON public.profiles USING btree (empresa_default_id)` |
| idx_profiles_phone | btree | phone | não | sim | `(phone IS NOT NULL)` | `CREATE INDEX idx_profiles_phone ON public.profiles USING btree (phone) WHERE (phone IS NOT NULL)` |
| idx_profiles_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_profiles_tenant_id ON public.profiles USING btree (tenant_id)` |
| profiles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |
| profiles_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id)` |


## Policies (RLS)

### `Admins can manage all profiles`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Admins can view all profiles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Users can insert their own profile`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

### `Users can update their own profile`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `Users can view their own profile`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `profiles_tenant_isolation`

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
| a0_guard_profile_org_change | BEFORE | INSERT OR UPDATE | ROW | enabled | public.guard_profile_org_change |
| trg_normalize_email | BEFORE | INSERT OR UPDATE | ROW | enabled | public.normalize_email_lowercase |
| trg_normalize_phone_profiles | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_normalize_phone |
| update_profiles_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
