# public.organizations

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `logo_url` | `text` | sim |  |  |  |
| 5 | `settings` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `cnpj_matriz` | `text` | sim |  |  |  |
| 9 | `razao_social` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| organizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| organizations_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.aliquotas_tributarias | aliquotas_tributarias_organization_id_fkey | organization_id | CASCADE |
| public.approval_delegations | approval_delegations_organization_id_fkey | organization_id | NO ACTION |
| public.approval_rules | approval_rules_organization_id_fkey | organization_id | NO ACTION |
| public.approval_steps | approval_steps_organization_id_fkey | organization_id | NO ACTION |
| public.approval_workflows | approval_workflows_organization_id_fkey | organization_id | NO ACTION |
| public.audit_logs | audit_logs_organization_id_fkey | organization_id | NO ACTION |
| public.audit_logs_202605 | audit_logs_organization_id_fkey | organization_id | NO ACTION |
| public.audit_logs_202606 | audit_logs_organization_id_fkey | organization_id | NO ACTION |
| public.audit_logs_202607 | audit_logs_organization_id_fkey | organization_id | NO ACTION |
| public.audit_logs_202608 | audit_logs_organization_id_fkey | organization_id | NO ACTION |
| public.audit_logs_202609 | audit_logs_organization_id_fkey | organization_id | NO ACTION |
| public.categorias | categorias_organization_id_fkey | organization_id | NO ACTION |
| public.category_strategies | category_strategies_organization_id_fkey | organization_id | NO ACTION |
| public.contracts | contracts_organization_id_fkey | organization_id | NO ACTION |
| public.cotacoes | cotacoes_organization_id_fkey | organization_id | NO ACTION |
| public.dashboard_filter_favorites | dashboard_filter_favorites_organization_id_fkey | organization_id | NO ACTION |
| public.department_budgets | department_budgets_organization_id_fkey | organization_id | NO ACTION |
| public.fiscal_documents | fiscal_documents_organization_id_fkey | organization_id | NO ACTION |
| public.fornecedores | fornecedores_organization_id_fkey | organization_id | NO ACTION |
| public.licitacoes | licitacoes_organization_id_fkey | organization_id | NO ACTION |
| public.pagamentos | pagamentos_organization_id_fkey | organization_id | NO ACTION |
| public.pedidos | pedidos_organization_id_fkey | organization_id | NO ACTION |
| public.produtos | produtos_organization_id_fkey | organization_id | NO ACTION |
| public.profiles | profiles_current_organization_id_fkey | current_organization_id | NO ACTION |
| public.solicitacoes | solicitacoes_organization_id_fkey | organization_id | NO ACTION |
| public.sourcing_events | sourcing_events_organization_id_fkey | organization_id | NO ACTION |
| public.sourcing_pipeline | sourcing_pipeline_organization_id_fkey | organization_id | NO ACTION |
| public.spend_forecasts | spend_forecasts_organization_id_fkey | organization_id | NO ACTION |
| public.tenants | tenants_organization_id_fkey | organization_id | SET NULL |
| public.user_organizations | user_organizations_organization_id_fkey | organization_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| organizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id)` |
| organizations_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug)` |


## Policies (RLS)

### `Users can see their organizations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(id IN ( SELECT user_organizations.organization_id    FROM user_organizations   WHERE (user_organizations.user_id = auth.uid())))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
