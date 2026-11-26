# public.payment_history

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
| 2 | `pagamento_id` | `uuid` | não |  |  |  |
| 3 | `valor_parcela` | `numeric` | não | `0` |  |  |
| 4 | `data_pagamento` | `date` | não | `CURRENT_DATE` |  |  |
| 5 | `comprovante_url` | `text` | sim |  |  |  |
| 6 | `observacoes` | `text` | sim |  |  |  |
| 7 | `registrado_por` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| payment_history_pagamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| payment_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| payment_history_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_payment_history_pagamento | btree | pagamento_id | não | sim |  | `CREATE INDEX idx_payment_history_pagamento ON public.payment_history USING btree (pagamento_id)` |
| idx_payment_history_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_payment_history_tenant_id ON public.payment_history USING btree (tenant_id)` |
| payment_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX payment_history_pkey ON public.payment_history USING btree (id)` |


## Policies (RLS)

### `Finance admin can manage payment history`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `tenant_isolation_payment_history`

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
