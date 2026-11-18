# public.spend_forecasts

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
| 2 | `categoria_id` | `uuid` | sim |  |  |  |
| 3 | `forecast_date` | `date` | não |  |  |  |
| 4 | `estimated_value` | `numeric(15,2)` | não |  |  |  |
| 5 | `confidence_level` | `numeric(5,2)` | sim |  |  |  |
| 6 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `organization_id` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spend_forecasts_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| spend_forecasts_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| spend_forecasts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| spend_forecasts_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_forecast_date | btree | forecast_date | não | sim |  | `CREATE INDEX idx_forecast_date ON public.spend_forecasts USING btree (forecast_date)` |
| idx_spend_forecasts_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_spend_forecasts_categoria_id ON public.spend_forecasts USING btree (categoria_id)` |
| idx_spend_forecasts_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_spend_forecasts_organization_id ON public.spend_forecasts USING btree (organization_id)` |
| idx_spend_forecasts_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_spend_forecasts_tenant_id ON public.spend_forecasts USING btree (tenant_id)` |
| spend_forecasts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spend_forecasts_pkey ON public.spend_forecasts USING btree (id)` |


## Policies (RLS)

### `Tenant isolation for spend_forecasts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT user_organizations.organization_id    FROM user_organizations   WHERE (user_organizations.user_id = auth.uid())))` |
| WITH CHECK |  |

### `tenant_isolation_spend_forecasts`

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
