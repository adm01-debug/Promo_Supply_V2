# public.budget_transactions

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `cost_center_id` | `uuid` | sim |  |  |  |
| 3 | `type` | `text` | não |  |  |  |
| 4 | `amount` | `numeric(15,2)` | não |  |  |  |
| 5 | `reference_type` | `text` | sim |  |  |  |
| 6 | `reference_id` | `uuid` | sim |  |  |  |
| 7 | `description` | `text` | sim |  |  |  |
| 8 | `created_by` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| budget_transactions_cost_center_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| budget_transactions_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| budget_transactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| budget_transactions_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| budget_transactions_type_check | CHECK | `CHECK (type = ANY (ARRAY['commitment'::text, 'actual'::text, 'release'::text, 'adjustment'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| budget_transactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX budget_transactions_pkey ON public.budget_transactions USING btree (id)` |
| idx_budget_transactions_cost_center_id | btree | cost_center_id | não | sim |  | `CREATE INDEX idx_budget_transactions_cost_center_id ON public.budget_transactions USING btree (cost_center_id)` |
| idx_budget_transactions_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_budget_transactions_created_by ON public.budget_transactions USING btree (created_by)` |
| idx_budget_transactions_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_budget_transactions_tenant_id ON public.budget_transactions USING btree (tenant_id)` |


## Policies (RLS)

### `Budget transactions viewable by finance roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK |  |

### `tenant_isolation_budget_transactions`

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
| tr_budget_transaction_update | AFTER | INSERT | ROW | enabled | public.update_cost_center_budget_totals |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
