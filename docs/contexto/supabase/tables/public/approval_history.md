# public.approval_history

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
| 2 | `workflow_id` | `uuid` | sim |  |  |  |
| 3 | `solicitacao_id` | `uuid` | sim |  |  |  |
| 4 | `step_id` | `uuid` | sim |  |  |  |
| 5 | `acao` | `text` | não |  |  |  |
| 6 | `usuario_id` | `uuid` | sim |  |  |  |
| 7 | `usuario_nome` | `text` | sim |  |  |  |
| 8 | `detalhes` | `jsonb` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| approval_history_acao_check | CHECK | `CHECK (acao = ANY (ARRAY['created'::text, 'approved'::text, 'rejected'::text, 'escalated'::text, 'delegated'::text, 'reminder_sent'::text, 'cancelled'::text]))` |  |  | sim |
| approval_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| approval_history_solicitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| approval_history_step_id_fkey | FOREIGN KEY | `FOREIGN KEY (step_id) REFERENCES approval_steps(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| approval_history_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| approval_history_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| approval_history_workflow_id_fkey | FOREIGN KEY | `FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| approval_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX approval_history_pkey ON public.approval_history USING btree (id)` |
| idx_approval_history_solicitacao_id | btree | solicitacao_id | não | sim |  | `CREATE INDEX idx_approval_history_solicitacao_id ON public.approval_history USING btree (solicitacao_id)` |
| idx_approval_history_step_id | btree | step_id | não | sim |  | `CREATE INDEX idx_approval_history_step_id ON public.approval_history USING btree (step_id)` |
| idx_approval_history_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_approval_history_tenant_id ON public.approval_history USING btree (tenant_id)` |
| idx_approval_history_workflow_id | btree | workflow_id | não | sim |  | `CREATE INDEX idx_approval_history_workflow_id ON public.approval_history USING btree (workflow_id)` |


## Policies (RLS)

### `Restricted approval history insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((auth.uid() = usuario_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `Role-restricted approval history select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.uid() = usuario_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_approval_history`

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
