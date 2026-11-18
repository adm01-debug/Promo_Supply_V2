# public.approval_steps

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 8 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `workflow_id` | `uuid` | não |  |  |  |
| 3 | `etapa` | `integer` | não | `1` |  |  |
| 4 | `aprovador_id` | `uuid` | não |  |  |  |
| 5 | `aprovador_efetivo_id` | `uuid` | sim |  |  |  |
| 6 | `delegacao_id` | `uuid` | sim |  |  |  |
| 7 | `status` | `text` | não | `'pending'::text` |  |  |
| 8 | `comentario` | `text` | sim |  |  |  |
| 9 | `decidido_em` | `timestamp with time zone` | sim |  |  |  |
| 10 | `prazo_limite` | `timestamp with time zone` | sim |  |  |  |
| 11 | `notificado_em` | `timestamp with time zone` | sim |  |  |  |
| 12 | `lembrete_enviado` | `boolean` | não | `false` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `organization_id` | `uuid` | sim |  |  |  |
| 15 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| approval_steps_delegacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (delegacao_id) REFERENCES approval_delegations(id)` | NO ACTION | NO ACTION | sim |
| approval_steps_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| approval_steps_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| approval_steps_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'skipped'::text]))` |  |  | sim |
| approval_steps_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| approval_steps_workflow_id_fkey | FOREIGN KEY | `FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_history | approval_history_step_id_fkey | step_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| approval_steps_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX approval_steps_pkey ON public.approval_steps USING btree (id)` |
| idx_approval_steps_delegacao_id | btree | delegacao_id | não | sim |  | `CREATE INDEX idx_approval_steps_delegacao_id ON public.approval_steps USING btree (delegacao_id)` |
| idx_approval_steps_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_approval_steps_organization_id ON public.approval_steps USING btree (organization_id)` |
| idx_approval_steps_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_approval_steps_tenant_id ON public.approval_steps USING btree (tenant_id)` |
| idx_approval_steps_workflow_id | btree | workflow_id | não | sim |  | `CREATE INDEX idx_approval_steps_workflow_id ON public.approval_steps USING btree (workflow_id)` |
| idx_approval_steps_workflow_status_prazo | btree | workflow_id, status, prazo_limite | não | sim |  | `CREATE INDEX idx_approval_steps_workflow_status_prazo ON public.approval_steps USING btree (workflow_id, status, prazo_limite)` |


## Policies (RLS)

### `Admins and coordinators can create steps`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `Approvers can update their steps`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = aprovador_id) OR (auth.uid() = aprovador_efetivo_id) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can view assigned steps or admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.uid() = aprovador_id) OR (auth.uid() = aprovador_efetivo_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `approval_steps_escrita_admin_coord`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `approval_steps_insert_workflow_proprio`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (approval_workflows w      JOIN solicitacoes s ON ((s.id = w.solicitacao_id)))   WHERE ((w.id = approval_steps.workflow_id) AND (s.solicitante_id = auth.uid()))))` |

### `approval_steps_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `approval_steps_skip_workflow_rejeitado`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((status = 'pending'::text) AND (EXISTS ( SELECT 1    FROM approval_workflows w   WHERE ((w.id = approval_steps.workflow_id) AND (w.status = 'rejected'::text)))))` |
| WITH CHECK | `(status = 'skipped'::text)` |

### `tenant_isolation_approval_steps`

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


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
