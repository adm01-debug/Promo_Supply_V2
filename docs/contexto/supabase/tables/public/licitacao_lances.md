# public.licitacao_lances

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `licitacao_id` | `uuid` | sim |  |  |  |
| 3 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 4 | `valor_lance` | `numeric(15,2)` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| licitacao_lances_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| licitacao_lances_licitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| licitacao_lances_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| licitacao_lances_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_licitacao_lances_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_licitacao_lances_fornecedor_id ON public.licitacao_lances USING btree (fornecedor_id)` |
| idx_licitacao_lances_licitacao_id | btree | licitacao_id | não | sim |  | `CREATE INDEX idx_licitacao_lances_licitacao_id ON public.licitacao_lances USING btree (licitacao_id)` |
| idx_licitacao_lances_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_licitacao_lances_tenant_id ON public.licitacao_lances USING btree (tenant_id)` |
| licitacao_lances_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX licitacao_lances_pkey ON public.licitacao_lances USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_licitacao_lances`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| tr_update_best_bid | AFTER | INSERT | ROW | enabled | public.update_licitacao_best_bid |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
