# public.licitacao_propostas

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
| 2 | `licitacao_id` | `uuid` | não |  |  |  |
| 3 | `fornecedor_id` | `uuid` | não |  |  |  |
| 4 | `valor_proposta` | `numeric` | não | `0` |  |  |
| 5 | `desconto_percentual` | `numeric` | sim | `0` |  |  |
| 6 | `prazo_entrega` | `integer` | sim | `0` |  |  |
| 7 | `score_tecnico` | `numeric` | sim | `0` |  |  |
| 8 | `score_preco` | `numeric` | sim | `0` |  |  |
| 9 | `score_total` | `numeric` | sim | `0` |  |  |
| 10 | `documentos` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `status` | `text` | não | `'submetida'::text` |  |  |
| 13 | `data_submissao` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `vencedora` | `boolean` | sim | `false` |  |  |
| 15 | `desclassificada` | `boolean` | sim | `false` |  |  |
| 16 | `motivo_desclassificacao` | `text` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `tenant_id` | `uuid` | não |  |  | rollback:default_tenant_zero:20261128195000 |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| licitacao_propostas_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| licitacao_propostas_licitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (licitacao_id) REFERENCES licitacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| licitacao_propostas_licitacao_id_fornecedor_id_key | UNIQUE | `UNIQUE (licitacao_id, fornecedor_id)` |  |  | sim |
| licitacao_propostas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| licitacao_propostas_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_licitacao_propostas_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_licitacao_propostas_fornecedor_id ON public.licitacao_propostas USING btree (fornecedor_id)` |
| idx_licitacao_propostas_licitacao | btree | licitacao_id | não | sim |  | `CREATE INDEX idx_licitacao_propostas_licitacao ON public.licitacao_propostas USING btree (licitacao_id)` |
| idx_licitacao_propostas_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_licitacao_propostas_tenant_id ON public.licitacao_propostas USING btree (tenant_id)` |
| licitacao_propostas_licitacao_id_fornecedor_id_key | btree | licitacao_id, fornecedor_id | sim | sim |  | `CREATE UNIQUE INDEX licitacao_propostas_licitacao_id_fornecedor_id_key ON public.licitacao_propostas USING btree (licitacao_id, fornecedor_id)` |
| licitacao_propostas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX licitacao_propostas_pkey ON public.licitacao_propostas USING btree (id)` |


## Policies (RLS)

### `Admins coordinators buyers can manage propostas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `tenant_isolation_licitacao_propostas`

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
| update_licitacao_propostas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
