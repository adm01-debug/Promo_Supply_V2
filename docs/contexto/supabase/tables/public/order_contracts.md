# public.order_contracts

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
| 2 | `order_id` | `text` | não |  |  |  |
| 3 | `contract_id` | `uuid` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_contracts_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| order_contracts_order_id_contract_id_key | UNIQUE | `UNIQUE (order_id, contract_id)` |  |  | sim |
| order_contracts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| order_contracts_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_order_contracts_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_order_contracts_contract_id ON public.order_contracts USING btree (contract_id)` |
| idx_order_contracts_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_order_contracts_tenant_id ON public.order_contracts USING btree (tenant_id)` |
| order_contracts_order_id_contract_id_key | btree | order_id, contract_id | sim | sim |  | `CREATE UNIQUE INDEX order_contracts_order_id_contract_id_key ON public.order_contracts USING btree (order_id, contract_id)` |
| order_contracts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_contracts_pkey ON public.order_contracts USING btree (id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage order contracts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `tenant_isolation_order_contracts`

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
