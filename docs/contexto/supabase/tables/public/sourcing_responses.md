# public.sourcing_responses

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
| 2 | `event_id` | `uuid` | não |  |  |  |
| 3 | `invitation_id` | `uuid` | não |  |  |  |
| 4 | `fornecedor_id` | `uuid` | não |  |  |  |
| 5 | `total_preco` | `numeric(15,2)` | sim |  |  |  |
| 6 | `total_score` | `numeric(6,2)` | sim |  |  |  |
| 7 | `ranking` | `integer` | sim |  |  |  |
| 8 | `observacoes` | `text` | sim |  |  |  |
| 9 | `termos_aceitos` | `boolean` | não | `false` |  |  |
| 10 | `submitted_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_responses_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_responses_event_id_fornecedor_id_key | UNIQUE | `UNIQUE (event_id, fornecedor_id)` |  |  | sim |
| sourcing_responses_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| sourcing_responses_invitation_id_fkey | FOREIGN KEY | `FOREIGN KEY (invitation_id) REFERENCES sourcing_invitations(id)` | NO ACTION | NO ACTION | sim |
| sourcing_responses_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_responses_ranking_positive | CHECK | `CHECK (ranking IS NULL OR ranking > 0)` |  |  | sim |
| sourcing_responses_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| sourcing_responses_total_preco_nonneg | CHECK | `CHECK (total_preco IS NULL OR total_preco >= 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sourcing_awards | sourcing_awards_winner_response_id_fkey | winner_response_id | NO ACTION |
| public.sourcing_response_answers | sourcing_response_answers_response_id_fkey | response_id | CASCADE |
| public.sourcing_response_items | sourcing_response_items_response_id_fkey | response_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_responses_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_sourcing_responses_fornecedor_id ON public.sourcing_responses USING btree (fornecedor_id)` |
| idx_sourcing_responses_invitation_id | btree | invitation_id | não | sim |  | `CREATE INDEX idx_sourcing_responses_invitation_id ON public.sourcing_responses USING btree (invitation_id)` |
| idx_sourcing_responses_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_responses_tenant_id ON public.sourcing_responses USING btree (tenant_id)` |
| sourcing_responses_event_id_fornecedor_id_key | btree | event_id, fornecedor_id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_responses_event_id_fornecedor_id_key ON public.sourcing_responses USING btree (event_id, fornecedor_id)` |
| sourcing_responses_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_responses_pkey ON public.sourcing_responses USING btree (id)` |


## Policies (RLS)

### `sourcing_responses_escrita_ordem`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `sourcing_responses_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_sourcing_responses`

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
