# public.category_strategies

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
| 2 | `categoria_id` | `uuid` | sim |  |  |  |
| 3 | `kraljic_quadrant` | `text` | sim |  |  |  |
| 4 | `risk_level` | `text` | sim |  |  |  |
| 5 | `spend_impact` | `text` | sim |  |  |  |
| 6 | `strategy_description` | `text` | sim |  |  |  |
| 7 | `preferred_contract_type` | `text` | sim |  |  |  |
| 8 | `last_review_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `organization_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_strategies_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_strategies_kraljic_quadrant_check | CHECK | `CHECK (kraljic_quadrant = ANY (ARRAY['strategic'::text, 'leverage'::text, 'bottleneck'::text, 'routine'::text]))` |  |  | sim |
| category_strategies_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| category_strategies_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| category_strategies_risk_level_check | CHECK | `CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))` |  |  | sim |
| category_strategies_spend_impact_check | CHECK | `CHECK (spend_impact = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))` |  |  | sim |
| category_strategies_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_strategies_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_strategies_pkey ON public.category_strategies USING btree (id)` |
| idx_category_strategies_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_category_strategies_categoria_id ON public.category_strategies USING btree (categoria_id)` |
| idx_category_strategies_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_category_strategies_organization_id ON public.category_strategies USING btree (organization_id)` |
| idx_category_strategies_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_category_strategies_tenant_id ON public.category_strategies USING btree (tenant_id)` |


## Policies (RLS)

### `Tenant isolation for category_strategies`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT user_organizations.organization_id    FROM user_organizations   WHERE (user_organizations.user_id = auth.uid())))` |
| WITH CHECK |  |

### `tenant_isolation`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id = get_my_organization())` |
| WITH CHECK |  |

### `tenant_isolation_category_strategies`

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
