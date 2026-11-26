# public.sourcing_events

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
| 2 | `organization_id` | `uuid` | sim |  |  |  |
| 3 | `numero` | `text` | não |  |  |  |
| 4 | `type` | `sourcing_type` | não |  |  |  |
| 5 | `status` | `sourcing_status` | não | `'draft'::sourcing_status` |  |  |
| 6 | `title` | `text` | não |  |  |  |
| 7 | `description` | `text` | sim |  |  |  |
| 8 | `category_id` | `uuid` | sim |  |  |  |
| 9 | `owner_id` | `uuid` | não |  |  |  |
| 10 | `budget_estimate` | `numeric(15,2)` | sim |  |  |  |
| 11 | `currency` | `text` | não | `'BRL'::text` |  |  |
| 12 | `starts_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `closes_at` | `timestamp with time zone` | não |  |  |  |
| 14 | `evaluation_deadline` | `timestamp with time zone` | sim |  |  |  |
| 15 | `award_deadline` | `timestamp with time zone` | sim |  |  |  |
| 16 | `sealed_bid` | `boolean` | não | `false` |  |  |
| 17 | `auction_config` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 18 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_events_budget_nonneg | CHECK | `CHECK (budget_estimate IS NULL OR budget_estimate >= 0::numeric)` |  |  | sim |
| sourcing_events_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categorias(id)` | NO ACTION | NO ACTION | sim |
| sourcing_events_currency_iso | CHECK | `CHECK (currency ~ '^[A-Z]{3}$'::text) NOT VALID` |  |  | não |
| sourcing_events_dates_order | CHECK | `CHECK ((starts_at IS NULL OR closes_at > starts_at) AND (evaluation_deadline IS NULL OR evaluation_deadline >= closes_at) AND (award_deadline IS NULL OR evaluation_deadline IS NULL OR award_deadline >= evaluation_deadline)) NOT VALID` |  |  | não |
| sourcing_events_numero_key | UNIQUE | `UNIQUE (numero)` |  |  | sim |
| sourcing_events_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| sourcing_events_owner_id_fkey | FOREIGN KEY | `FOREIGN KEY (owner_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sourcing_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_events_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.auction_bids | auction_bids_event_id_fkey | event_id | CASCADE |
| public.sourcing_awards | sourcing_awards_event_id_fkey | event_id | CASCADE |
| public.sourcing_event_criteria | sourcing_event_criteria_event_id_fkey | event_id | CASCADE |
| public.sourcing_event_lots | sourcing_event_lots_event_id_fkey | event_id | CASCADE |
| public.sourcing_event_questions | sourcing_event_questions_event_id_fkey | event_id | CASCADE |
| public.sourcing_invitations | sourcing_invitations_event_id_fkey | event_id | CASCADE |
| public.sourcing_responses | sourcing_responses_event_id_fkey | event_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_events_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_sourcing_events_category_id ON public.sourcing_events USING btree (category_id)` |
| idx_sourcing_events_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_sourcing_events_organization_id ON public.sourcing_events USING btree (organization_id)` |
| idx_sourcing_events_owner_id | btree | owner_id | não | sim |  | `CREATE INDEX idx_sourcing_events_owner_id ON public.sourcing_events USING btree (owner_id)` |
| idx_sourcing_events_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_events_tenant_id ON public.sourcing_events USING btree (tenant_id)` |
| sourcing_events_numero_key | btree | numero | sim | sim |  | `CREATE UNIQUE INDEX sourcing_events_numero_key ON public.sourcing_events USING btree (numero)` |
| sourcing_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_events_pkey ON public.sourcing_events USING btree (id)` |


## Policies (RLS)

### `sourcing_events_escrita_ordem`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `sourcing_events_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_sourcing_events`

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
