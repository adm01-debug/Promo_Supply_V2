# public.sourcing_event_criteria

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
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `peso` | `numeric(5,2)` | não |  |  |  |
| 5 | `formula` | `text` | não | `'inverse_min'::text` |  |  |
| 6 | `config` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_event_criteria_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_event_criteria_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_event_criteria_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_event_criteria_event_id | btree | event_id | não | sim |  | `CREATE INDEX idx_sourcing_event_criteria_event_id ON public.sourcing_event_criteria USING btree (event_id)` |
| idx_sourcing_event_criteria_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_event_criteria_tenant_id ON public.sourcing_event_criteria USING btree (tenant_id)` |
| sourcing_event_criteria_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_event_criteria_pkey ON public.sourcing_event_criteria USING btree (id)` |


## Policies (RLS)

### `sourcing_event_criteria_escrita_ordem`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `sourcing_event_criteria_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_sourcing_event_criteria`

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
