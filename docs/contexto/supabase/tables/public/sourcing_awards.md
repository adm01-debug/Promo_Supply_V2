# public.sourcing_awards

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
| 2 | `event_id` | `uuid` | não |  |  |  |
| 3 | `lot_id` | `uuid` | sim |  |  |  |
| 4 | `winner_response_id` | `uuid` | não |  |  |  |
| 5 | `fornecedor_id` | `uuid` | não |  |  |  |
| 6 | `valor_adjudicado` | `numeric(15,2)` | não |  |  |  |
| 7 | `saving_estimado` | `numeric(15,2)` | sim |  |  |  |
| 8 | `justificativa` | `text` | não |  |  |  |
| 9 | `approved_by` | `uuid` | sim |  |  |  |
| 10 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `pedido_id` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_awards_approved_by_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sourcing_awards_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_awards_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| sourcing_awards_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES sourcing_event_lots(id)` | NO ACTION | NO ACTION | sim |
| sourcing_awards_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id)` | NO ACTION | NO ACTION | sim |
| sourcing_awards_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_awards_saving_nonneg | CHECK | `CHECK (saving_estimado IS NULL OR saving_estimado >= 0::numeric)` |  |  | sim |
| sourcing_awards_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| sourcing_awards_valor_positive | CHECK | `CHECK (valor_adjudicado > 0::numeric)` |  |  | sim |
| sourcing_awards_winner_response_id_fkey | FOREIGN KEY | `FOREIGN KEY (winner_response_id) REFERENCES sourcing_responses(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_awards_approved_by | btree | approved_by | não | sim |  | `CREATE INDEX idx_sourcing_awards_approved_by ON public.sourcing_awards USING btree (approved_by)` |
| idx_sourcing_awards_event_id | btree | event_id | não | sim |  | `CREATE INDEX idx_sourcing_awards_event_id ON public.sourcing_awards USING btree (event_id)` |
| idx_sourcing_awards_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_sourcing_awards_fornecedor_id ON public.sourcing_awards USING btree (fornecedor_id)` |
| idx_sourcing_awards_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_sourcing_awards_lot_id ON public.sourcing_awards USING btree (lot_id)` |
| idx_sourcing_awards_pedido_id | btree | pedido_id | não | sim |  | `CREATE INDEX idx_sourcing_awards_pedido_id ON public.sourcing_awards USING btree (pedido_id)` |
| idx_sourcing_awards_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_awards_tenant_id ON public.sourcing_awards USING btree (tenant_id)` |
| idx_sourcing_awards_winner_response_id | btree | winner_response_id | não | sim |  | `CREATE INDEX idx_sourcing_awards_winner_response_id ON public.sourcing_awards USING btree (winner_response_id)` |
| sourcing_awards_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_awards_pkey ON public.sourcing_awards USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_sourcing_awards`

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
