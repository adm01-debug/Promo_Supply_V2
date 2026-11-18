# public.contract_history

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
| 2 | `contract_id` | `uuid` | não |  |  |  |
| 3 | `action_type` | `text` | não |  |  |  |
| 4 | `action_description` | `text` | sim |  |  |  |
| 5 | `old_values` | `jsonb` | sim |  |  |  |
| 6 | `new_values` | `jsonb` | sim |  |  |  |
| 7 | `performed_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contract_history_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contract_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contract_history_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contract_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contract_history_pkey ON public.contract_history USING btree (id)` |
| idx_contract_history_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_contract_history_contract_id ON public.contract_history USING btree (contract_id)` |
| idx_contract_history_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_contract_history_tenant_id ON public.contract_history USING btree (tenant_id)` |


## Policies (RLS)

### `Role-restricted contract history access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `Users can create own contract history entries`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((auth.uid() IS NOT NULL) AND ((performed_by IS NULL) OR (performed_by = auth.uid())))` |

### `tenant_isolation_contract_history`

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
