# public.contract_items

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `contract_id` | `uuid` | não |  |  |  |
| 3 | `item_name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `unit` | `text` | não |  |  |  |
| 6 | `quantity` | `numeric(15,3)` | não | `0` |  |  |
| 7 | `unit_price` | `numeric(15,2)` | não | `0` |  |  |
| 8 | `total_price` | `numeric(15,2)` | não | `0` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contract_items_contract_id_fkey | FOREIGN KEY | `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contract_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contract_items_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contract_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contract_items_pkey ON public.contract_items USING btree (id)` |
| idx_contract_items_contract_id | btree | contract_id | não | sim |  | `CREATE INDEX idx_contract_items_contract_id ON public.contract_items USING btree (contract_id)` |
| idx_contract_items_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_contract_items_tenant_id ON public.contract_items USING btree (tenant_id)` |


## Policies (RLS)

### `Admin coordinator finance can manage contract items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |

### `Role-restricted contract items select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `buyer_le_contract_items`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'buyer'::app_role)` |
| WITH CHECK |  |

### `tenant_isolation_contract_items`

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
