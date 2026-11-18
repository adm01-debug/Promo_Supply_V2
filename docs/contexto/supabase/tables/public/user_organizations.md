# public.user_organizations

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `organization_id` | `uuid` | sim |  |  |  |
| 4 | `role` | `text` | sim | `'member'::text` |  |  |
| 5 | `is_default` | `boolean` | sim | `false` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_organizations_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_organizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_organizations_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_organizations_user_id_organization_id_key | UNIQUE | `UNIQUE (user_id, organization_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_organizations_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_user_organizations_organization_id ON public.user_organizations USING btree (organization_id)` |
| user_organizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_organizations_pkey ON public.user_organizations USING btree (id)` |
| user_organizations_user_id_organization_id_key | btree | user_id, organization_id | sim | sim |  | `CREATE UNIQUE INDEX user_organizations_user_id_organization_id_key ON public.user_organizations USING btree (user_id, organization_id)` |


## Policies (RLS)

### `Users can see their own memberships`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
