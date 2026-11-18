# public.sourcing_response_items

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
| 2 | `response_id` | `uuid` | não |  |  |  |
| 3 | `lot_id` | `uuid` | não |  |  |  |
| 4 | `preco_unitario` | `numeric(15,2)` | não |  |  |  |
| 5 | `preco_total` | `numeric(15,2)` | não |  |  |  |
| 6 | `prazo_dias` | `integer` | sim |  |  |  |
| 7 | `validade_dias` | `integer` | sim |  |  |  |
| 8 | `marca` | `text` | sim |  |  |  |
| 9 | `modelo` | `text` | sim |  |  |  |
| 10 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 11 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_response_items_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES sourcing_event_lots(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_response_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_response_items_prazo_nonneg | CHECK | `CHECK (prazo_dias IS NULL OR prazo_dias >= 0)` |  |  | sim |
| sourcing_response_items_preco_total_nonneg | CHECK | `CHECK (preco_total >= 0::numeric)` |  |  | sim |
| sourcing_response_items_preco_unitario_nonneg | CHECK | `CHECK (preco_unitario >= 0::numeric)` |  |  | sim |
| sourcing_response_items_response_id_fkey | FOREIGN KEY | `FOREIGN KEY (response_id) REFERENCES sourcing_responses(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_response_items_response_id_lot_id_key | UNIQUE | `UNIQUE (response_id, lot_id)` |  |  | sim |
| sourcing_response_items_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| sourcing_response_items_validade_nonneg | CHECK | `CHECK (validade_dias IS NULL OR validade_dias >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_response_items_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_sourcing_response_items_lot_id ON public.sourcing_response_items USING btree (lot_id)` |
| idx_sourcing_response_items_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_response_items_tenant_id ON public.sourcing_response_items USING btree (tenant_id)` |
| sourcing_response_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_response_items_pkey ON public.sourcing_response_items USING btree (id)` |
| sourcing_response_items_response_id_lot_id_key | btree | response_id, lot_id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_response_items_response_id_lot_id_key ON public.sourcing_response_items USING btree (response_id, lot_id)` |


## Policies (RLS)

### `tenant_isolation_sourcing_response_items`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
