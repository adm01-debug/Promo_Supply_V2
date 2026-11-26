# public.categorias

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `descricao` | `text` | sim |  |  |  |
| 4 | `cor` | `text` | sim | `'#6366f1'::text` |  |  |
| 5 | `ativo` | `boolean` | sim | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `organization_id` | `uuid` | sim |  |  |  |
| 9 | `tenant_id` | `uuid` | não |  |  |  |
| 10 | `codigo_unspsc` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| categorias_codigo_unspsc_fkey | FOREIGN KEY | `FOREIGN KEY (codigo_unspsc) REFERENCES unspsc_codes(code)` | NO ACTION | NO ACTION | sim |
| categorias_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| categorias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| categorias_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_rules | approval_rules_categoria_id_fkey | categoria_id | NO ACTION |
| public.approval_workflows | approval_workflows_categoria_id_fkey | categoria_id | NO ACTION |
| public.category_strategies | category_strategies_categoria_id_fkey | categoria_id | CASCADE |
| public.fornecedor_categorias | fornecedor_categorias_categoria_id_fkey | categoria_id | CASCADE |
| public.produtos | produtos_categoria_id_fkey | categoria_id | NO ACTION |
| public.solicitacoes | solicitacoes_categoria_id_fkey | categoria_id | NO ACTION |
| public.sourcing_events | sourcing_events_category_id_fkey | category_id | NO ACTION |
| public.sourcing_pipeline | sourcing_pipeline_categoria_id_fkey | categoria_id | NO ACTION |
| public.sourcing_projects | sourcing_projects_category_id_fkey | category_id | NO ACTION |
| public.spend_forecasts | spend_forecasts_categoria_id_fkey | categoria_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| categorias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX categorias_pkey ON public.categorias USING btree (id)` |
| idx_categorias_codigo_unspsc | btree | codigo_unspsc | não | sim |  | `CREATE INDEX idx_categorias_codigo_unspsc ON public.categorias USING btree (codigo_unspsc)` |
| idx_categorias_org_ativo_nome | btree | organization_id, ativo, nome | não | sim |  | `CREATE INDEX idx_categorias_org_ativo_nome ON public.categorias USING btree (organization_id, ativo, nome)` |
| idx_categorias_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_categorias_tenant ON public.categorias USING btree (tenant_id)` |


## Policies (RLS)

### `Admins can manage categories`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Tenant users can view categories`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `Users can view their organization categories`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `categorias_escrita_admin_coord`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `tenant_isolation_categorias`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_categorias_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
