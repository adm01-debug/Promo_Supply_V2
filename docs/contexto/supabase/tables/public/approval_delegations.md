# public.approval_delegations

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `delegante_id` | `uuid` | não |  |  |  |
| 3 | `delegado_id` | `uuid` | não |  |  |  |
| 4 | `data_inicio` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `data_fim` | `timestamp with time zone` | não |  |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `categorias_permitidas` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 8 | `valor_maximo` | `numeric` | sim |  |  |  |
| 9 | `ativo` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `organization_id` | `uuid` | sim |  |  |  |
| 13 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| approval_delegations_delegado_id_fkey | FOREIGN KEY | `FOREIGN KEY (delegado_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| approval_delegations_delegante_id_fkey | FOREIGN KEY | `FOREIGN KEY (delegante_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| approval_delegations_no_overlap | EXCLUDE | `EXCLUDE USING gist (delegante_id WITH =, tenant_id WITH =, tstzrange(data_inicio, data_fim, '[)'::text) WITH &&) WHERE (ativo = true)` |  |  | sim |
| approval_delegations_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| approval_delegations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| approval_delegations_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| approval_delegations_valid_range | CHECK | `CHECK (data_fim > data_inicio)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.approval_steps | approval_steps_delegacao_id_fkey | delegacao_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| approval_delegations_no_overlap | gist | delegante_id, tenant_id | não | sim | `(ativo = true)` | `CREATE INDEX approval_delegations_no_overlap ON public.approval_delegations USING gist (delegante_id, tenant_id, tstzrange(data_inicio, data_fim, '[)'::text)) WHERE (ativo = true)` |
| approval_delegations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX approval_delegations_pkey ON public.approval_delegations USING btree (id)` |
| idx_approval_delegations_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_approval_delegations_org ON public.approval_delegations USING btree (organization_id)` |
| idx_approval_delegations_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_approval_delegations_tenant_id ON public.approval_delegations USING btree (tenant_id)` |


## Policies (RLS)

### `Users can create delegations from themselves`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((auth.uid() = delegante_id) OR has_role(auth.uid(), 'admin'::app_role))` |

### `Users can delete their own delegations`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = delegante_id) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can update their own delegations`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = delegante_id) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can view delegations they are part of`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = delegante_id) OR (auth.uid() = delegado_id) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can view their organization delegations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `tenant_isolation_approval_delegations`

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
| update_approval_delegations_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_approval_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
