# public.creditos_fornecedor

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
| 2 | `fornecedor_id` | `uuid` | não |  |  |  |
| 3 | `devolucao_id` | `uuid` | sim |  |  |  |
| 4 | `tipo` | `text` | não | `'credito_devolucao'::text` |  |  |
| 5 | `valor` | `numeric` | não | `0` |  |  |
| 6 | `valor_utilizado` | `numeric` | não | `0` |  |  |
| 7 | `saldo` | `numeric` | não | `0` |  |  |
| 8 | `status` | `text` | não | `'ativo'::text` |  |  |
| 9 | `descricao` | `text` | sim |  |  |  |
| 10 | `data_emissao` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `data_validade` | `timestamp with time zone` | sim |  |  |  |
| 12 | `utilizado_em_pagamento_id` | `uuid` | sim |  |  |  |
| 13 | `created_by` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| creditos_fornecedor_devolucao_id_fkey | FOREIGN KEY | `FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| creditos_fornecedor_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| creditos_fornecedor_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| creditos_fornecedor_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| creditos_fornecedor_utilizado_em_pagamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (utilizado_em_pagamento_id) REFERENCES pagamentos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| creditos_fornecedor_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX creditos_fornecedor_pkey ON public.creditos_fornecedor USING btree (id)` |
| idx_creditos_fornecedor | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_creditos_fornecedor ON public.creditos_fornecedor USING btree (fornecedor_id)` |
| idx_creditos_fornecedor_devolucao_id | btree | devolucao_id | não | sim |  | `CREATE INDEX idx_creditos_fornecedor_devolucao_id ON public.creditos_fornecedor USING btree (devolucao_id)` |
| idx_creditos_fornecedor_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_creditos_fornecedor_tenant_id ON public.creditos_fornecedor USING btree (tenant_id)` |
| idx_creditos_fornecedor_utilizado_em_pagamento_id | btree | utilizado_em_pagamento_id | não | sim |  | `CREATE INDEX idx_creditos_fornecedor_utilizado_em_pagamento_id ON public.creditos_fornecedor USING btree (utilizado_em_pagamento_id)` |
| idx_creditos_status | btree | status | não | sim |  | `CREATE INDEX idx_creditos_status ON public.creditos_fornecedor USING btree (status)` |


## Policies (RLS)

### `Authorized roles can manage credits`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `tenant_isolation_creditos_fornecedor`

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
| set_creditos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
