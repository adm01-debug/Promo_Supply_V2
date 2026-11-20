# public.approval_workflows

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `solicitacao_id` | `uuid` | sim |  |  |  |
| 3 | `rule_id` | `uuid` | sim |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `etapa_atual` | `integer` | não | `1` |  |  |
| 6 | `total_etapas` | `integer` | não | `1` |  |  |
| 7 | `valor` | `numeric` | não |  |  |  |
| 8 | `categoria_id` | `uuid` | sim |  |  |  |
| 9 | `prazo_limite` | `timestamp with time zone` | sim |  |  |  |
| 10 | `escalado_em` | `timestamp with time zone` | sim |  |  |  |
| 11 | `escalado_para` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `organization_id` | `uuid` | sim |  |  |  |
| 15 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| approval_workflows_categoria_id_fkey | FOREIGN KEY | `FOREIGN KEY (categoria_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| approval_workflows_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| approval_workflows_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| approval_workflows_rule_id_fkey | FOREIGN KEY | `FOREIGN KEY (rule_id) REFERENCES approval_rules(id)` | NO ACTION | NO ACTION | sim |
| approval_workflows_solicitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| approval_workflows_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'escalated'::text, 'cancelled'::text]))` |  |  | sim |
| approval_workflows_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_history | approval_history_workflow_id_fkey | workflow_id | SET NULL |
| public.approval_steps | approval_steps_workflow_id_fkey | workflow_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| approval_workflows_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX approval_workflows_pkey ON public.approval_workflows USING btree (id)` |
| idx_approval_workflows_categoria_id | btree | categoria_id | não | sim |  | `CREATE INDEX idx_approval_workflows_categoria_id ON public.approval_workflows USING btree (categoria_id)` |
| idx_approval_workflows_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_approval_workflows_org ON public.approval_workflows USING btree (organization_id)` |
| idx_approval_workflows_org_status | btree | organization_id, status | não | sim |  | `CREATE INDEX idx_approval_workflows_org_status ON public.approval_workflows USING btree (organization_id, status)` |
| idx_approval_workflows_rule_id | btree | rule_id | não | sim |  | `CREATE INDEX idx_approval_workflows_rule_id ON public.approval_workflows USING btree (rule_id)` |
| idx_approval_workflows_solicitacao_id | btree | solicitacao_id | não | sim |  | `CREATE INDEX idx_approval_workflows_solicitacao_id ON public.approval_workflows USING btree (solicitacao_id)` |
| idx_approval_workflows_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_approval_workflows_tenant_id ON public.approval_workflows USING btree (tenant_id)` |


## Policies (RLS)

### `Admins and coordinators can create workflows`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `Admins and coordinators can update workflows`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `Role-restricted workflow access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `Users can manage their organization workflows`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `Users can view their organization workflows`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `tenant_isolation_approval_workflows`

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
| trg_workflow_approved_promotes_solicitacao | AFTER | UPDATE | ROW | enabled | public.auto_transition_solicitacao_on_workflow_approved |
| update_approval_workflows_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_approval_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
