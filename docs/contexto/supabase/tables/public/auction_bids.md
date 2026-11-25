# public.auction_bids

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
| 3 | `invitation_id` | `uuid` | não |  |  |  |
| 4 | `fornecedor_id` | `uuid` | não |  |  |  |
| 5 | `lot_id` | `uuid` | sim |  |  |  |
| 6 | `amount` | `numeric(15,2)` | não |  |  |  |
| 7 | `status` | `bid_status` | não | `'valid'::bid_status` |  |  |
| 8 | `rejection_reason` | `text` | sim |  |  |  |
| 9 | `bid_time` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `triggered_extension` | `boolean` | sim | `false` |  |  |
| 11 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| auction_bids_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| auction_bids_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| auction_bids_invitation_id_fkey | FOREIGN KEY | `FOREIGN KEY (invitation_id) REFERENCES sourcing_invitations(id)` | NO ACTION | NO ACTION | sim |
| auction_bids_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES sourcing_event_lots(id)` | NO ACTION | NO ACTION | sim |
| auction_bids_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| auction_bids_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| auction_bids_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX auction_bids_pkey ON public.auction_bids USING btree (id)` |
| idx_auction_bids_event_id | btree | event_id | não | sim |  | `CREATE INDEX idx_auction_bids_event_id ON public.auction_bids USING btree (event_id)` |
| idx_auction_bids_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_auction_bids_fornecedor_id ON public.auction_bids USING btree (fornecedor_id)` |
| idx_auction_bids_invitation_id | btree | invitation_id | não | sim |  | `CREATE INDEX idx_auction_bids_invitation_id ON public.auction_bids USING btree (invitation_id)` |
| idx_auction_bids_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_auction_bids_lot_id ON public.auction_bids USING btree (lot_id)` |
| idx_auction_bids_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_auction_bids_tenant_id ON public.auction_bids USING btree (tenant_id)` |


## Policies (RLS)

### `auction_bids_escrita_ordem`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))` |

### `auction_bids_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_auction_bids`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
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
