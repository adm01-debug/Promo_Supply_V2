# public.approval_rules

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
| 4 | `valor_min` | `numeric` | não | `0` |  |  |
| 5 | `valor_max` | `numeric` | não | `999999999` |  |  |
| 6 | `categoria_id` | `uuid` | sim |  |  |  |
| 7 | `aprovadores` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `tempo_limite_horas` | `integer` | não | `24` |  |  |
| 9 | `escalacao_automatica` | `boolean` | não | `false` |  |  |
| 10 | `escalacao_para` | `uuid` | sim |  |  |  |
| 11 | `niveis_aprovacao` | `integer` | não | `1` |  |  |
| 12 | `requer_unanimidade` | `boolean` | não | `false` |  |  |
| 13 | `ativo` | `boolean` | não | `true` |  |  |
| 14 | `prioridade` | `integer` | não | `0` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `created_by` | `uuid` | sim |  |  |  |
| 18 | `cost_center_id` | `uuid` | sim |  |  |  |
| 19 | `organization_id` | `uuid` | sim |  |  |  |
| 20 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| approval_rules_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| approval_rules_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)` | NO ACTION | NO ACTION | sim |
| approval_rules_escalacao_para_fkey | FOREIGN KEY | `FOREIGN KEY (escalacao_para) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| approval_rules_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| approval_rules_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| approval_rules_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_workflows | approval_workflows_rule_id_fkey | rule_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| approval_rules_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX approval_rules_pkey ON public.approval_rules USING btree (id)` |
| idx_approval_rules_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_approval_rules_categoria_id ON public.approval_rules USING btree (categoria_id)` |
| idx_approval_rules_cost_center | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_approval_rules_cost_center ON public.approval_rules USING btree (cost_center_id)` |
| idx_approval_rules_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_approval_rules_org ON public.approval_rules USING btree (organization_id)` |
| idx_approval_rules_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_approval_rules_tenant_id ON public.approval_rules USING btree (tenant_id)` |


## Policies (RLS)

### `Admins can manage approval rules`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Role-restricted approval rules select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `Users can view their organization rules`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `approval_rules_escrita_admin_coord`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `tenant_isolation_approval_rules`

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
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| update_approval_rules_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_approval_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
