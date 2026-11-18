# public.penalty_escalation_config

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
| 2 | `contract_id` | `uuid` | sim |  |  |  |
| 3 | `level` | `integer` | não | `1` |  |  |
| 4 | `min_infractions` | `integer` | não | `1` |  |  |
| 5 | `max_infractions` | `integer` | sim |  |  |  |
| 6 | `action_type` | `text` | não | `'warning'::text` |  |  |
| 7 | `penalty_multiplier` | `numeric` | não | `1.0` |  |  |
| 8 | `block_days` | `integer` | sim | `0` |  |  |
| 9 | `description` | `text` | sim |  |  |  |
| 10 | `is_active` | `boolean` | não | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| penalty_escalation_config_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| penalty_escalation_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| penalty_escalation_config_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_penalty_escalation_config_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_penalty_escalation_config_contract_id ON public.penalty_escalation_config USING btree (contract_id)` |
| idx_penalty_escalation_config_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_penalty_escalation_config_tenant_id ON public.penalty_escalation_config USING btree (tenant_id)` |
| penalty_escalation_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX penalty_escalation_config_pkey ON public.penalty_escalation_config USING btree (id)` |


## Policies (RLS)

### `Admins coordinators can manage escalation config`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |

### `Role-restricted escalation config select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_penalty_escalation_config`

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
