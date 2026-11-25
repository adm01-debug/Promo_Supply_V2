# public.sourcing_event_lots

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
| 3 | `ordem` | `integer` | não | `1` |  |  |
| 4 | `codigo` | `text` | sim |  |  |  |
| 5 | `nome` | `text` | não |  |  |  |
| 6 | `descricao` | `text` | sim |  |  |  |
| 7 | `quantidade` | `numeric(15,4)` | não | `1` |  |  |
| 8 | `unidade` | `text` | não | `'UN'::text` |  |  |
| 9 | `preco_referencia` | `numeric(15,2)` | sim |  |  |  |
| 10 | `especificacoes` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_event_lots_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_event_lots_ordem_nonneg | CHECK | `CHECK (ordem >= 0)` |  |  | sim |
| sourcing_event_lots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_event_lots_preco_ref_nonneg | CHECK | `CHECK (preco_referencia IS NULL OR preco_referencia >= 0::numeric)` |  |  | sim |
| sourcing_event_lots_quantidade_positive | CHECK | `CHECK (quantidade > 0::numeric)` |  |  | sim |
| sourcing_event_lots_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.auction_bids | auction_bids_lot_id_fkey | lot_id | NO ACTION |
| public.sourcing_awards | sourcing_awards_lot_id_fkey | lot_id | NO ACTION |
| public.sourcing_response_items | sourcing_response_items_lot_id_fkey | lot_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_event_lots_event_id | btree | event_id | não | sim |  | `CREATE INDEX idx_sourcing_event_lots_event_id ON public.sourcing_event_lots USING btree (event_id)` |
| idx_sourcing_event_lots_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_event_lots_tenant_id ON public.sourcing_event_lots USING btree (tenant_id)` |
| sourcing_event_lots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_event_lots_pkey ON public.sourcing_event_lots USING btree (id)` |


## Policies (RLS)

### `sourcing_event_lots_escrita_ordem`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `sourcing_event_lots_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_sourcing_event_lots`

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
