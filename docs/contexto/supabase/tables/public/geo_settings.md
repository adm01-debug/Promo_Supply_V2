# public.geo_settings

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `geo_restriction_enabled` | `boolean` | não | `false` |  |  |
| 3 | `restriction_mode` | `text` | não | `'whitelist'::text` |  |  |
| 4 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| geo_settings_restriction_mode_check | CHECK | `CHECK (restriction_mode = ANY (ARRAY['whitelist'::text, 'blacklist'::text]))` |  |  | sim |
| geo_settings_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_settings_pkey ON public.geo_settings USING btree (id)` |
| idx_geo_settings_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_geo_settings_updated_by ON public.geo_settings USING btree (updated_by)` |


## Policies (RLS)

### `Admins can manage geo settings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Authenticated users can view geo settings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IS NOT NULL)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
